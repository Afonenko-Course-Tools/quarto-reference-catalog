-- Регрессия: context читается на вызове, а не при загрузке native фильтра.
---@class QrcObservedOperation
---@field id string
---@field document_id? string
---@field attributes? table<string, string|number|boolean>
---@type QrcObservedOperation[]
local calls = {}
---@generic F: function
---@param spec QrcObservedOperation
---@param fn F
---@return F
local function wrap(spec, fn)
  return function(...)
    calls[#calls + 1] = spec
    return fn(...)
  end
end
_G.__course_performance_agent_v1 = {
  abiVersion = 1,
  metrics = {
    wrap_sync = wrap,
    wrap_walk = wrap,
    child_env = function(base)
      return base
    end,
  },
}
require("tests/fixtures/native-modules").install()
local requests = require("./requests")
local probes = require("./probes")
return {
  {
    Pandoc = function(doc)
      -- Это native Pandoc unit: Quarto namespace создаётся тестом целиком.
      local native_quarto = quarto
      local mock = { doc = {
        input_file = "one.qmd",
        is_format = function()
          return false
        end,
      } }
      rawset(_G, "quarto", mock)
      local ok, failure = pcall(function()
        requests[1].Meta(pandoc.Meta({}))
        probes[3].Pandoc(doc)
        mock.doc.input_file = "two.qmd"
        requests[1].Meta(pandoc.Meta({}))
        probes[3].Pandoc(doc)
        rawset(mock.doc, "input_file", nil)
        requests[1].Meta(pandoc.Meta({}))
        probes[3].Pandoc(doc)
        local expected = { "one.qmd", "one.qmd", "two.qmd", "two.qmd", false, false }
        local index = 0
        for _, spec in ipairs(calls) do
          if
            spec.id == "reference-catalog.lua.requests.handler.Meta"
            or spec.id == "reference-catalog.lua.probes.handler.Pandoc"
          then
            index = index + 1
            assert(
              (spec.document_id or false) == expected[index],
              "Неверный document context вызова " .. index
            )
            assert(spec.attributes, "Отсутствуют attributes")
            assert(
              spec.attributes.extension_id == "reference-catalog",
              "Не передан extension context"
            )
          end
        end
        assert(index == 6, "Обработчики не наблюдались")
      end)
      rawset(_G, "quarto", native_quarto)
      assert(ok, failure)
      io.stderr:write(
        "PASS native filter context: два документа и отсутствие input_file\n"
      )
      return doc
    end,
  },
}
