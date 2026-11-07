-- Один явный bootstrap для независимых native программ тестов.
local M = {}
function M.install()
  ---@type table<string, function>
  local preload = package.preload
  preload['../observability/bridge'] = function()
    return dofile('_extensions/reference-catalog/observability/bridge.lua')
  end
  for _, name in ipairs({'diagnostics', 'links', 'targets', 'constants', 'requests', 'probes', 'generated/reference-styles'}) do
    preload['./' .. name] = function()
      return dofile('_extensions/reference-catalog/lua/' .. name .. '.lua')
    end
  end
end
return M
