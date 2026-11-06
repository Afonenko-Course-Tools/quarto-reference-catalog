---@meta

-- Только дополнение отсутствующих сведений штатных Quarto lua-types.
-- Методы, конструкторы и классы берутся из исходной библиотеки.
---@class QrcPandocNamespace
pandoc = {}

---@class pandoc.Inline
---@field walk fun(self: pandoc.Inline, filter: table<string, function>): pandoc.Inline

-- Союзы ссылаются на исходные классы библиотеки, без копирования полей узлов.
---@alias QrcInline pandoc.Cite|pandoc.Code|pandoc.Emph|pandoc.Image|pandoc.LineBreak|pandoc.Link|pandoc.Math|pandoc.Note|pandoc.Quoted|pandoc.RawInline|pandoc.SmallCaps|pandoc.SoftBreak|pandoc.Space|pandoc.Span|pandoc.Str|pandoc.Strikeout|pandoc.Strong|pandoc.Subscript|pandoc.Superscript|pandoc.Underline
---@alias QrcBlock pandoc.BlockQuote|pandoc.BulletList|pandoc.CodeBlock|pandoc.DefinitionList|pandoc.Div|pandoc.Header|pandoc.HorizontalRule|pandoc.LineBlock|pandoc.OrderedList|pandoc.Para|pandoc.Plain|pandoc.RawBlock|pandoc.Table|pandoc.Figure
