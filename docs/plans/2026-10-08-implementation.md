---
type: plan
component: reference-catalog
status: accepted-next
---

# QRC: план владельца

Статус: подготовка шагов 1–2 выполнена; новое поведение ещё не реализовано. Выполнять пункт 7 и затем
пункты 12–13/17–18 [линейного плана](../../../quarto-course/docs/plans/2026-10-08-course-tools-implementation.md).
[Целевой контракт Core](../../../quarto-course/spec/authoring-model-next.md)
задаёт поля банка/работ/назначений. Quarto 1.11.5 / CUE 0.17.1;
широкую Windows CI matrix не добавлять.

## Изменения, документация и проверки

Сверить существующий `_extensions/reference-catalog/diagnostics.ts`; изменить `_extensions/reference-catalog/domain/{catalog,exports}.ts`, `_extensions/reference-catalog/infrastructure/{config,linker,catalog-validation,catalog-source,publish,import-config,export-config,imports,pages,process}.ts`, `_extensions/reference-catalog/entrypoints/post.ts`, `_extensions/reference-catalog/lua/links.lua`. Pure formatter доступен domain/infrastructure без IO и обратной зависимости. Не импортировать тела заданий и не создавать второй assignment механизм. Сохранить native marker/current outputs, one-pass parse5 и `publish(context)` API; student каталог следует только фактическим публичным outputs, full — текущему полному набору. ID QRC.CONFIG_INVALID/IMPORT_INVALID/TARGET_DUPLICATE/TARGET_UNKNOWN/OUTPUT_INVALID/REFERENCE_INVALID получают достоверные namespace/target/output/file/URL/field; duplicate показывает обе страницы. HTML positions не выдаются за QMD ranges. Local deferral остаётся штатным информационным результатом, unresolved full — ошибкой. Удалить regex warning refusal, сохранить HTTP/IO/CUE/native raw cause и однократный CLI вывод.

Обновить `README.md`, `docs/{contract,architecture}.md`, уточнить существующий `docs/diagnostics.md`, обновить этот план владельца, `examples/course`, `examples/external`; русский lang у самостоятельных проектов, корректные native source-ссылки. Готовые группы: `catalog-cross-project.tar.gz` и `external-catalog.tar.gz` остаются двумя assets одного demo Release.

Проверки: `quarto run tests/<имя>.ts` для `local-linking`, `local-outputs`, `local-imports`, `native-local`, `full-outputs`, `search-publication`, `boundaries`, `process-trace`, `search`, `publication-scan`, `import-safety`, `imports`, `link-styles`, `exports`, `portal`, `portal-configured`, `external`, `navigation`, `composition`, `example`, плюс существующий `export-context` (он уже включён в workflow свежего main). HTTP tests требуют локальных sockets. `COURSE_SITE_REPO=/home/tolya/course-tools/quarto-project-publish` задаёт актуального composition производителя. Browser: `npm ci`, установка Chromium существующим Playwright маршрутом, `npm run test:browser`. Сохранить search corpus и относительные ссылки готовых групп.

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


## Подготовка шагов 1–2 — 8 октября 2026

Общий старт: 02:36 Europe/Minsk; deadline: 11:36 (9 часов). Root назначил
документальной задаче reasoning ultra; модель исполнителя не менялась.

- Рабочая ветка: `feat/authoring-model-20261008`, создана в исходном checkout
  перед сохранением материалов; пользовательский `main` не сбрасывался.
- Preservation commit: `6aa9d3936d113ae5390cc5f680d57cf859a56ccb`. Dirty/untracked планы сохранены до
  включения свежего `origin/main` `d06adf5a30f01eec834dd5f2a34f4e6bd9ec99b7`. Этот upstream соответствует
  опубликованному `v2.2.1` и является предком текущего рабочего дерева.
- [Карта истории, source provenance и восстановление](../history-index.md).
  Полные snapshot/source-state/SHA256 карты сохранены в Git commit
  `63b6dc8ef210f64b9ca94e89a6845e2251cc809e`, затем убраны из active tree после координации.
  Исходники root остались без изменений; локальные и upstream owner планы
  сохранены отдельно с provenance refs.
- Один исходный worktree; существующие local heads не имеют уникальных
  коммитов относительно свежего origin/main. Ветки, теги и Releases сохранены.
- Ignored `deno.lock` (836 bytes) сохранён отдельным историческим снимком.
- CI: Publisher `f2b302e75cd764520ab118894bfb024e787abd31`; demos: QRC `v2.2.1`, Publisher `v4.0.1`.
- README выделяет [текущий индекс](../../spec/index.md) и контракт; `main`
  явно unreleased. Типы/владельцы/status отделяют current и accepted-next.

OPEN PR: автоматический [QRC #5](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/pull/5), head `dependabot/npm_and_yarn/playwright-1.63.0`, SHA `8d88a3272d73f6d868f3c7bd2b6ad84a743081c6`; сохранить при финальной очистке.
Tool Release `v2.2.1` подтверждён свежим `gh release list`, draft/prerelease
false. Демонстрации `demo-20261007-ru1` подтверждены тем же read-only запросом.

Фактическая проверка подготовки: свежий `git fetch origin --prune --tags`,
`gh pr list`, `gh release list`; SHA256 и bytes каждого сохранённого snapshot;
`git diff --check`/`git diff --cached --check`; ancestry `origin/main` и
отсутствие unresolved merge markers; локальные ссылки README/index/контрактов.
Runtime tests и CI здесь не запускались: код импортирован из опубликованного
upstream и не изменён исполнителем. Старые evidence/CI не принимаются за новые
проверки. Свежая runtime матрица принадлежит последующему пункту владельца.

Ruling: свежий upstream уже содержит диагностику 7 октября; дальнейший шаг
проверяет и дополняет реальный код, а не повторяет старый unchecked план.
Конфликтующие owner планы сохранены в обеих версиях; active historical текст
берётся из свежего upstream, а нынешний маршрут — только этот plan/accepted-next.
Цена ошибки — лишняя история, без потери исходных документов.

Ruling: после координации сохранённые historical snapshots и старые owner
plans/probes убраны из active tree; восстановимые SHA/paths указаны в карте истории.
Root и пользовательские worktrees не удалялись. Текущие spec/docs и план 8 октября
сохранены; transferred decisions закреплены в current/accepted-next контрактах.

Блокирующих расхождений для подготовки нет. Baseline ещё содержит Quarto 1.10.x
в workflows; удалить одновременно с runtime/README/examples на пункте владельца.
Следующий шаг ждёт новый текущий Core contract/Body; новые поля не заявлены
поддерживаемыми данным preflight. Merge в shared main, push, CI, release и
публикация не выполнялись.


## Подготовка документации пункта 7 — 8 октября 2026

Документационный исполнитель работает по принятым Core решениям; модель не
менялась. Добавлена [подготовка авторства](../authoring-next.md) `accepted-next`,
ссылки из README и индекса. Существующие current API/контракты не объявлены
мигрированными до проверки runtime. Примеры на этой ветке предназначены для
следующей модели; native ordinary Quarto сохранён вне bank opt-in.

- Свежая проверка: `git diff --check`; 34 локальных Markdown-ссылок
  README/spec/docs/плана/README примеров существуют; 12 авторских YAML
  файлов успешно прочитаны. Проверка исключает generated/dependency деревья.
- Активные примеры не содержат старых kinds exam/handout, solution `for`,
  fixture sentinel/literal текста и Quarto 1.10.x. Русский lang сохраняется,
  публичные native проекты задают `fail-if-warnings: true`.
- Машинные descriptors/workflows и runtime/tests не изменялись этим исполнителем.
  Старые выпущенные dependency/demo/source pins сохранены как baseline;
  **новые release pins ожидают решения о версиях и фактических Releases**.

Full dependent suites/CI/render против меняющегося Core здесь не запускались.
Следующий runtime исполнитель выполняет команды выше, проверяет текущие
student/full outputs и выбранный экспорт, после чего документальная подготовка
переносится в current README/контракт. Merge/push/release/публикация не выполнены.

Ruling: export-context уже подключён в workflow свежего main; публичные native exr/exm/sol примера не объявляют Core bank. Тексты объектов заменены содержательными русскими примерами с сохранением ID целей.
