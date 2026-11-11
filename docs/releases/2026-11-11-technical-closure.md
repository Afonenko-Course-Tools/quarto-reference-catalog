# Техническое завершение QRC

Локальная партия поверх `6bc556d`, без заявления выпуска. Linker разделяет
проверку авторской ссылки, построение подписи, обновление семантического дерева
и финализацию страницы. Search получает то же дерево с обновлёнными ссылками;
порядок metadata attrs и bytes не нормализуются дополнительно.

Полный набор HTML/search/catalog по-прежнему готовится до первой записи.
Current-only full search, local отсрочка, imported labels и fragment links
сохранены. Тип native probe map задан фактическими строковыми значениями;
null-prototype словарь адресов сохраняется без небезопасного `any` присваивания.

Некорректный JSON ответа Quarto inspect даёт `QRC.CONFIG_INVALID` с реальным
проектом, полем `inspect`, подсказкой и исходным `SyntaxError` в cause. Actual
post-render CLI отклоняет такой ответ до изменения текущего HTML. Foreign tool
ошибки сохраняют exit, оба потока и причину.

Проверены 24 публичных suites, включая prepare-before-write/current-only search,
local/full outputs, imports/exports, HTML boundaries, Body/condition addressing,
metadata order, malformed inspect и native stderr. Filesystem URL в трёх
process fixtures преобразуется через `fromFileUrl`: кириллица в checkout больше
не превращает действительный файл в encoded несуществующий путь.
Полный production quality gate проверяет все 26 собственных TS файлов и один
browser JS, unsafe типы, structural budgets и зависимости без suppressions.
