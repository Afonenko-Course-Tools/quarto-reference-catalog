import { join } from "stdlib/path";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => Promise<void>, message: string, code = "QRC.OUTPUT_INVALID") {
  let failed = false;
  try { await action(); } catch (error) {
    assert(error instanceof Error && (error as Error & { code?: string }).code === code, `Expected ${code}: ${error}`);
    failed = true;
  }
  assert(failed, message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-full-outputs-" });
const stage = join(root, "stage");
const html = `<html><body><main><h1 id="sec-current">Current</h1><a data-qrc-ref="book:sec-current" data-qrc-style="default">placeholder</a></main><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="default"><a class="qrc-anchor" href="#sec-current">Current caption</a></div><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div></body></html>`;
const context = { root, stage, quarto: "fixture", config: {}, members: [{ namespace: "book", format: "html" }], outputs: ["stage/current.html"] };
try {
  await Deno.mkdir(stage);
  await Deno.writeTextFile(join(stage, "current.html"), html);
  await Deno.writeTextFile(join(stage, "stale.html"), html);
  await Deno.writeTextFile(join(stage, "malformed.html"), '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-broken"></div></div>');
  await publish(context);
  assert(await Deno.readTextFile(join(stage, "stale.html")) === html, "Full finalization rewrote unrelated retained HTML");
  const catalog = JSON.parse(await Deno.readTextFile(join(stage, "reference-catalog.json")));
  assert(Object.keys(catalog.targets).join() === "book:sec-current", "Full catalog included noncurrent target facts");
  assert((await Deno.readTextFile(join(stage, "current.html"))).includes('href="current.html#sec-current">Current caption'), "Current full target was not linked");
  await rejects(() => publish({ ...context, outputs: ["stage/missing.html"] }), "Full finalization accepted a missing current output");
  await rejects(() => publish({ ...context, outputs: undefined } as any), "Full finalization accepted no explicit outputs");
  await Deno.writeTextFile(join(stage, "current.html"), html.replace('book:sec-current" data-qrc-style', 'book:sec-missing" data-qrc-style'));
  await rejects(() => publish(context), "Explicit current full finalization deferred a missing target", "QRC.TARGET_UNKNOWN");
  await Deno.mkdir(join(root, "outside"));
  await Deno.writeTextFile(join(root, "outside/other.html"), html);
  await Deno.symlink(join(root, "outside"), join(stage, "escape"));
  await rejects(() => publish({ ...context, scope: "local", outputs: ["stage/escape/other.html"] }), "Local current output escaped through a parent symlink");
  console.log("PASS explicit full outputs: current-only targets, stale isolation, required/missing outputs, strict targets and parent-symlink containment");
} finally {
  await Deno.remove(root, { recursive: true });
}
