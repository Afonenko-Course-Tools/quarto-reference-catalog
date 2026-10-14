const api = await import("../_extensions/reference-catalog/entrypoints/body-links.ts").catch(() => null);
const assert = (v: unknown, m: string) => {if (!v) throw Error(m);};
assert(typeof api?.createBodyLinks === "function", "QRC не предоставляет публичный resolver для выбранного Body");
const catalog = {
  schema: "quarto-reference-catalog", generator: {quarto: "1.11.5"},
  targets: {
    "theory:sec-type": {namespace: "theory", id: "sec-type", page: "theory/types.html", fragment: "sec-type", label: "Типы", labelHtml: "Типы", number: "2", numberHtml: "2"},
    "lectures:fig-array": {namespace: "lectures", id: "fig-array", page: "lectures/arrays.html", fragment: "fig-array", slide: "arrays", label: "Массив", labelHtml: "Массив", number: "1", numberHtml: "1"},
  },
};
const links = api!.createBodyLinks({catalog, baseUrl: "https://example.test/course/"});
assert(links.resolve("theory:sec-type", "title", "bank.qmd").href === "https://example.test/course/theory/types.html#sec-type", "Межпроектный адрес потерян");
assert(links.resolve("lectures:fig-array", "default", "bank.qmd").href === "https://example.test/course/lectures/arrays.html?qrc-target=fig-array#/arrays", "Потеряна адресация вложенной Reveal-цели");
assert(links.resolve("theory:sec-type", "number", "bank.qmd").label === "2", "Потерян запрошенный стиль ссылки");
let missing = false;
try {links.resolve("theory:missing", "default", "bank.qmd");} catch (e) {missing = String(e).includes("QRC.TARGET_UNKNOWN") && String(e).includes("bank.qmd");}
assert(missing, "Неизвестная обязательная цель не диагностируется с source");
let unsafe = false;
try {api!.createBodyLinks({catalog, baseUrl: "file:///tmp/private/"});} catch {unsafe = true;}
assert(unsafe, "Приватный базовый адрес разрешён");
let externalLocal = false;
try {links.resolve("theory:sec-type", "external", "bank.qmd");} catch (e) {externalLocal = String(e).includes("QRC.REFERENCE_INVALID");}
assert(externalLocal, "Стиль external не должен превращать местную цель в импортированную");
console.log("PASS публичная адресация Body, Reveal, стили и контекст ошибок");
