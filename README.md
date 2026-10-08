# Каталог перекрёстных ссылок Quarto

Действующие правила: [индекс спецификаций](spec/index.md) и [контракт QRC](docs/contract.md).
Версия данного ref определяется descriptor; контракт и документация выпуска
читаются из того же тега, что и код. Изменения main после выпущенного тега —
**unreleased**. Минимум — Quarto 1.11.5; при использовании Core требуется CUE 0.17.1.

QRC собирает цели из готовых HTML и Reveal-презентаций, разрешает ссылки между ними и по умолчанию публикует все собственные цели для других проектов. Форматы остаются стандартными `html` и `revealjs`. Расширение не собирает подпроекты и не управляет их размещением. Каталог содержит идентичность и адреса целей; он не включает тела заданий, машинные ключи, семантический граф prerequisites или учёт успеваемости.

## Установка

```sh
quarto add Afonenko-Course-Tools/quarto-reference-catalog@v3.0.0
```

Команды установки из GitHub создают каталоги `_extensions/Afonenko-Course-Tools/…`; пути обработчиков ниже учитывают это пространство имён. Локальная установка из checkout может создавать короткие пути `_extensions/reference-catalog/…` и `_extensions/course-site/…`; такие пути используются в локальных тестах и примерах и должны соответствовать фактическим установленным каталогам.

Установка не добавляет обработчики сборки, ресурсов или предпросмотра. Подключение фильтра активирует только разметку ссылок текущего документа.

## Самостоятельная книга или сайт

```yaml
lang: ru
fail-if-warnings: true
project:
  type: website
  output-dir: _site
  post-render: _extensions/Afonenko-Course-Tools/reference-catalog/entrypoints/post.ts
filters: [reference-catalog]
reference-catalog:
  namespace: book
  publication:
    title: Название курса
```

Ссылку записывают как `@book:sec-introduction` или `{{< xref book sec-introduction >}}`. Для собственной подписи: `{{< xref book sec-introduction "Открыть раздел" >}}`. Идентификаторы целей задаются обычной разметкой Quarto.

Обычные `quarto render chapter.qmd --fail-if-warnings`, `quarto render` и
`quarto preview` используют локальное связывание. `post.ts` получает список
текущих outputs через публичный `QUARTO_PROJECT_OUTPUT_FILES`; поддерживается
и `QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES` для длинного списка. Связываются
только страницы этого запуска. Полный render самостоятельной части также
остаётся локальным: он не подтверждает весь составной курс.

Известные цели текущих страниц и явно импортированных каталогов получают URL.
Для цели без доступных фактов сохраняются подпись и `data-qrc-ref`, добавляется
`data-qrc-deferred="true"`; ссылка пока не имеет `href`. Это относится и к
ссылке на ещё не собранную главу собственного пространства имён. Итог сообщает
количество отложенных ссылок без warning. При следующем вызове каталоги читаются
заново. Сохранённые страницы других глав автоматически не используются для
поиска целей; их факты можно предоставить явным импортом каталога.

Если локальный файл импортируемого каталога ещё не создан или в корректном
сохранённом каталоге пока нет выбранного пространства имён, local откладывает
ссылки. Повреждённый JSON, неверная схема, ошибки конфигурации и HTTP остаются
ошибками. Строгий full отклоняет и отсутствующий файл или пространство имён.

Локальный каталог текущих доступных экспортируемых целей записывается отдельно
в `reference-catalog-local.json`. Он может быть неполным; прежний публичный
`reference-catalog.json` сохраняется. Скрытые пробы целей остаются в локальном
HTML для последующей полной финализации и не попадают в текст поиска.

После сборки полного текущего набора страниц вызывающий код использует
`publish({root, stage, quarto, config, members, outputs, searchIndexes, scope: "full"})`
из `_extensions/reference-catalog/infrastructure/publish.ts`. `outputs` —
обязательные текущие файлы относительно `root` либо абсолютные пути внутри
`stage`, в обоих режимах. API по умолчанию строгий: неизвестная цель или
отсутствующий объявленный экспорт — ошибка. Полная финализация удаляет пробы
и записывает публичный `reference-catalog.json`; сохранённые HTML вне списка
не участвуют в проверке.

## Составная публикация

Опциональное [course-site](https://github.com/Afonenko-Course-Tools/quarto-project-publish)
собирает обычные native проекты и передаёт QRC явные текущие outputs и поисковые
индексы после размещения частей. Репозиторий расширения сохраняет историческое
имя `quarto-project-publish`; установленный payload называется `course-site`.
Установите QRC и явно подключите `filters: [reference-catalog]` с собственным
`reference-catalog.namespace` в каждой части и в корневом проекте. Root и
component hooks указаны в `examples/course`: у частей local `post.ts`, затем
`course-site/entrypoints/collect.ts`; у root — native `course-site` pre/post.

Части размещаются в отдельных mount, например `book`, `lectures`, `practice`.
Полный финализатор получает их пространства имён явно; произвольный HTML не
добавляет новый namespace. Если непосредственный caller использует `portal`,
пространство имён портала берётся из авторской root-конфигурации и проверяется
на конфликт с частями и импортами. QRC не добавляет фильтры в чужую конфигурацию.

## Импорт каталога

```yaml
reference-catalog:
  namespace: book
  imports:
    os:
      source: https://example.org/os/reference-catalog.json
      namespace: book
      base-url: https://example.org/os/
      style: external
```

`source` принимает HTTP(S) URL или путь к JSON относительно корня проекта; `base-url` задаёт адрес опубликованных страниц. Ссылка `@os:sec-memory` использует импортированную цель. Для `source` и опубликованных страниц допустимы разные серверы. В одном вызове финализатора каждый источник загружается один раз. Подписи импортированных целей вставляются как текст: HTML из внешнего JSON не исполняется. Стили: `default`, `number`, `title`, `external`. Название внешней публикации берётся из каталога или из `title` импорта.

Без `exports` экспортируются все собственные цели текущих outputs: в полной
публикации — цели корневой страницы и всех HTML/Reveal-частей, в локальном
каталоге — цели страниц текущего запуска. Перечислять пространства имён и ID
для этого не нужно. Импортированные цели никогда не переэкспортируются.

Явный `exports` ограничивает экспорт: `exports.book: [sec-introduction]`
выбирает указанные ID, `exports.book: "*"` — все собственные цели только
пространства `book`. Пространства имён, не включённые в явный `exports`, не
экспортируются; `exports: {}` отключает экспорт всех целей, а
`exports.book: []` не экспортирует целей этого пространства. Локальные ссылки
продолжают работать независимо от выбора экспорта.

Для перехода на экспорт всех целей удалите прежний блок `exports`.
Выбор экспорта не скрывает опубликованные страницы и не заменяет правила
student/full владельца курса. Публичный каталог — `reference-catalog.json`
в выходном каталоге; локальный — `reference-catalog-local.json`.

## Профили и граница публикации

При составном выпуске QRC работает с результатами текущей попытки координатора
после сборки участников. Экспортируйте только цели выбранного представления;
профили и доступность материалов определяет владелец курса. Импортированный
JSON сообщает адреса, но сам по себе не подтверждает актуальность содержимого
другого курса или его педагогические связи.

Учебные ссылки на задания ведут к каноническому владельцу. QRC не копирует
условия между книгами и не служит транспортом для Print или LMS. Полные правила
местных и внешних целей описаны в [контракте](docs/contract.md).

## Ошибки и исправления

Собственные ошибки имеют стабильные ID `QRC.CONFIG_INVALID`,
`QRC.IMPORT_INVALID`, `QRC.TARGET_DUPLICATE`, `QRC.TARGET_UNKNOWN`,
`QRC.OUTPUT_INVALID`, `QRC.REFERENCE_INVALID`. Сообщение показывает доступные
namespace/ID, выбранный источник, поле и связанные страницы. Страница HTML
обозначается как результат; её позиции не выдаются за строки QMD.
[Справочник диагностики](docs/diagnostics.md) объясняет каждое условие и действие.

Local сообщает отсрочку обычным информационным итогом. Внешний отказ сохраняет
Quarto, exit code, оба потока и исходную причину; HTTP и файл сохраняют выбранный
источник и причину. Успешный процесс с предупреждением в stderr остаётся
успехом. При необходимости автор задаёт `--fail-if-warnings` самому Quarto.

## Проверка

Оба режима читают только явные текущие outputs. Каждая HTML-страница
разбирается один раз; linking и поиск используют одно дерево с итоговыми
подписями ссылок. При повторном вызове читаются новые данные. В full режиме
`searchIndexes: [{path, mount?}]` задаёт текущие индексы; относительные href
переносятся под mount, записи невыбранных HTML удаляются, root search объединяется. При повторяющемся ID текст берётся из первого HTML-элемента.

`COURSE_BUILD_TRACE` принимает абсолютный путь к JSONL-файлу native вызовов.
QRC дописывает `inspect` и `render` с полями `kind`, `executable`, `cwd`, `args`
(только target и `--profile`), `elapsedMs`, `exitCode`. Stdout, stderr и остальные
аргументы не записываются; отказ необязательного журнала не меняет результат.

```sh
quarto run tests/demo-external.ts
quarto run tests/diagnostics.ts
quarto run tests/local-linking.ts
quarto run tests/local-outputs.ts
quarto run tests/local-imports.ts
quarto run tests/native-local.ts
quarto run tests/full-outputs.ts
quarto run tests/search-publication.ts
quarto run tests/boundaries.ts
quarto run tests/export-context.ts
quarto run tests/process-trace.ts
quarto run tests/search.ts
quarto run tests/publication-scan.ts
quarto run tests/imports.ts
quarto run tests/link-styles.ts
quarto run tests/exports.ts
quarto run tests/external.ts
quarto run tests/navigation.ts
quarto run tests/import-safety.ts
quarto run tests/portal.ts
quarto run tests/portal-configured.ts
```

Интеграционные `tests/composition.ts` и `tests/example.ts` используют соседний checkout `../quarto-project-publish`; путь можно задать через `COURSE_SITE_REPO`. Пример дополнительно проверяет JSON через CUE. Браузерный тест: `npm ci && npm run test:browser`.

Стили ссылок определяются только в `_extensions/reference-catalog/vocabulary/reference-styles.json`. Команда `quarto run tools/generate-vocabulary.ts` создаёт статические проекции TypeScript (с литеральным типом), Lua и CUE. Их актуальность проверяет `tests/boundaries.ts`; отдельная проверка — `quarto run tools/generate-vocabulary.ts --check`.

Структурная спецификация конфигурации: каталог `spec/` (`cue vet ./spec`).
Целостность namespace/ID и ссылок проверяется при связывании готовых страниц.
Эти проверки адресации не определяют учебные зависимости, циклы prerequisites
или тематическую карту курса.

Документация: [контракт](docs/contract.md), [архитектура](docs/architecture.md), [диагностика](docs/diagnostics.md).

## Лицензия

[MIT](LICENSE).

## Версии и обновление

Версия определяется descriptor того же Git ref. Устанавливайте точный тег
из команды выше; документация и код выбранного выпуска читаются из одного ref.
Сохраните установленные `_extensions` в Git курса; при обновлении просмотрите diff и выполните проверки курса. Опубликованные
теги неизменяемы: исправления получают новую версию и новый тег.

Корневой состав задаётся `subprojects: [book, lectures, practice]`; путь папки задаёт размещение готового результата. Namespace остаётся в `reference-catalog` каждого проекта. Сайт может сочетать HTML и Revealjs разных документов; QRC получает их текущие native outputs. Каталог содержит адреса, подписи и номера целей, но не импортирует условия из `.task-items` или данные оценивания.

`examples/external` — самостоятельная группа внешнего каталога с явно помеченным вручную составленным снимком адресов официального сайта Quarto. Asset: `external-catalog.tar.gz`. Группа переходов между проектами — `examples/course`, asset `catalog-cross-project.tar.gz`. Обе демонстрации используют full по умолчанию.
