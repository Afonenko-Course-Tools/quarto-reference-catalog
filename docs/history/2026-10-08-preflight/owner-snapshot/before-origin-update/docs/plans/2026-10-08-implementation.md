# QRC: план владельца

Статус: следующий этап, реализация не начата. Выполнять пункт 7 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md)
задаёт поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

Создать `_extensions/reference-catalog/diagnostics.ts`; изменить `_extensions/reference-catalog/domain/{catalog,exports}.ts`, `_extensions/reference-catalog/infrastructure/{config,linker,catalog-validation,catalog-source,publish,import-config,export-config,imports,pages,process}.ts`, `_extensions/reference-catalog/entrypoints/post.ts`, `_extensions/reference-catalog/lua/links.lua`. Pure formatter доступен domain/infrastructure без IO и обратной зависимости. Не импортировать тела заданий и не создавать второй assignment механизм. Сохранить native marker/current outputs, one-pass parse5 и `publish(context)` API; student каталог следует только фактическим публичным outputs, full — текущему полному набору. ID QRC.CONFIG_INVALID/IMPORT_INVALID/TARGET_DUPLICATE/TARGET_UNKNOWN/OUTPUT_INVALID/REFERENCE_INVALID получают достоверные namespace/target/output/file/URL/field; duplicate показывает обе страницы. HTML positions не выдаются за QMD ranges. Local deferral остаётся штатным информационным результатом, unresolved full — ошибкой. Удалить regex warning refusal, сохранить HTTP/IO/CUE/native raw cause и однократный CLI вывод.

Обновить `README.md`, `docs/{contract,architecture}.md`, создать `docs/diagnostics.md`, обновить `docs/plans/course-reference-plan.md`, `examples/course`, `examples/external`; русский lang у самостоятельных проектов, корректные native source-ссылки. Готовые группы: `catalog-cross-project.tar.gz` и `external-catalog.tar.gz` остаются двумя assets одного demo Release.

Проверки: `quarto run tests/<имя>.ts` для `local-linking`, `local-outputs`, `local-imports`, `native-local`, `full-outputs`, `search-publication`, `boundaries`, `process-trace`, `search`, `publication-scan`, `import-safety`, `imports`, `link-styles`, `exports`, `portal`, `portal-configured`, `external`, `navigation`, `composition`, `example`, плюс существующий `export-context` (его пока нет в workflow). HTTP tests требуют локальных sockets. `COURSE_SITE_REPO=/home/tolya/course-tools/quarto-project-publish` задаёт актуального composition производителя. Browser: `npm ci`, установка Chromium существующим Playwright маршрутом, `npm run test:browser`. Сохранить search corpus и относительные ссылки готовых групп.

## Завершение

Оформить актуальный индекс спецификаций, README и собственный справочник
диагностик; примеры показывают правильную русскую авторскую разметку.
Старые plans/probes сохранить в Git до удаления из активной ветки.

Сверить свежие required checks и owner PR, слить в main и проверить merged SHA.
Выпустить новую версию с точными уже выпущенными зависимостями; готовую группу
демо, если она есть, выпускать отдельным проверенным asset. Старые Releases
не заменять. Финальная очистка веток только после общего маршрута:
main + служебная gh-pages, если используется, + heads OPEN automatic PR.
Здесь сохранить commit/PR/tag/SHA, фактические проверки и ссылки на готовые assets.
