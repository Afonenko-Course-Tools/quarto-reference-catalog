import { dirname, fromFileUrl, join } from "stdlib/path";
import { referenceStyles } from "../_extensions/reference-catalog/domain/contract.ts";
const root = dirname(dirname(fromFileUrl(import.meta.url)));
const extension = join(root, "_extensions/reference-catalog");
for (const file of ["infrastructure/render.ts", "infrastructure/runtime.ts", "infrastructure/profiles.ts", "entrypoints/pre.ts", "entrypoints/preview.ts", "application/workflow.ts"]) {
  try { await Deno.stat(join(extension, file)); throw new Error(`QRC вновь содержит ответственность координатора: ${file}`); }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
}
const manifest = await Deno.readTextFile(join(extension, "_extension.yml"));
if (/\b(pre-render|post-render|resources|preview):/.test(manifest)) throw new Error("Установка QRC не должна включать обработчики проекта");
const lua = await Deno.readTextFile(join(extension, "lua/constants.lua"));
const luaStyleKeys = [...(lua.match(/reference_styles\s*=\s*\{([^}]+)\}/)?.[1] ?? "").matchAll(/([a-z]+)=true/g)].map(match => match[1]).sort();
if (luaStyleKeys.join() !== [...referenceStyles].sort().join()) throw new Error("Словари стилей Lua и TypeScript расходятся");
console.log("Успех: QRC отделён от сборки, профилей, размещения и предпросмотра");
