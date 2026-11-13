---@param doc pandoc.Pandoc
---@return pandoc.Pandoc
local function mark(doc)
  doc.blocks:insert(pandoc.Para({ pandoc.Str("AUTHORED_FILTER_PRESERVED") }))
  return doc
end
return { { Pandoc = mark } }
