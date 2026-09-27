import { dirname, fromFileUrl, join } from "stdlib/path";
import { referenceStyleVocabulary, vocabularyProjections } from "./vocabulary.ts";
const root = dirname(dirname(fromFileUrl(import.meta.url)));
if (Deno.args.includes("--help")) {
  console.log("Создание проекций словаря стилей QRC: quarto run tools/generate-vocabulary.ts [--check]\n--check проверяет актуальность файлов без их изменения.");
  Deno.exit(0);
}
if (Deno.args.some(argument => argument !== "--check")) throw new Error("Неизвестный аргумент; используйте --help");
const styles = referenceStyleVocabulary(JSON.parse(await Deno.readTextFile(join(root, "_extensions/reference-catalog/vocabulary/reference-styles.json"))));
for (const [path, content] of vocabularyProjections(styles)) {
  const target = join(root, path);
  if (Deno.args.includes("--check")) {
    if (await Deno.readTextFile(target) !== content) throw new Error(`Проекция словаря устарела: ${path}. Запустите quarto run tools/generate-vocabulary.ts`);
  } else {
    await Deno.mkdir(dirname(target), {recursive: true});
    await Deno.writeTextFile(target, content);
  }
}
console.log(Deno.args.includes("--check") ? "Проекции словаря QRC актуальны" : "Проекции словаря QRC созданы");
