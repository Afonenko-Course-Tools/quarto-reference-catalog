import { dirname, fromFileUrl, join } from "stdlib/path";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const mode = Deno.args[0] ?? "--typescript";
if (!["--typescript", "--browser"].includes(mode) || Deno.args.length > 1) {
  throw new Error("Использование: quarto run tools/check-types.ts [--typescript|--browser]");
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
  .filter(path => /\.(?:ts|js|cjs|lua)$/.test(path) && !path.includes("/vendor/"));
const declared = files.map(entry => entry.path);
if (new Set(declared).size !== declared.length || [...code].sort().join("\n") !== [...declared].sort().join("\n")) {
  throw new Error("Состав поддерживаемого кода изменился: обновите typecheck/inventory.json");
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
  if (!result.success) Deno.exit(result.code);
  console.log(`Проверено типов: ${targets.length}; состав: ${files.length}`);
} finally {
  await Deno.remove(map);
}
