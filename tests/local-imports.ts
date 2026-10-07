import { join } from "stdlib/path";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";
import { attr, content, elements, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => Promise<unknown>, message: string, code = "QRC.IMPORT_INVALID") {
  try { await action(); } catch (error) {
    assert(error instanceof Error && (code === "ExternalToolFailure" ? error.name === code : (error as Error & { code?: string }).code === code), `Expected ${code}: ${error}`);
    assert(error instanceof Error && error.message.includes(message), String(error));
    return;
  }
  throw new Error(`Expected rejection: ${message}`);
}
const root = await Deno.makeTempDir({ prefix: "qrc-local-imports-" });
const stage = join(root, "stage");
const source = join(root, "sibling.json");
const context = {
  root, stage, quarto: "fixture", members: [{ namespace: "book", format: "html" }], outputs: ["stage/current.html"],
  config: { "reference-catalog": { imports: { practice: { source: "sibling.json", namespace: "book", "base-url": "https://example.test/practice/" } } } },
};
async function anchor() {
  return elements(parseHtml(await Deno.readTextFile(join(stage, "current.html")))).find(node => node.tagName === "a")!;
}
try {
  await Deno.mkdir(stage);
  await Deno.writeTextFile(join(stage, "current.html"), '<html><body><a data-qrc-ref="practice:sec-external" data-qrc-style="default">practice:sec-external</a></body></html>');
  // An absent sibling's catalog is unavailable local data, not invalid markup.
  await publish({ ...context, scope: "local" });
  assert(attr(await anchor(), "data-qrc-deferred") === "true", "An absent configured sibling catalog was not deferred locally");
  await rejects(() => publish({ ...context, scope: "full" }), "не удалось прочитать импортированный каталог", "ExternalToolFailure");
  await rejects(() => publish(context), "не удалось прочитать импортированный каталог", "ExternalToolFailure");

  await Deno.writeTextFile(source, JSON.stringify({ schema: "quarto-reference-catalog", generator: { quarto: "fixture" }, targets: {} }));
  await publish({ ...context, scope: "local" });
  assert(attr(await anchor(), "data-qrc-deferred") === "true", "An absent namespace in a valid retained catalog was not deferred");
  await rejects(() => publish({ ...context, scope: "full" }), "не содержит пространство имён book");

  for (const [bytes, message] of [["{broken", "некорректный JSON"], [JSON.stringify({ schema: "invalid", targets: {} }), "неподдерживаемая схема"]]) {
    await Deno.writeTextFile(source, bytes);
    await rejects(() => publish({ ...context, scope: "local" }), message);
  }
  await Deno.writeTextFile(source, JSON.stringify({ schema: "quarto-reference-catalog", generator: { quarto: "fixture" }, targets: {
    "book:sec-external": { namespace: "book", id: "sec-external", page: "current.html", fragment: "sec-external", labelHtml: "Current target", numberHtml: "", label: "Current target", number: "" },
  } }));
  await publish({ ...context, scope: "local" });
  const resolved = await anchor();
  assert(attr(resolved, "data-qrc-deferred") === undefined && attr(resolved, "href") === "https://example.test/practice/current.html#sec-external" && content(resolved) === "Current target", "A later invocation did not load the sibling's new current catalog");
  console.log("PASS local imports: absent file/retained namespace deferral, full refusal, malformed catalog strictness and later-call freshness");
} finally {
  await Deno.remove(root, { recursive: true });
}
