import { join } from "stdlib/path";
import { Parser } from "../_extensions/reference-catalog/vendor/parse5/dist/index.js";
import { updateSearch } from "../_extensions/reference-catalog/infrastructure/search.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-search-" });
const parse = Parser.parse;
let parses = 0;
Parser.parse = function (...args: Parameters<typeof parse>) {
  parses++;
  return parse.apply(this, args);
};
const files = [join(root, "search.json"), join(root, "nested/search.json")];
async function writeRows() {
  await Deno.mkdir(join(root, "nested"), { recursive: true });
  await Deno.writeTextFile(
    files[0],
    JSON.stringify([
      { href: "index.html", text: "old" },
      { href: "index.html#same", text: "old" },
      { href: "index.html#same", text: "old" },
      { href: "index.html#missing", text: "keep missing" },
      { href: "missing.html", text: "keep page" },
      { href: "nested/other.html#encoded%20id", text: "old" },
    ]),
  );
  await Deno.writeTextFile(
    files[1],
    JSON.stringify([{ href: "../index.html#same", text: "old" }, {
      href: "other.html",
      text: "old",
    }]),
  );
}
try {
  await writeRows();
  const pages = new Map([
    [
      "index.html",
      '<html><body><main>Final <a>linked caption</a><section id="same">first match</section><section id="same">later match</section><nav>omit nav</nav><script>omit script</script><span class="anchorjs-link">omit anchor</span></main><main>later main</main></body></html>',
    ],
    [
      "nested/other.html",
      '<html><body><main><section id="encoded id">Other text</section><button>omit button</button><style>omit style</style></main></body></html>',
    ],
  ]);
  await updateSearch(root, files, pages);
  assert(parses === 2, `Expected one final HTML parse per page, got ${parses}`);
  const first = JSON.parse(await Deno.readTextFile(files[0])).map((
    row: { text: string },
  ) => row.text);
  assert(
    JSON.stringify(first) ===
      JSON.stringify([
        "Final linked caption first match later match",
        "first match",
        "first match",
        "keep missing",
        "keep page",
        "Other text",
      ]),
    "Search changed first-match, final HTML, exclusion or missing-target semantics",
  );
  assert(
    JSON.stringify(
      JSON.parse(await Deno.readTextFile(files[1])).map((
        row: { text: string },
      ) => row.text),
    ) === '["first match","Other text"]',
    "Search lost index-relative URLs",
  );
  pages.set(
    "index.html",
    '<html><body><main><section id="same">changed linked caption</section></main></body></html>',
  );
  parses = 0;
  await updateSearch(root, files, pages);
  assert(parses === 2, "A later search operation reused prior parsed pages");
  assert(
    JSON.parse(await Deno.readTextFile(files[0]))[1].text ===
      "changed linked caption",
    "A later search operation retained stale linked HTML",
  );
  console.log(
    "PASS search: one parse per final page, duplicate-ID first match, missing targets, exclusions and later-call freshness",
  );
} finally {
  Parser.parse = parse;
  await Deno.remove(root, { recursive: true });
}
