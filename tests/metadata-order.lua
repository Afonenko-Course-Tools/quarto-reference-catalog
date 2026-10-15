local ordered = require('_extensions/reference-catalog/lua/attributes')
return {{Pandoc=function(doc)
 local attrs = {['data-qrc-title']='Название',['data-qrc-style']='default',['data-qrc-id']='sec-a'}
 local list=ordered.sorted(attrs)
 assert(list[1][1]=='data-qrc-id' and list[2][1]=='data-qrc-style' and list[3][1]=='data-qrc-title','Порядок metadata не определён')
 local div=pandoc.Div({pandoc.Para('Текст')},pandoc.Attr('',{'qrc-probe'},list))
 local html=pandoc.write(pandoc.Pandoc({div}),'html',{wrap_text='none'})
 assert(html:find('data%-qrc%-id="sec%-a" data%-qrc%-style="default" data%-qrc%-title="Название"'),'HTML не сохраняет упорядоченный Attr')
 assert(attrs['data-qrc-title']=='Название','Исходная карта изменена')
 io.stderr:write('PASS упорядоченный native Pandoc Attr QRC\n')
 return doc
end}}
