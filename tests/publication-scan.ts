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
    visits.size === 2 && [...visits.values()].every((count) => count === 1),
    `Stage directories were listed repeatedly: ${JSON.stringify([...visits])}`,
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
    [...visits.values()].every((count) => count === 1),
    "Later publication repeated its stage scan",
  );
  assert(
    JSON.parse(await Deno.readTextFile(join(stage, "nested/search.json")))[0]
      .text === "Heading Changed final caption",
    "Later publication reused old stage HTML",
  );
  await Deno.symlink(join(stage, "index.html"), join(stage, "linked.html"));
  let refused = false;
  try {
    await publish(context);
  } catch (error) {
    refused = String(error).includes("символические ссылки");
  }
  assert(refused, "Publication stage scan accepted a symlink");
  console.log(
    "PASS publication scan: one directory walk, final search bytes, later-call freshness and symlink refusal",
  );
} finally {
  Deno.readDir = readDir;
  await Deno.remove(root, { recursive: true });
}
