import { strict as assert } from "node:assert";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
import type { Node } from "../_extensions/reference-catalog/infrastructure/html.ts";

const path = "book/index.html";
const valid = `<h1 id="sec-a">Раздел</h1><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-a" data-qrc-style="default"><a class="qrc-anchor" href="#sec-a">Раздел</a></div><div class="qrc-probe" data-qrc-id="sec-a" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div>`;
const failures: string[] = [];
for (const [attribute, text] of [
  ["data-qrc-namespace", valid.replace('data-qrc-namespace="book"', "")],
  ["data-qrc-id", valid.replace('data-qrc-id="sec-a"', "")],
  ["data-qrc-style", valid.replace('data-qrc-style="default"', "")],
  ["href", valid.replace('href="#sec-a"', "")],
] satisfies [string, string][]) {
  try {
    assert.throws(
      () => readPage(path, text),
      (error: unknown) => {
        return (
          error instanceof Error &&
          error.name === "ExtensionDiagnostic" &&
          "code" in error &&
          error.code === "QRC.OUTPUT_INVALID" &&
          error.message.includes(path) &&
          error.message.includes(attribute)
        );
      },
      `Непроверенная граница HTML: ${attribute}`,
    );
  } catch (error) {
    failures.push(String(error));
  }
}
const page = readPage(
  path,
  '<html><body><a data-qrc-ref="os:sec-a" data-qrc-style="external">Ссылка</a></body></html>',
);
const own = readPage(path, valid).targets[0];
assert(own);
linkPages([page], "", [{ ...own, namespace: "os", baseUrl: "https://example.test/" }]);
function parents(node: Node): void {
  if (!("childNodes" in node)) return;
  for (const child of node.childNodes) {
    assert.equal(child.parentNode, node, `Неверный parentNode: ${child.nodeName}`);
    parents(child);
  }
}
try {
  parents(page.root);
} catch (error) {
  failures.push(String(error));
}
assert.deepEqual(failures, []);
assert.equal(readPage(path, valid).targets.length, 1);
console.log(
  "Пройдено: обязательные native HTML metadata и связи дерева parse5 проверяются до модели каталога",
);
