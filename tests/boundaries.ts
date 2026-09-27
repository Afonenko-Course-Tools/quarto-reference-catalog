import { dirname, fromFileUrl, join } from "stdlib/path";
import { referenceStyles } from "../_extensions/reference-catalog/domain/contract.ts";
import { referenceStyleVocabulary, vocabularyProjections } from "../tools/vocabulary.ts";
const root = dirname(dirname(fromFileUrl(import.meta.url)));
const extension = join(root, "_extensions/reference-catalog");
for (const file of ["infrastructure/render.ts", "infrastructure/runtime.ts", "infrastructure/profiles.ts", "entrypoints/pre.ts", "entrypoints/preview.ts", "application/workflow.ts"]) {
  try { await Deno.stat(join(extension, file)); throw new Error(`QRC вновь содержит ответственность координатора: ${file}`); }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
}
const manifest = await Deno.readTextFile(join(extension, "_extension.yml"));
if (/\b(pre-render|post-render|resources|preview):/.test(manifest)) throw new Error("Установка QRC не должна включать обработчики проекта");
const styles = referenceStyleVocabulary(JSON.parse(await Deno.readTextFile(join(extension, "vocabulary/reference-styles.json"))));
for (const [path, expected] of vocabularyProjections(styles)) {
  if (await Deno.readTextFile(join(root, path)) !== expected) throw new Error(`Проекция словаря устарела: ${path}`);
}
if (JSON.stringify(referenceStyles) !== JSON.stringify(styles)) throw new Error("TypeScript использует другой словарь стилей");
console.log("Успех: QRC отделён от сборки, профилей, размещения и предпросмотра");
