import { strict as assert } from "node:assert";
import { canonicalizeMetadata } from "../_extensions/reference-catalog/infrastructure/metadata.ts";
const pairs = [
 ['<div class="qrc-probes" aria-hidden="true" data-qrc-source="/left/theory/a.qmd" hidden="" data-qrc-namespace="theory">', '<div class="qrc-probes" data-qrc-namespace="theory" data-qrc-source="/right/theory/a.qmd" aria-hidden="true" hidden="">'],
 ['<div class="qrc-probe" data-qrc-title="Title" data-qrc-style="default" data-qrc-id="sec-a">', '<div class="qrc-probe" data-qrc-id="sec-a" data-qrc-style="default" data-qrc-title="Title">'],
 ['<a class="qrc-link" data-qrc-ref="a:b" data-qrc-custom="false" data-qrc-style="default" data-qrc-deferred="true">', '<a class="qrc-link" data-qrc-deferred="true" data-qrc-style="default" data-qrc-ref="a:b" data-qrc-custom="false">'],
];
for (const [a,b] of pairs) {
 assert.equal(canonicalizeMetadata(a, '/left'), canonicalizeMetadata(b, '/right'));
 assert.notEqual(canonicalizeMetadata(a, '/left'), canonicalizeMetadata(b.replace('="', '="changed-'), '/right'));
 for(const [prefix,suffix] of [['<script>', '</script>'],['<style>', '</style>'],['<!--', '-->']]) {
  assert.equal(canonicalizeMetadata(prefix+a+suffix, '/left'), prefix+a+suffix);
 }
 assert.equal(canonicalizeMetadata(canonicalizeMetadata(a)), canonicalizeMetadata(a));
}
const source = '<div class="qrc-probes" data-qrc-source="/left/theory/a.qmd">';
assert.notEqual(canonicalizeMetadata(source,'/left'), canonicalizeMetadata(source.replace('a.qmd','b.qmd'),'/left'));
assert.equal(canonicalizeMetadata(source.replace('/left/', '/left-other/'),'/left'),source.replace('/left/', '/left-other/'));
assert.equal(canonicalizeMetadata(source.replace('/theory/', '/../theory/'),'/left'),source.replace('/theory/', '/../theory/'));
const duplicate = '<div class="qrc-probe" data-qrc-id="first" data-qrc-style="default" data-qrc-id="second">';
assert.equal(canonicalizeMetadata(duplicate),duplicate);
const unrelated='<p data-qrc-ref="a:b">Учебный текст</p><a href="/left/a.qmd">Ответ 4</a>';
assert.equal(canonicalizeMetadata(unrelated,'/left'),unrelated);
console.log('PASS детерминированные QRC metadata, значения, duplicate attrs и ограниченные source paths');

import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
const local = (link: string) => '<html><body>'+link+'</body></html>';
const one=linkPages([readPage('a.html',local(pairs[2][0]+'Deferred</a>'))], '', [], '', 'local').pages.get('a.html');
const two=linkPages([readPage('a.html',local(pairs[2][1]+'Deferred</a>'))], '', [], '', 'local').pages.get('a.html');
assert.equal(one,two);
console.log('PASS одинаковая local publication при разном входном порядке metadata');
