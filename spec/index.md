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
| [Контракт QRC](../docs/contract.md) | contract | reference-catalog | current |
| [Авторская конфигурация](config.cue) | contract/schema | reference-catalog | current |
| [JSON каталога](../schemas/catalog.schema.json) | contract/schema | reference-catalog | current |
| [Стили ссылок](../_extensions/reference-catalog/vocabulary/reference-styles.json) | vocabulary | reference-catalog | current |
| [Архитектура](../docs/architecture.md) | architecture | reference-catalog | current |
| [Диагностика](../docs/diagnostics.md) | reference | reference-catalog | current |
| [Авторская модель Core](../../quarto-course/spec/index.md) | specification/index | course-core | current |
| [Результат реализации](../docs/releases/2026-10-08-implementation.md) | implementation-report | reference-catalog | historical |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | reference-catalog | current |

QRC владеет namespace/imports/exports, адресацией, local/full связыванием и каталогом текущих outputs. Publisher владеет составом; Core — банком, работами, назначениями и Body. QRC не переносит тела заданий.

Версия пакета определяется [descriptor](../_extensions/reference-catalog/_extension.yml) того же Git ref.
Quarto 1.11.5 и CUE 0.17.1 согласованы с текущими правилами Core.
Изменения main после выпущенного тега — **unreleased**.
Документация установленного выпуска читается из того же immutable tag, что и код.
