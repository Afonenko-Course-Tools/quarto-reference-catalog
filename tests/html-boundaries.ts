import { strict as assert } from "node:assert";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";

const path = "book/index.html";
const valid = `<h1 id="sec-a">Раздел</h1><div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-a" data-qrc-style="default"><a class="qrc-anchor" href="#sec-a">Раздел</a></div><div class="qrc-probe" data-qrc-id="sec-a" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div>`;
for (const [attribute, text] of [
  ["data-qrc-namespace", valid.replace('data-qrc-namespace="book"', "")],
  ["data-qrc-id", valid.replace('data-qrc-id="sec-a"', "")],
  ["data-qrc-style", valid.replace('data-qrc-style="default"', "")],
  ["href", valid.replace('href="#sec-a"', "")],
] satisfies [string, string][]) {
  assert.throws(() => readPage(path, text), (error: unknown) => {
    return error instanceof Error && error.name === "ExtensionDiagnostic" &&
      "code" in error && error.code === "QRC.OUTPUT_INVALID" &&
      error.message.includes(path) && error.message.includes(attribute);
  }, `Непроверенная граница HTML: ${attribute}`);
}
assert.equal(readPage(path, valid).targets.length, 1);
console.log("Пройдено: обязательные native HTML metadata проверяются до модели каталога");
