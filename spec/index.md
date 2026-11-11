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
| [Авторская конфигурация](../_extensions/reference-catalog/infrastructure/config.ts) | contract/schema | reference-catalog | current |
| [Исполняемый контракт каталога](../_extensions/reference-catalog/infrastructure/catalog-validation.ts) | contract/schema | reference-catalog | current |
| [Стили ссылок](../_extensions/reference-catalog/vocabulary/reference-styles.json) | vocabulary | reference-catalog | current |
| [Проверка поддерживаемого кода](../docs/typechecking.md) | reference | reference-catalog | current |
| [Архитектура](../docs/architecture.md) | architecture | reference-catalog | current |
| [Диагностика](../docs/diagnostics.md) | reference | reference-catalog | current |
| [Авторская модель Core](../../quarto-course/spec/index.md) | specification/index | course-core | current |
| [Результат реализации](../docs/releases/2026-10-08-implementation.md) | implementation-report | reference-catalog | historical |
| [Карта сохранённой истории](../docs/history-index.md) | history-index | reference-catalog | current |

QRC владеет namespace/imports/exports, адресацией, local/full связыванием и каталогом текущих outputs. Publisher владеет составом; Core — банком, работами, назначениями и Body. QRC не переносит тела заданий.

Версия пакета определяется [descriptor](../_extensions/reference-catalog/_extension.yml) того же Git ref.
Целевой Quarto — 1.11.5; исполняемые контракты локальные TypeScript.
Target/Catalog/Import/Exports выводятся из фактических validators и projection импорта;
отдельной JSON-схемы и внешнего schema validator нет.
Изменения main после выпущенного тега — **unreleased**.
Документация установленного выпуска читается из того же immutable tag, что и код.

В 3.1.1 фасады наблюдения сохраняют ABI 1 и добавляют `attributes.extension_id`.
Необязательный контекст документа берётся из публичного `quarto.doc.input_file`
в обработчиках Lua `requests`/`probes` и из явного output path в `readPage`;
пакетный `publish` сохраняет общий контекст. Только активный контекст агента
использует полный снимок окружения через `childEnv` и `clearEnv: true`.
Identity/off/недоступный режим/отсутствующий агент сохраняют прежние env overrides,
наследование и разрешения. Поведение авторской конфигурации, JSON каталога и словаря стилей сохраняется;
нового общего runtime нет.
Историческая матрица ABI 1 не задаёт текущие component pins.
CI использует прямые Git submodules из `tests/dependencies`; фактические HEAD
попадают в журнал проверки. Интеграционный Site checkout не является runtime
зависимостью QRC. Полное семантическое покрытие и прохождение проверок этим
описанием не заявляются.
