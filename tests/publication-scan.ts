import { join } from "stdlib/path";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-scan-" });
const stage = join(root, "stage");
const readDir = Deno.readDir;
const visits = new Map<string, number>();
Deno.readDir = function (path: string | URL) {
  const name = String(path);
  if (name === stage || name.startsWith(stage + "/")) {
    visits.set(name, (visits.get(name) ?? 0) + 1);
  }
  return readDir(path);
};
const html = (caption: string) =>
  `<html><body><main><h1 id="sec-target">Heading</h1><a data-qrc-ref="book:sec-target" data-qrc-style="default">pre-link placeholder</a></main><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="default"><a class="quarto-xref" href="#sec-target">${caption}</a></div><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="number"><a class="quarto-xref" href="#sec-target">1</a></div></div></body></html>`;
const context = {
  root,
  stage,
  quarto: "fixture",
  config: {},
  members: [{ namespace: "book", format: "html" }],
  outputs: [join(stage, "index.html")],
  searchIndexes: [{ path: join(stage, "nested/search.json") }],
};
try {
  await Deno.mkdir(join(stage, "nested"), { recursive: true });
  await Deno.writeTextFile(
    join(stage, "index.html"),
    html("First final caption"),
  );
  await Deno.writeTextFile(
    join(stage, "nested/search.json"),
    JSON.stringify([{ href: "../index.html", text: "old" }]),
  );
  await publish(context);
  assert(
    visits.size === 0,
    `Explicit publication scanned stage directories: ${JSON.stringify([...visits])}`,
  );
  assert(
    JSON.parse(await Deno.readTextFile(join(stage, "nested/search.json")))[0]
      .text === "Heading First final caption",
    "Publication lost search text",
  );
  visits.clear();
  await Deno.writeTextFile(
    join(stage, "index.html"),
    html("Changed final caption"),
  );
  await publish(context);
  assert(
    visits.size === 0,
    "Later publication scanned its retained stage",
  );
  assert(
    JSON.parse(await Deno.readTextFile(join(stage, "nested/search.json")))[0]
      .text === "Heading Changed final caption",
    "Later publication reused old stage HTML",
  );
  await Deno.symlink(join(stage, "index.html"), join(stage, "linked.html"));
  let refused = false;
  try {
    await publish({ ...context, outputs: [join(stage, "linked.html")] });
  } catch (error) {
    refused = true;
  }
  assert(refused, "Publication accepted a current symlink output");
  console.log(
    "PASS explicit publication: no stage walk, final search, later-call freshness and symlink refusal",
  );
} finally {
  Deno.readDir = readDir;
  await Deno.remove(root, { recursive: true });
}
