import {strict as assert} from 'node:assert';
import {dirname, fromFileUrl, join} from 'stdlib/path';
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({prefix: 'qrc-performance-native-'});
async function run(args: string[], env: Record<string, string> = {}) {
  const result = await new Deno.Command(Deno.env.get('QUARTO') || 'quarto', {
    args, cwd: root, env, stdout: 'piped', stderr: 'piped',
  }).output();
  assert.equal(result.code, 0, new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr));
}
try {
  await run(['add', repo, '--no-prompt']);
  const extension = join(root, '_extensions/reference-catalog');
  const descriptor = join(extension, '_extension.yml');
  await Deno.writeTextFile(descriptor, (await Deno.readTextFile(descriptor)).replace('  filters:\n', '  filters:\n    - at: pre-ast\n      path: lua/performance-test-agent.lua\n'));
  await Deno.writeTextFile(join(extension, 'lua/performance-test-agent.lua'), `
local function wrap(spec, fn)
 return function(...)
  if spec.id == 'reference-catalog.lua.requests.handler.Meta' or spec.id == 'reference-catalog.lua.probes.handler.Pandoc' then
   local file=assert(io.open(os.getenv('QRC_TEST_METRICS'), 'a'))
   file:write(pandoc.json.encode(spec), '\\n');file:close()
  end
  return fn(...)
 end
end
_G.__course_performance_agent_v1={abiVersion=1,metrics={wrap_sync=wrap,wrap_walk=wrap,child_env=function(base)return base end}}
return {}
`);
  const metrics = join(root, 'metrics.jsonl');
  for (const name of ['one', 'two']) {
    await Deno.writeTextFile(join(root, name + '.qmd'), '---\nfilters: [reference-catalog]\nreference-catalog: {namespace: example}\nlang: ru\n---\n\n# Заголовок {#sec-title}\n\nТекст.\n');
    await run(['render', name + '.qmd', '--to', 'html'], {COURSE_PERF_MODE: 'summary', QRC_TEST_METRICS: metrics});
    assert.match(await Deno.readTextFile(join(root, name + '.html')), /data-qrc-source="(?:[^\"]*\/)?(?:one|two)\.qmd"/);
  }
  const calls = (await Deno.readTextFile(metrics)).trim().split('\n').map(line => JSON.parse(line));
  for (const suffix of ['requests.handler.Meta', 'probes.handler.Pandoc']) {
    const handlers = calls.filter(call => call.id === 'reference-catalog.lua.' + suffix);
    assert.deepEqual(handlers.map(call => call.document_id), [join(root, 'one.qmd'), join(root, 'two.qmd')]);
    for (const call of handlers) assert.equal(call.attributes.extension_id, 'reference-catalog');
  }
  console.log('PASS actual Quarto: input_file двух документов передан без изменения native HTML');
} finally {
  await Deno.remove(root, {recursive: true});
}
