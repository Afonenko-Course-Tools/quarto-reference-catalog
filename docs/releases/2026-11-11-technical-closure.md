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

Восьмишаговая фактическая Java/SP проверка выявила прежнюю cold/warm разницу в
обоих refs: local находил retained sibling catalog и добавлял `rel=external`,
full менял href на текущий внутренний, сохраняя устаревшую decoration. QRC теперь
отмечает только собственный добавленный rel в local HTML, удаляет его при
internal/full/deferred переходе и сохраняет авторские `external`, `noopener`,
`author`. Текущий style заново определяет собственные class/CSS; замена своих
script/style удаляет также ровно свой добавленный separator. Весь результат
по-прежнему подготовлен до записи, нового параметра или JSON schema нет.

Public producer→catalog→local→full regression проверяет actual retained catalog,
rich labels, авторские rel, повторную обработку, исчезновение импорта и одинаковые
cold/warm bytes на одной разметке. Старый frozen source на этой проверке
отказывает по фактическому rel-контракту. Девять адресных suites, полный quality
и независимая рецензия прошли. Две новые реальные SP сборки дали одинаковый полный
DOM всех 33 HTML; 27 ZIP, catalog/search и остальные assets побайтно сохранены.

Hosted отказ `native-local.ts` оказался прежним ожиданием: fixture выдавал
некорректный JSON как будто неизвестное исключение. Проверка теперь ожидает
адресный `QRC.CONFIG_INVALID` без native stack, сохраняя отдельный настоящий
TypeError/stack sentinel. Исправленный suite прошёл на Quarto 1.11.5 и 1.12.1;
production-код диагностики для этого не ослаблялся.
