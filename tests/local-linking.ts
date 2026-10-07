import type { Target } from "../_extensions/reference-catalog/domain/model.ts";
import { attr, content, elements, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function rejects(action: () => unknown, message: string, code = "QRC.TARGET_UNKNOWN") {
  try { action(); } catch (error) {
    assert(error instanceof Error && (code === "ExternalToolFailure" ? error.name === code : (error as Error & { code?: string }).code === code), `Expected ${code}: ${error}`);
    assert(error instanceof Error && error.message.includes(message), String(error));
    return;
  }
  throw new Error(`Expected rejection: ${message}`);
}
const request = (key: string, label = key, custom = false, style = "default") =>
  `<a class="qrc-link author" href="#qrc-unresolved" data-qrc-ref="${key}" data-qrc-style="${style}" data-qrc-custom="${custom}">${label}</a>`;
const html = `<html><body>${request("os:sec-memory")}${request("os:sec-memory", "<em>Read about memory</em>", true)}<div class="qrc-probes" hidden aria-hidden="true" data-qrc-namespace="book"></div></body></html>`;
const page = readPage("index.html", html);
const imported: Target = {
  namespace: "os", id: "sec-memory", page: "memory.html", fragment: "sec-memory",
  labelHtml: "Section 1", numberHtml: "1", label: "Section 1", number: "1",
  baseUrl: "https://example.test/os/",
};
const anchors = (value: string) => elements(parseHtml(value)).filter(node => node.tagName === "a");

// Removing local deferral must make this fail with the old unknown-target error.
const deferred = linkPages([page], "", [], "", "local");
const pending = anchors(deferred.pages.get("index.html")!);
assert(deferred.links === 0 && deferred.deferred === 2, "Deferred requests were counted as resolved links");
assert(pending.length === 2 && pending.every(node => attr(node, "data-qrc-ref") === "os:sec-memory" && attr(node, "data-qrc-deferred") === "true"), "Deferred links lost their identity or marker");
assert(content(pending[0]) === "os:sec-memory" && content(pending[1]) === "Read about memory", "Deferred links lost their meaningful labels");
assert(deferred.pages.get("index.html")!.includes("<em>Read about memory</em>"), "Deferred custom markup was changed");
assert(pending.every(node => attr(node, "href") === undefined), "Deferred links retained an unresolved navigation URL");
assert(elements(parseHtml(deferred.pages.get("index.html")!)).some(node => attr(node, "data-qrc-namespace") === "book" && attr(node, "hidden") !== undefined && attr(node, "aria-hidden") === "true"), "Local linking discarded hidden current facts needed by full finalization");

const resolved = linkPages([page], "", [imported], "", "local");
assert(resolved.links === 2 && resolved.deferred === 0, "Known local targets did not resolve");
assert(anchors(resolved.pages.get("index.html")!).every(node => attr(node, "href") === "https://example.test/os/memory.html#sec-memory" && attr(node, "data-qrc-deferred") === undefined), "Known targets have incorrect URLs or remain deferred");
const full = linkPages([page], "", [imported], "", "full");
assert(!elements(parseHtml(full.pages.get("index.html")!)).some(node => attr(node, "data-qrc-namespace") !== undefined), "Full finalization left hidden probes in the output");

// A later call must use the supplied current facts and clear old deferred state.
const next = linkPages([readPage("index.html", deferred.pages.get("index.html")!)], "", [{ ...imported, label: "Current section", page: "current.html" }], "", "local");
const current = anchors(next.pages.get("index.html")!);
assert(content(current[0]) === "Current section" && attr(current[0], "href") === "https://example.test/os/current.html#sec-memory", "A later invocation reused old catalog facts");
assert(current.every(node => attr(node, "data-qrc-deferred") === undefined), "A resolved target retained its deferred marker");

rejects(() => linkPages([page], "", [], "", "full"), "неизвестная ссылка os:sec-memory");
rejects(() => linkPages([page], ""), "неизвестная ссылка os:sec-memory");
const sameNamespace = linkPages([readPage("index.html", html.replaceAll("os:sec-memory", "book:sec-missing"))], "", [], "", "local");
assert(sameNamespace.deferred === 2, "A namespace spanning documents incorrectly made missing facts a local error");
rejects(() => linkPages([readPage("index.html", html.replaceAll('data-qrc-style="default"', 'data-qrc-style="invalid"'))], "", [], "", "local"), "некорректный стиль ссылки", "QRC.REFERENCE_INVALID");
for (const key of ["bad namespace:sec-memory", "os:", "os:sec memory", "os:sec:memory", "os:sec#memory"]) {
  rejects(() => linkPages([readPage("index.html", html.replaceAll("os:sec-memory", key))], "", [], "", "local"), "некорректная ссылка", "QRC.REFERENCE_INVALID");
}
console.log("PASS local linking: deferred labels and identity, known targets, current facts, same namespace, strict full/default and malformed request failures");
