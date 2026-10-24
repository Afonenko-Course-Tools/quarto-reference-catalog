import {strict as assert} from 'node:assert';
const key = Symbol.for('course.performance.agent.v1');
const registry = globalThis as unknown as Record<symbol, unknown>;
const savedMode = Deno.env.get('COURSE_PERF_MODE'), previous = registry[key];
const calls: Array<{id: string; document_id?: string; attributes?: Record<string, unknown>}> = [];
const wrap = (spec: typeof calls[number], fn: Function) => (...args: unknown[]) => {calls.push(spec); return fn(...args);};
try {
  Deno.env.set('COURSE_PERF_MODE', 'summary');
  registry[key] = {abiVersion: 1, metrics: {wrapSync: wrap, wrapAsync: wrap, wrapWalk: wrap, childEnv: (base: unknown) => base}};
  const {readPage} = await import('../_extensions/reference-catalog/infrastructure/pages.ts?document-context-test');
  assert.equal(readPage('one/index.html', '<html><body><h1 id="sec-one">Первый</h1></body></html>').path, 'one/index.html');
  assert.equal(readPage('two/deck.html', '<html><body><div class="reveal"></div></body></html>').reveal, true);
  const pages = calls.filter(call => call.id === 'reference-catalog.infrastructure.pages.readPage');
  assert.deepEqual(pages.map(call => call.document_id), ['one/index.html', 'two/deck.html']);
  for (const call of pages) assert.equal(call.attributes?.extension_id, 'reference-catalog');
  console.log('PASS отдельные HTML outputs имеют явный document context');
} finally {
  if (previous === undefined) delete registry[key]; else registry[key] = previous;
  if (savedMode === undefined) Deno.env.delete('COURSE_PERF_MODE'); else Deno.env.set('COURSE_PERF_MODE', savedMode);
}
