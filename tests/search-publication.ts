import { join } from "stdlib/path";
import { Parser } from "../_extensions/reference-catalog/vendor/parse5/dist/index.js";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-search-publication-" });
const stage = join(root, "stage");
const parse = Parser.parse;
let parses = 0;
Parser.parse = function (...args: Parameters<typeof parse>) {
  parses++;
  return parse.apply(this, args);
};
try {
  await Deno.mkdir(join(stage, "book"), { recursive: true });
  const html = `<html><body><main><h1 id="sec-target">Heading</h1><a data-qrc-ref="book:sec-target" data-qrc-style="default">pre-link placeholder</a><a data-qrc-ref="book:sec-target" data-qrc-style="title" data-qrc-custom="true"><em>Custom &amp; exact</em></a></main><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="default"><a class="qrc-anchor" href="#sec-target">Native caption</a></div><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="number"><a class="qrc-anchor" href="#sec-target">1</a></div></div></body></html>`;
  await Deno.writeTextFile(join(stage, "book/chapter.html"), html);
  await Deno.writeTextFile(join(stage, "index.html"), '<html><body><main>Landing</main></body></html>');
  await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([{ href: "chapter.html", text: "old chapter" }, { href: "chapter.html#sec-target", text: "old section" }]));
  await Deno.writeTextFile(join(stage, "search.json"), JSON.stringify([{ href: "index.html", text: "landing" }, { href: "stale.html", text: "private retained content" }]));
  await publish({ root, stage, quarto: "fixture", config: {}, members: [{ namespace: "book", format: "html" }], outputs: ["stage/index.html", "stage/book/chapter.html"], searchIndexes: [{ path: "stage/search.json" }, { path: "stage/book/search.json" }] });
  assert(parses === 2, `Combined linking/search reparsed current HTML: ${parses}`);
  const rows = JSON.parse(await Deno.readTextFile(join(stage, "search.json")));
  assert(rows.find((row: any) => row.href === "book/chapter.html")?.text === "Heading Native caption Custom & exact", "Mounted search lost its final link captions or URL prefix");
  assert(rows.find((row: any) => row.href === "book/chapter.html#sec-target")?.text === "Heading", "Mounted fragment search lost its target");
  assert(rows.find((row: any) => row.href === "index.html")?.text === "Landing", "Mounted search merge removed the landing entry");
  assert(!rows.some((row: any) => row.href === "stale.html"), "Full search retained a noncurrent page entry");
  console.log("PASS combined search: one parse, final/native/custom captions, mounted entries and landing preservation");
} finally {
  Parser.parse = parse;
  await Deno.remove(root, { recursive: true });
}
