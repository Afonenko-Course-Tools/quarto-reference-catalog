import { dirname, fromFileUrl, join } from "stdlib/path";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";

const root = dirname(dirname(fromFileUrl(import.meta.url)));
const extension = join(root, "_extensions/reference-catalog");
const vendor = join(extension, "vendor");
const destination = join(extension, "types");
const check = Deno.args.length === 1 && Deno.args[0] === "--check";
if (Deno.args.length && !check) throw new Error("Допустим только параметр --check");
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
const projected = new Map<string, string>();
for (const [name, version] of [["parse5", "7.3.0"], ["entities", "6.0.1"]] satisfies [string, string][]) {
  const packageRoot = join(vendor, name);
  const descriptor: unknown = JSON.parse(await Deno.readTextFile(join(packageRoot, "package.json")));
  if (!isRecord(descriptor) || descriptor.name !== name || descriptor.version !== version) {
    throw new Error(`Проекция типов требует vendored ${name} ${version}`);
  }
  const paths = await declarations(join(packageRoot, "dist"));
  if (!paths.length) throw new Error(`Неполная поставка деклараций ${name}`);
  const header = `// Создано tools/generate-parse5-types.ts из vendor/${name} ${version}. Только относительные .js заменены на .d.ts; см. LICENSE.\n`;
  for (const path of paths) {
    const source = await Deno.readTextFile(join(packageRoot, "dist", path));
    const types = source.replace(/((?:from\s+|import\s*\(\s*)["'])(\.{1,2}\/[^"']+)\.js(["'])/g, "$1$2.d.ts$3");
    projected.set(`${name}/dist/${path}`, header + types);
  }
  projected.set(`${name}/LICENSE`, await Deno.readTextFile(join(packageRoot, "LICENSE")));
}
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
const expected = [...projected.keys()].filter(path => path.endsWith(".d.ts")).sort();
for (const path of actual) {
  if (!projected.has(path)) {
    const stale = join(destination, path);
    if (check || !(await Deno.readTextFile(stale)).startsWith("// Создано tools/generate-parse5-types.ts")) {
      throw new Error(`Лишняя декларация в проекции: ${path}`);
    }
    await Deno.remove(stale);
  }
}
const retained = actual.filter(path => projected.has(path));
if (check && retained.join("\n") !== expected.join("\n")) throw new Error("Неполная проекция типов");
console.log(`Проекция parse5 7.3.0 и entities 6.0.1: ${expected.length} деклараций; ${check ? "проверено" : "создано"}`);
