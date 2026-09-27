import type { Catalog, Target } from "../_extensions/reference-catalog/domain/model.ts";
import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { attr, content, elements, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";
import { parseImports } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const payload: Catalog = {
  schema: "quarto-reference-catalog", generator: { quarto: "test" },
  targets: { "book:sec-example": {
    namespace: "book", id: "sec-example", page: "index.html", fragment: "sec-example",
    labelHtml: '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
    numberHtml: '<svg onload="alert(3)"></svg>',
    label: '<img onerror="alert(4)"> & подпись', number: '<script>alert(5)</script>',
    title: '<iframe srcdoc="<script>alert(6)</script>">',
  } },
};
const validated = validateImportedCatalog(payload, "https://example.edu/reference.json");
const imported: Target = { ...validated.targets["book:sec-example"], namespace: "external", baseUrl: "https://example.edu/course/", sourceTitle: '<img onerror="alert(7)">' };
const local: Target = { ...imported, namespace: "local", baseUrl: undefined, labelHtml: "Раздел&nbsp;<em>1</em>", numberHtml: "<strong>1</strong>" };
const request = (namespace: string, style: string, custom = "") => `<a data-qrc-ref="${namespace}:sec-example" data-qrc-style="${style}" data-qrc-custom="${Boolean(custom)}">${custom}</a>`;
const html = "<html><head></head><body>" + ["default", "number", "title", "external"].map(style => request("external", style)).join("")
  + request("local", "default") + request("local", "number") + request("external", "default", "<em>Авторская подпись</em>") + "</body></html>";
const page = readPage("index.html", html);
const result = linkPages([page], "", [imported, local]).pages.get("index.html")!;
const nodes = elements(parseHtml(result));
assert(!nodes.some(node => ["img", "svg", "iframe"].includes(node.tagName)), "HTML из внешнего каталога не должен создавать элементы");
assert(!nodes.some(node => node.attrs.some(attribute => attribute.name.startsWith("on"))), "Каталог не должен внедрять обработчики событий");
assert(nodes.filter(node => node.tagName === "script").every(node => attr(node, "data-qrc-navigation") !== undefined && content(node) === ""), "Каталог не должен внедрять скрипты");
const links = nodes.filter(node => node.tagName === "a");
assert(content(links[0]) === imported.label && content(links[1]) === imported.number, "Внешние подписи должны отображаться как исходный текст");
assert(result.includes("Раздел&nbsp;<em>1</em>") && result.includes("<strong>1</strong>"), "Локальная разметка Quarto должна сохраняться");
assert(result.includes("<em>Авторская подпись</em>"), "Явная авторская подпись должна сохранять разметку");
for (const baseUrl of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///tmp/"]) {
  let failed = false;
  try { parseImports({ external: { source: "reference.json", namespace: "book", "base-url": baseUrl } }, "/tmp", []); }
  catch { failed = true; }
  assert(failed, `Разрешён недопустимый протокол публикации: ${baseUrl}`);
}
console.log("Пройдено: внешние подписи — текст, локальная и авторская HTML-разметка сохранена, протоколы публикации ограничены HTTP(S)");
