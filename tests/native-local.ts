import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
import { attr, content, elements, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => Promise<unknown>, message: string) {
  try { await action(); } catch (error) {
    assert(error instanceof Error && error.message.includes(message), String(error));
    return;
  }
  throw new Error(`Expected rejection: ${message}`);
}
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "qrc-native-local-" });
const stage = join(root, "_site");
const quarto = Deno.env.get("QUARTO") || "/usr/bin/quarto";
async function render(target: string, extra: Record<string, string> = {}) {
  const result = await new Deno.Command(quarto, {
    args: ["render", target, "--fail-if-warnings"], cwd: root,
    env: { QUARTO: quarto, ...extra }, stdout: "piped", stderr: "piped",
  }).output();
  const output = new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
  assert(result.success, `Native ${target} render failed (${result.code}):\n${output}`);
  assert(output.includes("отложено ссылок:"), "Native local finalization did not report its deferred scope");
  assert(!/(?:WARNING|WARN:)/.test(output), `Native render reported a warning:\n${output}`);
}
async function links() {
  return elements(parseHtml(await Deno.readTextFile(join(stage, "index.html"))))
    .filter(node => node.tagName === "a" && attr(node, "data-qrc-ref") !== undefined);
}
try {
  await copy(join(repo, "_extensions"), join(root, "_extensions"));
  await Deno.writeTextFile(join(root, "_quarto.yml"), `project:
  type: website
  output-dir: _site
  render: [index.qmd, later.qmd]
  post-render: _extensions/reference-catalog/entrypoints/post.ts
format: html
filters: [reference-catalog]
reference-catalog:
  namespace: book
  exports:
    book: [sec-current, sec-later]
  imports:
    practice:
      source: external.json
      namespace: practice
      base-url: https://example.test/practice/
`);
  await Deno.writeTextFile(join(root, "index.qmd"), `# Current document {#sec-current}

Missing external facts: @practice:sec-external.

Missing chapter facts: {{< xref book sec-later "Read the later chapter" >}}.

Known local target: @book:sec-current.
`);
  await Deno.writeTextFile(join(root, "later.qmd"), "# Later chapter {#sec-later}\n");
  await render("index.qmd");
  let nodes = await links();
  assert(nodes.length === 3, "Native selected render lost requests");
  const external = nodes.find(node => attr(node, "data-qrc-ref") === "practice:sec-external")!;
  assert(attr(external, "data-qrc-deferred") === "true" && content(external) === "practice:sec-external", "Native selected render lost the deferred external label");
  const chapter = nodes.find(node => attr(node, "data-qrc-ref") === "book:sec-later")!;
  assert(attr(chapter, "data-qrc-deferred") === "true" && content(chapter) === "Read the later chapter", "Missing same-namespace chapter facts were not deferred");
  assert(nodes.some(node => attr(node, "data-qrc-ref") === "book:sec-current" && attr(node, "href") === "index.html#sec-current"), "Known native local target was not resolved");
  const partial = JSON.parse(await Deno.readTextFile(join(stage, "reference-catalog-local.json")));
  assert(Object.keys(partial.targets).join() === "book:sec-current", "Native selected render exported unavailable chapter facts");

  const context = { root, stage, quarto: "native-test", config: { "reference-catalog": { namespace: "book" } }, members: [{ namespace: "book", format: "html" }], outputs: ["_site/index.html"] };
  await rejects(() => publish({ ...context, scope: "full" }), "неизвестная ссылка practice:sec-external");
  await rejects(() => publish(context), "неизвестная ссылка practice:sec-external");

  const retained = await Deno.readTextFile(join(stage, "index.html"));
  const malformed = '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-broken" data-qrc-style="default"></div></div>';
  await Deno.writeTextFile(join(stage, "retained.html"), retained);
  await Deno.writeTextFile(join(stage, "malformed.html"), malformed);
  await render("index.qmd", { QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES: "outputs.txt" });
  assert((await Deno.readTextFile(join(root, "outputs.txt"))).trim() === "_site/index.html", "Native output file-list override was not consumed");
  assert(await Deno.readTextFile(join(stage, "retained.html")) === retained && await Deno.readTextFile(join(stage, "malformed.html")) === malformed, "Native selected render read or rewrote unrelated retained HTML");
  await Deno.remove(join(stage, "retained.html"));
  await Deno.remove(join(stage, "malformed.html"));

  // A full render of this component still lacks other course namespaces.
  await render(".");
  nodes = await links();
  assert(attr(nodes.find(node => attr(node, "data-qrc-ref") === "practice:sec-external")!, "data-qrc-deferred") === "true", "Native full component render incorrectly finalized the whole course");
  assert(attr(nodes.find(node => attr(node, "data-qrc-ref") === "book:sec-later")!, "href") === "later.html#sec-later", "Full component render did not resolve newly available chapter facts");

  // Full finalization consumes current facts retained by the local hook.
  const imported = {
    schema: "quarto-reference-catalog", generator: { quarto: "fixture" },
    targets: { "practice:sec-external": {
      namespace: "practice", id: "sec-external", page: "external.html", fragment: "sec-external",
      labelHtml: "External section", numberHtml: "", label: "External section", number: "",
    } },
  };
  await Deno.writeTextFile(join(root, "external.json"), JSON.stringify(imported));
  const current = { ...context, outputs: ["_site/index.html", "_site/later.html"], config: { "reference-catalog": {
    namespace: "book", imports: { practice: { source: "external.json", namespace: "practice", "base-url": "https://example.test/practice/" } },
  } } };
  await publish({ ...current, scope: "local" });
  nodes = await links();
  assert(content(nodes.find(node => attr(node, "data-qrc-ref") === "practice:sec-external")!) === "External section", "A subsequent invocation did not read newly available catalog facts");
  imported.targets["practice:sec-external"].label = "Current external section";
  imported.targets["practice:sec-external"].page = "current.html";
  await Deno.writeTextFile(join(root, "external.json"), JSON.stringify(imported));
  await publish({ ...current, scope: "full" });
  nodes = await links();
  const finalExternal = nodes.find(node => attr(node, "data-qrc-ref") === "practice:sec-external")!;
  assert(content(finalExternal) === "Current external section" && attr(finalExternal, "href") === "https://example.test/practice/current.html#sec-external", "Full finalization reused stale catalog bytes");
  assert(nodes.every(node => attr(node, "data-qrc-deferred") === undefined), "Full finalization retained deferred state");
  assert(nodes.some(node => attr(node, "data-qrc-ref") === "book:sec-current" && attr(node, "href") === "index.html#sec-current"), "Full finalization lost locally retained target facts");
  assert(!elements(parseHtml(await Deno.readTextFile(join(stage, "index.html")))).some(node => attr(node, "data-qrc-namespace") !== undefined), "Full finalization retained hidden target probes");
  console.log("PASS native local: selected/full component renders with --fail-if-warnings, current output/file lists, explicit/default full rejection, current catalogs and local-to-full finalization");
} finally {
  await Deno.remove(root, { recursive: true });
}
