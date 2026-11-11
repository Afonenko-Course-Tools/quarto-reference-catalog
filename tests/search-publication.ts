import { join } from "stdlib/path";
import type { ParserOptions, TreeAdapterTypeMap } from "../_extensions/reference-catalog/types/parse5/dist/index.d.ts";
// @deno-types="../_extensions/reference-catalog/types/parse5/dist/index.d.ts"
import { Parser } from "../_extensions/reference-catalog/vendor/parse5/dist/index.js";
import { publishReferenceCatalog as publish } from "../_extensions/reference-catalog/public.ts";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import { readSearch } from "./support.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-search-publication-" });
const stage = join(root, "stage");
const parse = Parser.parse;
let parses = 0;
Parser.parse = function <T extends TreeAdapterTypeMap>(html: string, options?: ParserOptions<T>): T["document"] {
  parses++;
  const bound = parse.bind(this);
  return bound<T>(html, options);
};
try {
  await Deno.mkdir(join(stage, "book"), { recursive: true });
  const html = `<html><body><main><h1 id="sec-target">Heading</h1><a data-qrc-ref="book:sec-target" data-qrc-style="default">pre-link placeholder</a><a data-qrc-ref="book:sec-target" data-qrc-style="title" data-qrc-custom="true"><em>Custom &amp; exact</em></a></main><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="default"><a class="qrc-anchor" href="#sec-target">Native caption</a></div><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="number"><a class="qrc-anchor" href="#sec-target">1</a></div></div></body></html>`;
  await Deno.writeTextFile(join(stage, "book/chapter.html"), html);
  await Deno.writeTextFile(join(stage, "index.html"), '<html><body><main>Landing</main></body></html>');
  await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([{ href: "chapter.html", text: "old chapter", title: "Chapter", metadata: { tags: ["kept"], rank: 2 } }, { href: "chapter.html#sec-target", text: "old section" }]));
  await Deno.writeTextFile(join(stage, "search.json"), JSON.stringify([{ href: "index.html", text: "landing" }, { href: "stale.html", text: "private retained content" }]));
  const context = { root, stage, quarto: "fixture", config: {}, members: [{ namespace: "book", format: "html" }], outputs: ["stage/index.html", "stage/book/chapter.html"], searchIndexes: [{ path: "stage/search.json", mount: "" }, { path: "stage/book/search.json", mount: "book" }] };
  const mountedSearch = await Deno.readTextFile(join(stage, "book/search.json"));
  await Deno.writeTextFile(join(stage, "reference-catalog.json"), '{"prior":"complete catalog"}\n');
  await Deno.writeTextFile(join(stage, "reference-catalog-local.json"), '{"prior":"local catalog"}\n');
  const unchangedPaths = ["book/chapter.html", "index.html", "search.json", "book/search.json", "reference-catalog.json", "reference-catalog-local.json"];
  for (const scope of ["full", "local"] as const) {
    for (const invalid of ["{malformed", "{}", '[{"href":"chapter.html","text":3}]', '[{"href":"chapter%ZZ.html","text":"invalid URL"}]', ...(scope === "full" ? ['[{"href":"https://external.invalid/page.html","text":"external URL"}]'] : [])]) {
      await Deno.writeTextFile(join(stage, "book/search.json"), invalid);
      const before = await Promise.all(unchangedPaths.map(path => Deno.readFile(join(stage, path))));
      let failure: unknown;
      try { await publish({ ...context, scope }); } catch (error) { failure = error; }
      assert(failure instanceof Error, `Публикация приняла плохой второй индекс: ${scope} ${invalid}`);
      const after = await Promise.all(unchangedPaths.map(path => Deno.readFile(join(stage, path))));
      assert(before.every((bytes, index) => {
        const actual = after[index];
        return actual !== undefined && bytes.length === actual.length && bytes.every((value, offset) => value === actual[offset]);
      }), `Ошибка второго индекса изменила HTML/search/catalog: ${scope} ${invalid}`);
    }
  }
  // Исправленный вход повторяется в том же stage без восстановления HTML.
  await Deno.writeTextFile(join(stage, "book/search.json"), mountedSearch);
  parses = 0;
  await publish(context);
  assert(parses === 2, `Combined linking/search reparsed current HTML: ${parses}`);
  const parsedRows: unknown = JSON.parse(await Deno.readTextFile(join(stage, "search.json")));
  assert(Array.isArray(parsedRows), "Итоговый search должен быть массивом");
  const rows: readonly unknown[] = parsedRows;
  assert(rows.every(isRecord), "Итоговые поисковые записи должны быть объектами");
  assert(rows.find(row => row.href === "book/chapter.html")?.text === "Heading Native caption Custom & exact", "Mounted search lost its final link captions or URL prefix");
  const chapter = rows.find(row => row.href === "book/chapter.html");
  assert(chapter?.title === "Chapter" && JSON.stringify(chapter.metadata) === '{"tags":["kept"],"rank":2}', "Дополнительные metadata поисковой записи не сохранились при обновлении и merge");
  assert(rows.find(row => row.href === "book/chapter.html#sec-target")?.text === "Heading", "Mounted fragment search lost its target");
  assert(rows.find(row => row.href === "index.html")?.text === "Landing", "Mounted search merge removed the landing entry");
  assert(!rows.some(row => row.href === "stale.html"), "Full search retained a noncurrent page entry");
  const mountedRows = await readSearch(join(stage, "book/search.json"));
  assert(mountedRows.some(row => row.href === "chapter.html#sec-target" && row.text === "Heading"), "Mounted index lost its relative fragment link");
  await Deno.writeTextFile(join(stage, "book/chapter.html"), html);
  await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([...mountedRows, { href: "retained.html", text: "private retained mounted content" }]));
  await Deno.writeTextFile(join(stage, "book/retained.html"), "retained private HTML");
  await publish(context);
  assert(!(await readSearch(join(stage, "book/search.json"))).some(row => row.href === "retained.html"), "Full mounted search retained a noncurrent page entry");
  assert(!(await Deno.readTextFile(join(stage, "search.json"))).includes("private retained"), "Merged root search retained mounted private text");
  await Deno.mkdir(join(stage, "second"));
  await Deno.writeTextFile(join(stage, "book/chapter.html"), '<html><body><main>First mount text</main></body></html>');
  await Deno.writeTextFile(join(stage, "second/chapter.html"), '<html><body><main>Last mount text</main></body></html>');
  await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([{ href: "chapter.html", text: "old", metadata: { duplicate: true } }]));
  await publish({ root, stage, quarto: "fixture", config: {}, members: [], outputs: ["stage/book/chapter.html", "stage/second/chapter.html"], searchIndexes: [{ path: "stage/book/search.json", mount: "book" }, { path: "stage/book/search.json", mount: "second" }] });
  const duplicateRows: unknown = JSON.parse(await Deno.readTextFile(join(stage, "search.json")));
  assert(JSON.stringify(duplicateRows) === JSON.stringify([
    { href: "book/chapter.html", text: "Last mount text", metadata: { duplicate: true } },
    { href: "second/chapter.html", text: "Last mount text", metadata: { duplicate: true } },
  ]), "Повторный path должен использовать последние записанные строки для обоих mounts, сохраняя порядок и metadata");
  await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([{ href: "chapter.html", text: "old" }]));
  await publish({ root, stage, quarto: "fixture", config: {}, members: [], outputs: ["stage/book/chapter.html"], searchIndexes: [{ path: "stage/book/search.json", mount: "book" }, { path: "stage/book/search.json", mount: "second" }] });
  assert((await readSearch(join(stage, "book/search.json"))).length === 0 && (await readSearch(join(stage, "search.json"))).length === 0, "Общий physical index оставил строку для нетекущего второго mount");

  // Настоящая ошибка writer отличается от ошибки подготовки: записи уже
  // применялись, исходный отказ файловой системы выходит без подмены.
  const writerStage = join(root, "writer");
  await Deno.mkdir(join(writerStage, "reference-catalog.json"), { recursive: true });
  const writerHtml = '<html><body><main>Writer current text</main></body></html>';
  await Deno.writeTextFile(join(writerStage, "index.html"), writerHtml);
  await Deno.writeTextFile(join(writerStage, "search.json"), '[{"href":"index.html","text":"old"}]');
  const writerContext = { root, stage: writerStage, quarto: "fixture", config: {}, members: [], outputs: ["writer/index.html", "writer/search.json"] };
  let writerFailure: unknown;
  try { await publish(writerContext); } catch (error) { writerFailure = error; }
  assert(writerFailure instanceof Deno.errors.IsADirectory, `Writer потерял первичный отказ: ${writerFailure}`);
  assert((await Deno.readTextFile(join(writerStage, "index.html"))).includes("data-qrc-navigation"), "Проверка writer не дошла до применения HTML");
  assert((await readSearch(join(writerStage, "search.json")))[0]?.text === "Writer current text", "Проверка writer не дошла до применения search");
  assert((await Deno.stat(join(writerStage, "reference-catalog.json"))).isDirectory, "Writer изменил отказавшую цель каталога");
  await Deno.remove(join(writerStage, "reference-catalog.json"));
  await publish(writerContext);
  assert((await Deno.stat(join(writerStage, "reference-catalog.json"))).isFile, "Ошибка writer оставила состояние, блокирующее следующую публикацию");
  console.log("PASS combined publication: prepared input failures/retry, current-only full indexes, one parse, metadata/fragments, shared mounts and real writer failure");
} finally {
  Parser.parse = parse;
  await Deno.remove(root, { recursive: true });
}
