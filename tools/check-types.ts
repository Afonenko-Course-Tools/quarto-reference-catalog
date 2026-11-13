import { dirname, fromFileUrl, join, resolve } from "stdlib/path";

async function main(): Promise<void> {
  const root = dirname(dirname(fromFileUrl(import.meta.url)));
  const mode = Deno.args[0] ?? "--typescript";
  if (!["--typescript", "--browser", "--lua", "--shell"].includes(mode) || Deno.args.length > 1) {
    throw new Error(
      "Использование: quarto run tools/check-types.ts [--typescript|--browser|--lua|--shell]",
    );
  }
  const listing = await new Deno.Command("git", {
    args: ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!listing.success) throw new Error(new TextDecoder().decode(listing.stderr));
  const code = new TextDecoder()
    .decode(listing.stdout)
    .split("\0")
    .filter(
      (path) =>
        /\.(?:ts|js|cjs|mjs|lua|sh)$/.test(path) &&
        !/(^|\/)(vendor|node_modules|dependencies)(\/|$)/.test(path),
    );
  function gateFor(path: string): string {
    if (
      [
        "_extensions/reference-catalog/observability/bridge.ts",
        "_extensions/reference-catalog/observability/bridge.lua",
      ].includes(path)
    )
      return "bridge-owner";
    if (path.endsWith(".lua")) return "lua";
    if (path.endsWith(".mjs")) return "node";
    if (path.endsWith(".cjs")) return "node";
    if (path.endsWith(".sh")) return "shell";
    if (path.endsWith(".js") || path === "typecheck/browser.d.ts") return "browser";
    return "deno";
  }
  const files = [...new Set(code)].sort().map((path) => ({ path, gate: gateFor(path) }));
  if (mode === "--shell") {
    const targets = files
      .filter((entry) => entry.gate === "shell")
      .map((entry) => join(root, entry.path));
    if (!targets.length) throw new Error("Пустая проверка ShellCheck");
    const result = await new Deno.Command("shellcheck", {
      args: ["--severity=style", ...targets],
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    if (!result.success) Deno.exitCode = result.code;
    else console.log(`Проверено shell: ${targets.length}`);
    return;
  }
  if (mode === "--lua") {
    const performanceRoot = resolve(
      Deno.env.get("COURSE_PERFORMANCE_SOURCE") ??
        Deno.env.get("PERFORMANCE") ??
        join(root, "..", "quarto-course-performance"),
    );
    const args = [
      "run",
      "--no-config",
      "--no-lock",
      "-A",
      join(performanceRoot, "tools/check-lua.ts"),
      "--root",
      root,
    ];
    for (const entry of files.filter((entry) => entry.gate === "lua"))
      args.push("--scope", entry.path);
    args.push(
      "--exclude",
      "_extensions/reference-catalog/observability/bridge.lua",
      "--library",
      join(root, "_extensions/reference-catalog/observability"),
      "--runtime-path",
      "_extensions/reference-catalog/lua/?.lua",
    );
    const server = Deno.env.get("LUA_LANGUAGE_SERVER");
    if (server) args.push("--server", server);
    const result = await new Deno.Command(Deno.execPath(), {
      args,
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    }).spawn().status;
    Deno.exitCode = result.code;
    return;
  }
  const selected = mode === "--typescript" ? "deno" : "browser";
  const targets = files
    .filter((entry) => entry.gate === selected)
    .map((entry) => join(root, entry.path));
  if (!targets.length) throw new Error("Пустая проверка типов");
  const map = await Deno.makeTempFile({ prefix: "qrc-typecheck-", suffix: ".json" });
  try {
    const imports: Record<string, string> = {};
    for (const key of ["stdlib/path", "stdlib/fs"]) {
      imports[key] = import.meta
        .resolve(key)
        .replace(/^https:\/\/jsr\.io\/@std\/(path|fs)\/([^/]+)\/mod\.ts$/, "jsr:@std/$1@$2");
    }
    await Deno.writeTextFile(map, JSON.stringify({ imports }));
    const result = await new Deno.Command(Deno.execPath(), {
      args: [
        "check",
        "--no-lock",
        "--config",
        join(root, `typecheck/${selected}.json`),
        "--import-map",
        map,
        ...targets,
      ],
      cwd: root,
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    if (!result.success) Deno.exitCode = result.code;
    else console.log(`Проверено типов: ${targets.length}; состав: ${files.length}`);
  } finally {
    await Deno.remove(map);
  }
}
await main();
