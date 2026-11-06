import { dirname, fromFileUrl, join } from "stdlib/path";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const extension = join(root, "_extensions/reference-catalog");
const vendor = join(extension, "vendor/parse5");
const destination = join(extension, "types/parse5");
const check = Deno.args.length === 1 && Deno.args[0] === "--check";
if (Deno.args.length && !check) throw new Error("Допустим только параметр --check");
const descriptor: unknown = JSON.parse(await Deno.readTextFile(join(vendor, "package.json")));
if (!isRecord(descriptor) || descriptor.name !== "parse5" || descriptor.version !== "7.3.0") {
  throw new Error("Проекция типов требует vendored parse5 7.3.0");
}
async function declarations(folder: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for await (const entry of Deno.readDir(folder)) {
    if (entry.isSymlink) throw new Error("Символическая ссылка в источнике типов parse5");
    const relative = prefix + entry.name;
    if (entry.isDirectory) paths.push(...await declarations(join(folder, entry.name), relative + "/"));
    else if (entry.isFile && entry.name.endsWith(".d.ts")) paths.push(relative);
  }
  return paths.sort();
}
const paths = await declarations(join(vendor, "dist"));
if (!paths.includes("index.d.ts") || !paths.includes("tree-adapters/default.d.ts")) throw new Error("Неполная поставка деклараций parse5");
const header = "// Создано tools/generate-parse5-types.ts из vendor/parse5 7.3.0. Только относительные .js заменены на .d.ts; см. LICENSE.\n";
const projected = new Map<string, string>();
for (const path of paths) {
  const source = await Deno.readTextFile(join(vendor, "dist", path));
  const types = source.replace(/((?:from\s+|import\s*\(\s*)["'])(\.{1,2}\/[^"']+)\.js(["'])/g, "$1$2.d.ts$3");
  projected.set(path, header + types);
}
projected.set("LICENSE", await Deno.readTextFile(join(vendor, "LICENSE")));
for (const [path, text] of projected) {
  const output = join(destination, path);
  if (check) {
    if (await Deno.readTextFile(output) !== text) throw new Error(`Устарела проекция типов parse5: ${path}`);
  } else {
    await Deno.mkdir(dirname(output), { recursive: true });
    await Deno.writeTextFile(output, text);
  }
}
const actual = await declarations(destination);
if (actual.join("\n") !== paths.join("\n")) throw new Error("Лишние или отсутствующие декларации в проекции parse5");
console.log(`Проекция parse5 7.3.0: ${paths.length} деклараций; ${check ? "проверено" : "создано"}`);
