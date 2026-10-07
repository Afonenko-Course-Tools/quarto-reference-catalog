# Каталог ссылок в обновлённой архитектуре курса

План интеграции репозитория `quarto-reference-catalog` с обновлёнными потребителями. Каталог остаётся адресным механизмом переходов между материалами; тела заданий и оценивание относятся к модели курса и адаптерам.

Общие решения, ограничения и порядок выпуска: [межрепозиторный план](../../../specs/course-change-plan.md). Перед изменением поведения — анализ актуальной архитектуры и необходимый рефакторинг. Поддерживается только актуальный авторский формат без обратной совместимости; публичные функции Quarto переиспользуются. Код, спецификации, README и примеры обновляются согласованно в соответствующем PR.

## Изменения и границы

- [ ] На актуальной ветке сверить публичные API каталога и их потребителей; определить необходимый рефакторинг до изменений.
- [ ] Сохранить раздельный смысл namespace, ID цели, идентичности курса и пути публикации. Путь подпроекта задаёт размещение, без отдельного `mount`.
- [ ] Проверять итоговые ссылки с учётом эффективного формата документа и префикса сайта; PDF и платформенный экспорт используют свой маршрут.
- [ ] Передавать HTML, ресурсы и QRC одной ревизии и проекции. Student-каталог отражает публичный состав, full-каталог — локальный полный состав.
- [ ] Согласовать адресные переходы с Presentation: раскрывается целевая цепочка, остальное состояние сохраняется.
- [ ] Сохранить локальные внутренние переходы готовой демонстрации. Явные внешние импорты при локальном preview могут вести в закреплённую публичную публикацию.
- [ ] Соблюсти границу адресного каталога: QRC не импортирует тела упражнений и не создаёт второй механизм назначения.
- [ ] Вместе с кодом обновить `docs/contract.md`, `docs/architecture.md`, README, спецификации и демонстрации в затронутом объёме.

Проверки: переходы внутри книги и между подпроектами; раскрытие скрытой цели в слайдах; исключённая контрольная в student; согласованность каталога с текущим выходным деревом; сохранение относительных внутренних ссылок при локальном просмотре готового результата.

Связанные потребители: [составная публикация](../../../quarto-project-publish/spec/plans/course-composition-plan.md), [презентация](../../../quarto-course/docs/plans/course-presentation-plan.md), [документация](../../../quarto-template-course/docs/plans/course-documentation-plan.md).


## Архитектура и результат 6–7 октября 2026

Актуальная база `v2.1.0` (`667a121`) уже принимает явные текущие native outputs, не обходит retained HTML, разбирает каждую страницу один раз и переиспользует дерево в поиске. Local сохраняет probes и откладывает соседние ссылки; full разрешает общий текущий корпус строго. Дополнительный HTML-парсер или импорт тел заданий не нужен.

- [x] Подтверждены public publish/local/full и потребитель course-site; runtime overlay отсутствует.
- [x] Пример и интеграционный composition-test используют корневой subprojects без прежней формы.
- [x] Документация разделяет namespace, размещение и экспортную идентичность; task-items остаётся Core-назначением.
- [x] Нативный nested website с HTML/Reveal и PDF-first selection проверяет circular links и общий текущий каталог без повторного body render.
- [x] Закончить локальную QRC матрицу (HTTP-тесты требуют локальных sockets), проверку демонстрации и согласованный review/CI перед выпуском.

Необходимую передачу native web-capability выполняет course-site; JSON-контракт и публичные относительные адреса сохраняются. В служебном полном исходном экспорте QRC теперь сохраняет нейтральный native Span до отбора работы (course-export-context через публичный quarto.metadata.get). Нерелевантная ссылка не блокирует исходную книгу; выбранный body producer разрешает её либо диагностирует явно, без фиктивного href. Native тест export-context прошёл RED→GREEN. Push и release не выполнялись.

Группы: examples/course → catalog-cross-project.tar.gz, examples/external → external-catalog.tar.gz. Обе full по умолчанию. Внешняя группа содержит явно помеченный вручную составленный адресный снимок официальной документации Quarto, с проверенным живым адресом Overview. Версия кандидата 2.2.0. Локально прошли example/schema/161links, composition profiles, local/full/import/search/portal и Chromium disclosure tests.

### Source-only исправление демонстрации после выпуска 2.2.0

Ready-проверка выявила lecture image через ../../assets за границей native lectures проекта. Корневой SVG перенесён в lectures/assets, ссылка из 01/memory.qmd — ../assets/dot.svg. Book уже владеет своим book/assets; других изображений с выходом за native проект нет. Example regression теперь проверяет native и mounted ownership изображения и generic data-src Revealjs, ранее отсутствовавший в href/src проверке. RED воспроизвёл source escape; GREEN: 162local links, CUE catalog и все anchors. Ссылки исходных QMD обеих групп указывают на demo-20261007; runtime2.2.0 не меняется. Чистая pinned-tag Task сборка выполняется из этого source-only candidate; окончательный ready archive rebuild — из mergedSHA перед demo release.

Чистый git-archive candidate c0fbdfa проверен реальными task install/task render на опубликованных QRCv2.2.0+Publisherv4.0.0 и Quarto1.11.5. BUILD.json подтверждает commit/sourceDirty:false/pins; native lectures/_site и mounted _site/lectures содержат assets/dot.svg по ../assets/dot.svg. Template ready validator прошёл search+162local links/8HTML. Полный tagged build log и источник находятся в local-evidence/implementation-2026-10-06/qrc-demo-source-fix; финальные обе группы надо перестроить из будущего mergedSHA перед demo release. Дополнительно исправлено nullable сужение ids в затронутом example тесте; его typecheck и diff check проходят.


### Выпуск и проверка 7 октября

PR 12 слит после локальной матрицы и CI 1.10.18/1.11.5; неизменяемый v2.2.0
опубликован из 1078c489a3843aefdb6f73fe0817395819556f03. Отдельный source-only
PR 13 исправил ресурс native lecture проекта и закрепил source links на
независимый demo tag; runtime расширения не менялся. После обеих успешных CI
проверок PR 13 слит в b25c1d2933767041adb7171ed037c10c5e7f43e7. Обе группы
перестроены из этого чистого SHA с опубликованными тегами. В одном неизменяемом
demo-20261007 размещены catalog-cross-project.tar.gz (162 ссылки/8 HTML) и
external-catalog.tar.gz (15 ссылок/1 HTML), BUILD и RELEASE provenance. Все assets
скачаны и побайтно проверены в draft до публикации; потребитель Task получил
обе группы. Следующий шаг — финальная локальная проверка документации и курса.

## План рефакторинга диагностики 7 октября 2026

**Цель:** ошибка QRC указывает namespace/ID и страницу, сохраняя внешний отказ.
**Архитектура:** native marker → current pages/imports → parse5 → resolve →
write/search/catalog. **Основание:** [общий план](../../../specs/course-change-plan.md#исследование-и-план-рефакторинга-7-октября-2026).
**Средства:** существующие Lua/Deno/parse5/Quarto; никакого дополнительного
парсера, source-map или error runtime. Для выполнения — subagent-driven-development
либо executing-plans по выбранному способу. База main `b25c1d2`.
`publish(context: CatalogPublication) → Promise<void>` и marker API сохраняются.

### R1 Именованные ошибки и достоверный контекст

Создать: `_extensions/reference-catalog/diagnostics.ts` с чистой локальной
`diagnostic(code, message, context?, cause?) → Error & {code:string}`.
Изменить: `infrastructure/config.ts`, `domain/catalog.ts`, `infrastructure/linker.ts`,
`catalog-validation.ts`, `catalog-source.ts`, `publish.ts`, `lua/links.lua`.
Также modify `infrastructure/import-config.ts`, `infrastructure/export-config.ts`,
`infrastructure/imports.ts`, `domain/exports.ts`, `infrastructure/pages.ts`:
здесь находятся guards импорта/namespace/JSON, declared exports и native probes.
Сокращённые runtime-пути относятся к `_extensions/reference-catalog/`;
после infrastructure/ сокращаются только файлы того же слоя.
Pure formatter не импортирует IO и доступен domain/infrastructure без
обратной зависимости domain от infrastructure.
Новые ID прежних неименованных guards: `QRC.CONFIG_INVALID`,
`QRC.IMPORT_INVALID`, `QRC.TARGET_DUPLICATE`, `QRC.TARGET_UNKNOWN`,
`QRC.OUTPUT_INVALID`, `QRC.REFERENCE_INVALID`.

- [x] В local-linking/full-outputs/imports/local-imports закрепить ID и
  namespace/target/output. Duplicate показывает обе output страницы; invalid
  import — выбранный URL/file и field, но не строку временной схемы как QMD.
- [x] Оформить текущие guards по-русски без изменения predicates, resolver
  или HTML parsing. Parse5 positions, если показываются, явно относятся к HTML.
- [x] Сохранить local deferral как нынешний информационный результат;
  full unresolved target остаётся ошибкой. Не переименовывать deferral в warning.
- [x] Выполнить каждую названную проверку через `quarto run tests/<имя>.ts`;
  плюс export-context и boundaries. Ожидается PASS. Проверка изменений и коммит.

### R2 Внешние причины, process policy и CLI

Изменить: `infrastructure/process.ts`, `catalog-source.ts`, `entrypoints/post.ts`;
tests: `tests/process-trace.ts`, `native-local.ts`, `import-safety.ts`.
Существующая сигнатура native wrapper сохраняется; failure определяется exit,
HTTP/IO refusal, без regex `WARNING|WARN:` и semantic-разбора stderr.

- [x] Fake native process: exit 0 + предупреждение остаётся успехом, nonzero
  сохраняет tool/exit/оба потока. Local HTTP/file failure сохраняет cause;
  чужой ID виден, собственная подсказка не заменяет исходную диагностику.
- [x] Удалить regex warning refusal, сохранить stderr при успехе и native trace.
  Авторский strict render определяется Quarto/Pandoc, не новым QRC режимом.
- [x] Hook печатает ожидаемые именованные ошибки однократно; неизвестные
  exceptions оставляет native stack. Не добавлять общей сериализации отчётов.
- [x] Выполнить process-trace/native-local/import-safety; проверить standalone
  QRC и вызов Publisher через прежний publish API. Проверка изменений и коммит.

### R3 Документация, группы и конечная проверка

Создать: `docs/diagnostics.md`; изменить: README, `docs/contract.md`,
`docs/architecture.md`, активные guides, `examples/course` и `examples/external`.

- [x] Русские объяснения source/input/output, local/full, namespace и действий
  по ID; только корректные QMD. В независимых проектах lang ru задаётся отдельно.
  Для HTML использовать native source/repo/code-links без одинаковых дублей;
  Reveal оставляет обычную ссылку на QMD/группу.
- [x] Выполнить существующую Quarto/browser матрицу: ссылки, imports, экспорт,
  поиск, full/current outputs. Не включать sample learning text в central search,
  не менять локальный base-url контракт уже выпущенных ready groups.
- [ ] Проверка изменений, PR, новый tool release при runtime changes и новые две demo
  группы из проверенного merged SHA; immutable assets и consumer pins отдельно.

### Локальная реализация кандидата

R1/R2 и локальная часть R3 выполнены. Проверены все 23 TypeScript-сценария
на Quarto 1.10.18 и 1.11.5, существующий Chromium suite на обеих версиях,
CUE v0.17.1, проекции словаря и типы изменённых модулей. Пример курса проверяет
162 локальные ссылки и все anchors; внешний пример проверяет `lang: ru`,
штатное source-действие, точный QMD и прежние три внешние ссылки.

Первичная усиленная проверка source-действия на Quarto 1.10.18 обнаружила
его штатную скрытую мобильную копию в книге. Проверка теперь различает одну
основную ссылку и адаптивную копию; ручные дубли в QMD удалены. Интеграции
выполнены с неизменяемым Publisher v4.0.0; совместная проверка новых кандидатов,
новые версии, PR и новые готовые группы относятся к координатору выпуска.
