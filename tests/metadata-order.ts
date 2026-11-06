import { required } from "./support.ts";
import { strict as assert } from "node:assert";
import { attr, content, elements, hasClass, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";

const variants = [
  {
    probe: 'class="qrc-probes" aria-hidden="true" data-qrc-source="/owner/a.qmd" hidden="" data-qrc-namespace="book"',
    row: 'class="qrc-probe" data-qrc-title="Название &amp; тема" data-qrc-style="default" data-qrc-id="sec-a"',
    link: 'class="qrc-link" data-qrc-ref="book:sec-a" data-qrc-custom="false" data-qrc-style="default" data-qrc-deferred="true"',
  },
  {
    probe: 'data-qrc-namespace="book" data-qrc-source="/owner/a.qmd" class="qrc-probes" hidden="" aria-hidden="true"',
    row: 'data-qrc-id="sec-a" class="qrc-probe" data-qrc-style="default" data-qrc-title="Название &amp; тема"',
    link: 'data-qrc-deferred="true" data-qrc-style="default" data-qrc-ref="book:sec-a" data-qrc-custom="false" class="qrc-link"',
  },
];
for (const { probe, row, link } of variants) {
  const pending = linkPages([readPage("a.html", `<html><body><a ${link}>Отложенная <em>подпись</em></a></body></html>`)], "", [], "", "local");
  assert.equal(pending.links, 0);
  assert.equal(pending.deferred, 1);
  const pendingLink = elements(parseHtml(required(pending.pages.get("a.html")))).find(node => node.tagName === "a")!;
  assert.equal(attr(pendingLink, "href"), undefined);
  assert.equal(attr(pendingLink, "data-qrc-ref"), "book:sec-a");
  assert.equal(attr(pendingLink, "data-qrc-deferred"), "true");
  assert.equal(content(pendingLink), "Отложенная подпись");
  assert(pendingLink.childNodes.some(node => "tagName" in node && node.tagName === "em"));
  const html = `<html><body><section id="sec-a">Тема</section><a ${link}>Ожидание</a><div ${probe}><div ${row}><a class="quarto-xref" href="#sec-a">Раздел <em>1</em></a></div><div class="qrc-probe" data-qrc-style="number" data-qrc-id="sec-a"><a class="quarto-xref" href="#sec-a">1</a></div></div></body></html>`;
  const page = readPage("a.html", html);
  assert.deepEqual(page.targets, [{
    namespace: "book", id: "sec-a", page: "a.html", fragment: "sec-a", slide: undefined,
    labelHtml: "Раздел <em>1</em>", numberHtml: "1", label: "Раздел 1", number: "1", title: "Название & тема",
  }]);
  for (const scope of ["local", "full"] as const) {
    const result = linkPages([readPage("a.html", html)], "", [], "", scope);
    assert.equal(result.links, 1);
    assert.equal(result.deferred, 0);
    const nodes = elements(parseHtml(required(result.pages.get("a.html"))));
    const request = required(nodes.find(node => attr(node, "data-qrc-ref") === "book:sec-a"));
    assert.equal(attr(request, "href"), "a.html#sec-a");
    assert.equal(attr(request, "data-qrc-style"), "default");
    assert.equal(attr(request, "data-qrc-custom"), "false");
    assert.equal(attr(request, "data-qrc-deferred"), undefined);
    assert.equal(content(request), "Раздел 1");
    assert(request.childNodes.some(node => "tagName" in node && node.tagName === "em"));
    const retained = nodes.filter(node => hasClass(node, "qrc-probes"));
    assert.equal(retained.length, scope === "local" ? 1 : 0);
    if (scope === "local") {
      assert.equal(attr(required(retained[0]), "data-qrc-source"), "/owner/a.qmd");
      assert.equal(attr(required(retained[0]), "data-qrc-namespace"), "book");
      assert.equal(attr(required(retained[0]), "hidden"), "");
      assert.equal(attr(required(retained[0]), "aria-hidden"), "true");
    }
  }
}
console.log("Пройдено: порядок атрибутов сохраняет цели, подписи, ссылки и семантику local/full metadata");
