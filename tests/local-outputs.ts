import { join } from "stdlib/path";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-local-outputs-" });
const stage = join(root, "stage");
const html = (caption: string) => `<html><body><main><h1 id="sec-current">Current heading</h1><a data-qrc-ref="book:sec-current" data-qrc-style="default">placeholder</a><a data-qrc-ref="practice:sec-missing" data-qrc-style="default">practice:sec-missing</a></main><div class="qrc-probes" hidden aria-hidden="true" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="default"><a class="qrc-anchor" href="#sec-current">${caption}</a></div><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div></body></html>`;
const current = html("Current caption");
const stale = html("Stale duplicate caption");
const context = { root, stage, quarto: "fixture", config: {}, members: [{ namespace: "book", format: "html" }], scope: "local" as const, outputs: ["stage/current.html"] };
try {
  await Deno.mkdir(stage);
  await Deno.writeTextFile(join(stage, "current.html"), current);
  await Deno.writeTextFile(join(stage, "stale.html"), stale);
  const completeCatalog = '{"schema":"quarto-reference-catalog","generator":{"quarto":"prior"},"targets":{}}\n';
  await Deno.writeTextFile(join(stage, "reference-catalog.json"), completeCatalog);
  await Deno.writeTextFile(join(stage, "search.json"), JSON.stringify([{ href: "current.html", text: "old current" }, { href: "stale.html", text: "keep unrelated" }]));
  // A global stage scan would assemble a duplicate target and block this edit.
  await publish(context);
  assert(await Deno.readTextFile(join(stage, "stale.html")) === stale, "A selected local render rewrote an unrelated retained page");
  assert((await Deno.readTextFile(join(stage, "current.html"))).includes('href="current.html#sec-current">Current caption'), "Current facts were replaced by a retained duplicate");
  const rows = JSON.parse(await Deno.readTextFile(join(stage, "search.json")));
  assert(rows[0].text === "Current heading Current caption practice:sec-missing" && rows[1].text === "keep unrelated", "Local search read unrelated pages or retained probes");
  assert(await Deno.readTextFile(join(stage, "reference-catalog.json")) === completeCatalog, "Local linking replaced the prior complete public catalog with partial facts");

  const selectedExports = { ...context, config: { "reference-catalog": { exports: { book: ["sec-current", "sec-later"] } } } };
  await publish(selectedExports);
  const localCatalog = JSON.parse(await Deno.readTextFile(join(stage, "reference-catalog-local.json")));
  assert(Object.keys(localCatalog.targets).join() === "book:sec-current", "Local export did not restrict itself to current available targets");
  assert(await Deno.readTextFile(join(stage, "reference-catalog.json")) === completeCatalog, "Local selected exports replaced the complete catalog");

  const malformed = '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-broken" data-qrc-style="default"></div></div>';
  await Deno.writeTextFile(join(stage, "malformed.html"), malformed);
  await publish({ ...context, outputs: [join(stage, "current.html")] });
  assert(await Deno.readTextFile(join(stage, "malformed.html")) === malformed, "Local linking touched unrelated malformed retained HTML");

  let fullRejected = false;
  try { await publish({ ...context, scope: "full" }); } catch { fullRejected = true; }
  assert(fullRejected, "Explicit full finalization deferred a missing target");
  await Deno.remove(join(stage, "stale.html"));
  await Deno.remove(join(stage, "malformed.html"));
  let missingExportRejected = false;
  try { await publish({ ...selectedExports, scope: "full" }); } catch (error) { missingExportRejected = String(error).includes("sec-later"); }
  assert(missingExportRejected, "Full export silently omitted an unavailable declared target");
  console.log("PASS local outputs: selected current facts, unchanged unrelated duplicate/malformed HTML and search, strict full current validation");
} finally {
  await Deno.remove(root, { recursive: true });
}
