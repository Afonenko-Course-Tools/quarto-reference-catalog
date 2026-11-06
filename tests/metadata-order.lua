-- Native Attr map и реальные QRC callers: имена/значения важны, порядок bytes нет.
package.preload['../observability/bridge'] = function()
  return dofile('_extensions/reference-catalog/observability/bridge.lua')
end
for _, name in ipairs({'diagnostics', 'links', 'targets', 'constants', 'generated/reference-styles'}) do
  package.preload['./' .. name] = function()
    return dofile('_extensions/reference-catalog/lua/' .. name .. '.lua')
  end
end
local links = require('_extensions/reference-catalog/lua/links')
local probes = require('_extensions/reference-catalog/lua/probes')
return {{Pandoc=function(doc)
  local native_quarto = quarto
  local exported = false
  local ok, failure = pcall(function()
    quarto = {
      doc = {input_file='chapter.qmd', is_format=function(format)return format == 'html' end},
      metadata = {get=function(key)return exported and key == 'course-export-context' end},
    }
    local attrs = {['data-qrc-title']='Название & тема', ['data-qrc-style']='default', ['data-qrc-id']='sec-a'}
    local native = pandoc.Attr('', {'qrc-probe'}, attrs)
    for key, value in pairs(attrs) do
      assert(native.attributes[key] == value, 'Native Attr потерял ' .. key)
    end
    assert(attrs['data-qrc-title'] == 'Название & тема', 'Исходная карта изменена')
    local link = links.link('book', 'sec-a', 'default', 'Название & тема')
    assert(link.t == 'Link' and link.target == '#qrc-unresolved' and link.classes:includes('qrc-link'), 'Неверная native ссылка')
    assert(link.attributes['data-qrc-ref'] == 'book:sec-a' and link.attributes['data-qrc-style'] == 'default' and link.attributes['data-qrc-custom'] == 'true', 'Потеряны reference attributes')
    assert(pandoc.utils.stringify(link.content) == 'Название & тема', 'Потеряна авторская подпись')
    exported = true
    local marker = links.link('book', 'sec-a', 'number', '')
    assert(marker.t == 'Span' and marker.classes:includes('qrc-reference'), 'Потерян source-export marker')
    assert(marker.attributes['data-qrc-ref'] == 'book:sec-a' and marker.attributes['data-qrc-style'] == 'number' and marker.attributes['data-qrc-custom'] == 'false', 'Потеряны source-export attributes')
    assert(pandoc.utils.stringify(marker.content) == 'book:sec-a', 'Потеряна исходная подпись')
    local heading = pandoc.Header(1, 'Заголовок & тема', pandoc.Attr('sec-a', {'unnumbered'}))
    local subject = pandoc.Pandoc({heading}, {['reference-catalog']={namespace='book'}})
    probes[1].Meta(subject.meta)
    probes[2].Header(heading)
    probes[3].Pandoc(subject)
    local container = subject.blocks[#subject.blocks]
    assert(container.classes:includes('qrc-probes'), 'Потерян probes container')
    assert(container.attributes['hidden'] == '' and container.attributes['aria-hidden'] == 'true', 'Потеряны hidden/aria attributes')
    assert(container.attributes['data-qrc-namespace'] == 'book' and container.attributes['data-qrc-source'] == 'chapter.qmd', 'Потеряны namespace/source attributes')
    local styles = {}
    for _, row in ipairs(container.content) do
      assert(row.classes:includes('qrc-probe') and row.attributes['data-qrc-id'] == 'sec-a', 'Потеряна target identity')
      local style = row.attributes['data-qrc-style']
      styles[style] = true
      local reference = row.content[1].content[1]
      if style == 'default' then
        assert(row.attributes['data-qrc-title'] == 'Заголовок & тема', 'Потерян heading title')
        assert(reference.t == 'Link' and reference.target == '#sec-a' and pandoc.utils.stringify(reference.content) == 'Заголовок & тема', 'Потеряна native подпись probe')
      elseif style == 'number' then
        assert(reference.t == 'Span' and reference.classes:includes('qrc-unavailable'), 'Ненумерованная цель получила фиктивный номер')
        assert(row.attributes['data-qrc-title'] == nil, 'Number probe получил чужой title')
      else error('Неподдержанный style в probes') end
    end
    assert(styles.default and styles.number, 'Потерян один из native probe styles')
  end)
  quarto = native_quarto
  assert(ok, failure)
  io.stderr:write('PASS native Attr map: QRC links/source-export/probes сохраняют refs, labels и hidden/data-*\n')
  return doc
end}}
