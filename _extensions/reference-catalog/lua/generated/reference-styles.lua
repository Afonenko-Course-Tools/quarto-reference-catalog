local __metrics=require("../../observability/bridge").create_metrics("reference-catalog",1)

local function __perfFilters(filters)
 for key,value in pairs(filters) do
  if type(value)=='function' then filters[key]=__metrics.wrap_sync({id="reference-catalog.lua.generated.reference-styles.handler."..tostring(key),kind=key=='Pandoc' and 'phase' or 'function'},value)
  elseif type(value)=='table' and type(key)=='number' then filters[key]=__perfFilters(value) end
 end
 return filters
end
-- Создано tools/generate-vocabulary.ts из vocabulary/reference-styles.json. Не редактировать вручную.
return __perfFilters({
  ["default"] = true,
  ["number"] = true,
  ["title"] = true,
  ["external"] = true,
})
