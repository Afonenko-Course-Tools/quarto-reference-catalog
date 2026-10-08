---
type: implementation-report
component: quarto-reference-catalog
status: completed
updated: 2026-10-08
---

# QRC: внедрение 8 октября 2026

Это отчёт проверенных операций. Нормативные правила принадлежат
[текущим спецификациям](../../spec/index.md) того же ref; контракт выпуска
читается по точному immutable тегу.

Выпущен [v3.0.0](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/releases/tag/v3.0.0), source SHA
`559583805a514ae8a244b6ea4cb5124867064024`, immutable Release ID `406387910`.
[PR #15](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/pull/15)
прошёл проверки и слит с сохранением истории; дерево merged main равно tested PR head.
[Main CI](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/actions/runs/37723606361)
завершился SUCCESS на указанном source SHA до публикации.

CI/ready: Publisher `v5.0.0`; QRC `v3.0.0`, Quarto 1.11.5.
Штатный remote-tag `quarto add` прошёл: все **86** установленных
пути и bytes совпали с upstream `_extensions` этого Git object, без overlay
и лишних файлов. Draft assets были скачаны и сверены до immutable публикации.

Native composition/source/export-context/profile/full/search/HTTP/browser проверки прошли. Готовые qrc/external проверены по текущим каталогам и нативным Reveal URL: 18 и 3 действительные QRC ссылки соответственно.

Готовые группы выпущены в отдельном immutable
[demo-20261008](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/releases/tag/demo-20261008)
на том же producer SHA; `BUILD.sourceDirty:false`. Native build, HTML, resources,
sourceLinks и actual outputs прошли; полный ready map совпал с downloaded archive.

| Группа | Asset | Файлов | Archive SHA-256 |
| --- | --- | ---: | --- |
| qrc | `catalog-cross-project.tar.gz` | 188 | `7052934f30ecfd08bbe70b028cf4ee2c21db13e142c30590e50f889f945e2b53` |
| external | `external-catalog.tar.gz` | 20 | `eb7509fdb50340d1dea7c73b233001082e926a2688d4337f3aaac7e844124795` |

Native sourceRef — собственный tool tag, catalog source — demo tag; оба
указывают на тот же source SHA. Старые immutable tags/assets сохранены.

Нативный Windows прогон не заявляется. Узкие path/CUE-TEMP исправления Core 4.0.0
подтверждены fixtures; чужие warning streams сохраняются с фактическим exit.
Подробные receipts и общий результат — [центральный отчёт Core](https://github.com/Afonenko-Course-Tools/quarto-course/blob/main/docs/releases/2026-10-08-implementation.md).

Первый сохранённый owner history checkpoint: `1f7c89f31aa0878a6057a1edd24863eec7448f14`.
Шаг 17 выполнен; actual before/after receipt: `5 LOCAL / 1 REMOTE; main, all tags/Releases, serving gh-pages и API-confirmed OPEN bot heads сохранены`.
Более поздний docs/history main не переименовывает опубликованный source SHA.

Восстановление финальных снимков: [SOURCE-MAP](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/blob/1f7c89f31aa0878a6057a1edd24863eec7448f14/docs/history/2026-10-08-completion/SOURCE-MAP.json). После проверки exact Git blobs только этот новый датированный snapshot-каталог удаляется из active docs; архивный commit остаётся reachable. Последние планы и cleanup receipts: [Git checkpoint](https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/blob/a98e9362e68d4bd8f81129e25610928d96183630/docs/history/2026-10-08-completion/final-journals/2026-10-08-implementation.md); [общая квитанция](https://github.com/Afonenko-Course-Tools/quarto-course/blob/35ab45a60d3859c4aa584499e4a49c5b8b6f14bf/docs/history/2026-10-08-completion/final-cleanup/03-verified-cleanup.json).
