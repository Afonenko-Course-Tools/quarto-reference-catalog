---@class QrcProbeOperation
---@field id string
---@field document_id? string
---@field attributes? table<string, string|number|boolean>

---@generic F: function
---@param spec QrcProbeOperation
---@param fn F
---@return F
local function wrap(spec, fn)
  return function(...)
    if spec.id == 'reference-catalog.lua.requests.handler.Meta' or spec.id == 'reference-catalog.lua.probes.handler.Pandoc' then
      local destination = os.getenv('QRC_TEST_METRICS')
      assert(destination, 'Не задан путь метрик тестового агента')
      local file = assert(io.open(destination, 'a'))
      file:write(pandoc.json.encode(spec), '\n')
      file:close()
    end
    return fn(...)
  end
end
rawset(_G, '__course_performance_agent_v1', {abiVersion=1, metrics={
  wrap_sync=wrap, wrap_walk=wrap,
  child_env=function(base) return base end,
}})
return {}
