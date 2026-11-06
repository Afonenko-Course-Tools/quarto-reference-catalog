import { dirname, fromFileUrl, join } from "stdlib/path";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";

async function main(): Promise<void> {
const root = dirname(dirname(fromFileUrl(import.meta.url)));
const mode = Deno.args[0] ?? "--typescript";
if (!["--typescript", "--browser", "--lua", "--shell"].includes(mode) || Deno.args.length > 1) {
  throw new Error("Использование: quarto run tools/check-types.ts [--typescript|--browser|--lua|--shell]");
}
const inventory: unknown = JSON.parse(await Deno.readTextFile(join(root, "typecheck/inventory.json")));
if (!isRecord(inventory) || !Array.isArray(inventory.files)) throw new Error("Некорректный состав проверки типов");
const files: { path: string; gate: string }[] = inventory.files.map((entry: unknown) => {
  if (!isRecord(entry) || typeof entry.path !== "string" || typeof entry.gate !== "string") {
    throw new Error("Некорректная запись состава проверки типов");
  }
  return { path: entry.path, gate: entry.gate };
});
const listing = await new Deno.Command("git", { args: ["ls-files"], cwd: root, stdout: "piped", stderr: "piped" }).output();
if (!listing.success) throw new Error(new TextDecoder().decode(listing.stderr));
const code = new TextDecoder().decode(listing.stdout).trim().split("\n")
  .filter(path => /\.(?:ts|js|cjs|lua|sh)$/.test(path) && !path.includes("/vendor/"));
function gateFor(path: string): string {
  if (path.startsWith("_extensions/reference-catalog/observability/")) return "bridge-owner";
  if (path.endsWith(".lua")) return "lua";
  if (path.endsWith(".cjs")) return "node";
  if (path.endsWith(".sh")) return "shell";
  if (path.endsWith(".js") || path === "typecheck/browser.d.ts") return "browser";
  return "deno";
}
for (const entry of files) {
  if (entry.gate !== gateFor(entry.path)) throw new Error(`Некорректный gate: ${entry.path}`);
}
const declared = files.map(entry => entry.path);
if (new Set(declared).size !== declared.length || [...code].sort().join("\n") !== [...declared].sort().join("\n")) {
  throw new Error("Состав поддерживаемого кода изменился: обновите typecheck/inventory.json");
}
if (mode === "--shell") {
  const targets = files.filter(entry => entry.gate === "shell").map(entry => join(root, entry.path));
  if (!targets.length) throw new Error("Пустая проверка ShellCheck");
  const result = await new Deno.Command("shellcheck", { args: ["--severity=style", ...targets], cwd: root, stdout: "inherit", stderr: "inherit" }).output();
  if (!result.success) Deno.exitCode = result.code;
  else console.log(`Проверено shell: ${targets.length}`);
  return;
}
if (mode === "--lua") {
  const share = Deno.env.get("QRC_QUARTO_SHARE") ?? join(dirname(Deno.execPath()), "../../../share");
  const temporary = await Deno.makeTempDir({ prefix: "qrc-luals-" });
  try {
    const config = {
      "runtime.version": "Lua 5.4",
      "runtime.path": ["?.lua", "?/init.lua", "_extensions/reference-catalog/lua/?.lua"],
      "runtime.plugin": join(share, "lua-plugin/plugin.lua"),
      "workspace.library": [join(share, "lua-types"), join(root, "_extensions/reference-catalog/observability")],
      "workspace.ignoreDir": [".git", "node_modules", "_extensions/reference-catalog/observability"],
      "diagnostics.libraryFiles": "Disable",
      "diagnostics.ignoredFiles": "Disable",
      "diagnostics.neededFileStatus": { "no-unknown": "Any!" },
      "diagnostics.severity": { "no-unknown": "Error" },
      "diagnostics.groupFileStatus": { "type-check": "Any", strong: "Any" },
      "diagnostics.groupSeverity": { "type-check": "Error", strong: "Error" },
      "type.weakNilCheck": false,
      "type.weakUnionCheck": false,
      "type.checkTableShape": true,
    };
    const path = join(temporary, "luarc.json");
    await Deno.writeTextFile(path, JSON.stringify(config));
    const result = await new Deno.Command("lua-language-server", {
      args: [`--check=${root}`, "--checklevel=Warning", "--check_format=json", `--check_out_path=${join(temporary, "check.json")}`, `--configpath=${path}`, `--logpath=${temporary}`, "--num_threads=1"],
      cwd: root, stdout: "inherit", stderr: "inherit",
    }).output();
    console.log(await Deno.readTextFile(join(temporary, "check.json")));
    if (!result.success) Deno.exitCode = result.code;
    else console.log(`Проверено Lua: ${files.filter(entry => entry.gate === "lua").length}`);
  } finally { await Deno.remove(temporary, { recursive: true }); }
  return;
}
const selected = mode === "--typescript" ? "deno" : "browser";
const targets = files.filter(entry => entry.gate === selected).map(entry => join(root, entry.path));
if (!targets.length) throw new Error("Пустая проверка типов");
const map = await Deno.makeTempFile({ prefix: "qrc-typecheck-", suffix: ".json" });
try {
  const imports: Record<string, string> = {};
  for (const key of ["stdlib/path", "stdlib/fs"]) {
    imports[key] = import.meta.resolve(key).replace(
      /^https:\/\/jsr\.io\/@std\/(path|fs)\/([^/]+)\/mod\.ts$/,
      "jsr:@std/$1@$2",
    );
  }
  await Deno.writeTextFile(map, JSON.stringify({ imports }));
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["check", "--no-lock", "--config", join(root, `typecheck/${selected}.json`), "--import-map", map, ...targets],
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
