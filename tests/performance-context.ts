import { fromFileUrl } from "stdlib/path";
import { jsonValue } from "./support.ts";
import { strict as assert } from 'node:assert';
import { AsyncLocalStorage } from 'node:async_hooks';
const root = await Deno.makeTempDir(), key = Symbol.for('course.performance.agent.v1');

const saved = Deno.env.toObject(), previous: unknown = Reflect.get(globalThis, key);
const contexts = new AsyncLocalStorage<string>();
const calls: Array<{id: string; document_id?: string; attributes?: Record<string, unknown>}> = [];
const wrap = <Args extends unknown[], Result>(spec: typeof calls[number], fn: (...args: Args) => Result) => (...args: Args) => {
  calls.push(spec); return fn(...args);
};
try {
  Deno.env.set('COURSE_PERF_MODE', 'summary');
  Deno.env.set('QUARTO', Deno.execPath());
  Deno.env.set('COURSE_PERF_PARENT_SPAN_ID', 'stale-parent');
  Deno.env.set('FUNCTIONAL_INHERITED', 'inherited');
  Reflect.set(globalThis, key, {abiVersion: 1, metrics: {
    wrapSync: wrap, wrapAsync: wrap, wrapWalk: wrap,
    childEnv(base: Record<string, string>) {
      const env = {...base};
      delete env.COURSE_PERF_PARENT_SPAN_ID;
      const parent = contexts.getStore();
      if (parent) env.COURSE_PERF_PARENT_SPAN_ID = parent;
      return env;
    },
  }});
  const {quarto} = await import('../_extensions/reference-catalog/infrastructure/process.ts?context-test');
  const args = ["run", "--no-config", "--no-lock", "--allow-env", fromFileUrl(new URL("./fixtures/performance-child.ts", import.meta.url))];
  const env = {FUNCTIONAL: 'keep', QUARTO_PROFILE: 'student'};
  assert.deepEqual(jsonValue(await quarto(args, root, env)), [null, 'keep', 'inherited', 'student', Deno.pid]);
  const values = await Promise.all(['parent-a', 'parent-b'].map(parent => contexts.run(parent, async () =>
    jsonValue(await quarto(args, root, env)))));
  assert.deepEqual(values, [
    ['parent-a', 'keep', 'inherited', 'student', Deno.pid],
    ['parent-b', 'keep', 'inherited', 'student', Deno.pid],
  ]);
  assert.deepEqual(env, {FUNCTIONAL: 'keep', QUARTO_PROFILE: 'student'});
  assert.equal(Deno.env.get('COURSE_PERF_PARENT_SPAN_ID'), 'stale-parent');
  const commands = calls.filter(call => call.id === 'reference-catalog.infrastructure.process.quarto');
  assert.equal(commands.length, 3);
  for (const call of commands) {
    assert.equal(call.attributes?.extension_id, 'reference-catalog');
    assert.equal(call.document_id, undefined);
  }
  // Отсутствующий агент сохраняет native env и результат команды.
  Reflect.deleteProperty(globalThis, key);
  const missing = await import('../_extensions/reference-catalog/infrastructure/process.ts?missing-agent-test');
  assert.deepEqual(jsonValue(await missing.quarto(args, root, env)), ['stale-parent', 'keep', 'inherited', 'student', Deno.pid]);
  Deno.env.set('COURSE_PERF_MODE', 'off');
  const {createMetrics} = await import('../_extensions/reference-catalog/observability/bridge.ts');
  const offMetrics = createMetrics('reference-catalog');
  const pending = Promise.resolve('unchanged');
  const original = () => pending;
  assert.equal(offMetrics.wrapAsync({id: 'test.off', kind: 'phase'}, original), original);
  assert.equal(offMetrics.wrapSync({id: 'test.off', kind: 'phase'}, original), original);
  assert.equal(offMetrics.wrapAsync({id: 'test.off', kind: 'phase'}, original)(), pending);
  assert.equal(offMetrics.childEnv(env), env);
  const off = await import('../_extensions/reference-catalog/infrastructure/process.ts?off-context-test');
  assert.deepEqual(jsonValue(await off.quarto(args, root, env)), ['stale-parent', 'keep', 'inherited', 'student', Deno.pid]);
  console.log('PASS actual child: parent, удаление stale parent, parallel context, functional env, extension, off/missing agent');
} finally {
  for (const name of Object.keys(Deno.env.toObject())) if (!(name in saved)) Deno.env.delete(name);
  for (const [name, value] of Object.entries(saved)) Deno.env.set(name, value);
  if (previous === undefined) Reflect.deleteProperty(globalThis, key); else Reflect.set(globalThis, key, previous);
  await Deno.remove(root, {recursive: true});
}
