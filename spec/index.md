---
type: index
component: reference-catalog
status: current
---

# Спецификации QRC

`current` описывает контракт данного Git ref; `accepted-next` — согласованное
будущее изменение, ещё не заявленное реализованным. `historical` сохраняет
provenance и не задаёт активных требований. `type` различает contract/schema/API,
vocabulary, architecture, reference и plan; `component` указывает владельца.

| Документ | type | component | status |
| --- | --- | --- | --- |
| [Подготовка авторства](../docs/authoring-next.md) | authoring-guide | reference-catalog | accepted-next |
| [Контракт QRC](../docs/contract.md) | contract | reference-catalog | current |
| [Авторская конфигурация](config.cue) | contract/schema | reference-catalog | current |
| [JSON каталога](../schemas/catalog.schema.json) | contract/schema | reference-catalog | current |
| [Стили ссылок](../_extensions/reference-catalog/vocabulary/reference-styles.json) | vocabulary | reference-catalog | current |
| [Архитектура](../docs/architecture.md) | architecture | reference-catalog | current |
| [Диагностика](../docs/diagnostics.md) | reference | reference-catalog | current |
| [Целевой authoring contract Core](../../quarto-course/spec/authoring-model-next.md) | contract | core | accepted-next |
| [План владельца](../docs/plans/2026-10-08-implementation.md) | plan | reference-catalog | accepted-next |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | reference-catalog | current |

QRC владеет namespace/imports/exports, адресацией, local/full связыванием и каталогом текущих outputs. Publisher владеет составом; Core — банком, работами, назначениями и Body. QRC не переносит тела заданий.

Версия пакета определяется только
[`_extension.yml`](../_extensions/reference-catalog/_extension.yml) **того же Git ref**.
Последний проверенный опубликованный tool tag — `v2.2.1`; его descriptor
содержит `2.2.1`. `main` до нового выпуска — **unreleased**, даже если
число в descriptor пока совпадает с предыдущим выпуском. Документация выпуска
читается из того же immutable tag, рабочий план не заменяет контракт этого tag.

Новая модель банка/assignments и минимум Quarto 1.11.5 / CUE 0.17.1 принимаются
по `accepted-next` одновременно с кодом, fixtures, README и выпуском владельца.
Этот индекс сам по себе не включает новый синтаксис. Существующие машинные
дескрипторы/workflow baseline пока сохраняются до соответствующего runtime шага.
