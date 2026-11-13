std = "lua54"
jobs = 1
codes = true
max_line_length = false
-- Публичные read-only globals среды Pandoc/Quarto; опечатки не разрешаются.
read_globals = {
  "pandoc",
  "quarto",
  "PANDOC_STATE",
  "PANDOC_SCRIPT_FILE",
  "PANDOC_WRITER_OPTIONS",
  "FORMAT",
  "PANDOC_VERSION",
  "PANDOC_API_VERSION",
}
-- Декларация LuaLS задаёт форму публичного pandoc.Attr без запуска runtime.
files["typecheck/native.d.lua"] = { globals = { "pandoc" } }
