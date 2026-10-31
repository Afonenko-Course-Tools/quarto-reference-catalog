-- Регрессия: context читается на вызове, а не при загрузке native фильтра.
local calls = {}
local function wrap(spec, fn)
  return function(...)
    calls[#calls + 1] = spec
    return fn(...)
  end
end
_G.__course_performance_agent_v1 = {abiVersion=1, metrics={
  wrap_sync=wrap, wrap_walk=wrap, child_env=function(base)return base end,
}}
package.preload['../observability/bridge'] = function() return dofile('_extensions/reference-catalog/observability/bridge.lua') end
for _, name in ipairs({'diagnostics', 'links', 'attributes', 'targets', 'constants', 'generated/reference-styles'}) do
  package.preload['./' .. name] = function() return dofile('_extensions/reference-catalog/lua/' .. name .. '.lua') end
end
local requests = require('_extensions/reference-catalog/lua/requests')
local probes = require('_extensions/reference-catalog/lua/probes')
return {{Pandoc=function(doc)
  local native_quarto = quarto
  local ok, failure = pcall(function()
    quarto = {doc={input_file='one.qmd', is_format=function()return false end}}
    requests[1].Meta(pandoc.Meta{})
    probes[3].Pandoc(doc)
    quarto.doc.input_file = 'two.qmd'
    requests[1].Meta(pandoc.Meta{})
    probes[3].Pandoc(doc)
    quarto.doc.input_file = nil
    requests[1].Meta(pandoc.Meta{})
    probes[3].Pandoc(doc)
    local expected = {'one.qmd', 'one.qmd', 'two.qmd', 'two.qmd', false, false}
    local index = 0
    for _, spec in ipairs(calls) do
      if spec.id == 'reference-catalog.lua.requests.handler.Meta' or spec.id == 'reference-catalog.lua.probes.handler.Pandoc' then
        index = index + 1
        assert((spec.document_id or false) == expected[index], 'Неверный document context вызова ' .. index)
        assert(spec.attributes.extension_id == 'reference-catalog', 'Не передан extension context')
      end
    end
    assert(index == 6, 'Обработчики не наблюдались')
  end)
  quarto = native_quarto
  assert(ok, failure)
  io.stderr:write('PASS native filter context: два документа и отсутствие input_file\n')
  return doc
end}}
