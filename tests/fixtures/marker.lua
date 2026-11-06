---@param doc pandoc.Pandoc
---@return pandoc.Pandoc
function Pandoc(doc)
  doc.blocks:insert(pandoc.Para({pandoc.Str("AUTHORED_FILTER_PRESERVED")}))
  return doc
end
