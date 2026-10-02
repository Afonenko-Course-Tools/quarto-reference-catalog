# Каталог перекрёстных ссылок Quarto

QRC собирает цели из готовых HTML и Reveal-презентаций, разрешает ссылки между ними и публикует явно выбранные цели для других проектов. Форматы остаются стандартными `html` и `revealjs`. Расширение не собирает подпроекты и не управляет их размещением.

## Установка

```sh
quarto add Afonenko-Course-Tools/quarto-reference-catalog
```

Команды установки из GitHub создают каталоги `_extensions/Afonenko-Course-Tools/…`; пути обработчиков ниже учитывают это пространство имён. Локальная установка из checkout может создавать короткие пути `_extensions/reference-catalog/…` и `_extensions/project-publish/…`; такие пути используются в локальных тестах и примерах и должны соответствовать фактическим установленным каталогам.

Установка не добавляет обработчики сборки, ресурсов или предпросмотра. Подключение фильтра активирует только разметку ссылок текущего документа.

## Самостоятельная книга или сайт

```yaml
project:
  type: website
  output-dir: _site
  post-render: _extensions/Afonenko-Course-Tools/reference-catalog/entrypoints/post.ts
filters: [reference-catalog]
reference-catalog:
  namespace: book
  publication:
    title: Название курса
  exports:
    book: [sec-introduction]
```

Ссылку записывают как `@book:sec-introduction` или `{{< xref book sec-introduction >}}`. Для собственной подписи: `{{< xref book sec-introduction "Открыть раздел" >}}`. Идентификаторы целей задаются обычной разметкой Quarto.

## Составная публикация

Книгу, лекции, практику и PDF собирает независимый [project-publish](https://github.com/Afonenko-Course-Tools/quarto-project-publish). Подключите там `integrations: [_extensions/Afonenko-Course-Tools/reference-catalog/entrypoints/publication.ts]`. Координатор передаст фильтры каждому HTML-проекту и вызовет QRC после объединения результатов. QRC не нужен проектам, в которых нет межпроектных ссылок. Пример — `examples/course`.

В управляемом режиме `project-publish.portal: index.qmd` корневую страницу собирает координатор в отдельный результат текущей попытки. Её пространство имён задаётся авторской конфигурацией `reference-catalog.namespace`, например `site`; оно не должно совпадать с пространством имён участника или псевдонимом импорта. При подключённом портале `exports.site: [sec-introduction]` может явно публиковать цели корневой страницы наряду с целями HTML-участников. Без фактического портала эта настройка не добавляет локальное пространство имён в составную публикацию. Произвольные HTML-файлы результата тоже не расширяют список разрешённых пространств имён.

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

`source` принимает HTTP(S) URL или путь к JSON относительно корня проекта; `base-url` задаёт адрес опубликованных страниц. Ссылка `@os:sec-memory` использует импортированную цель. Для `source` и опубликованных страниц допустимы разные серверы. В одной сборке каждый источник загружается один раз. Подписи импортированных целей вставляются как текст: HTML из внешнего JSON не исполняется. Стили: `default`, `number`, `title`, `external`. Название внешней публикации берётся из каталога или из `title` импорта.

Без `exports` внешний каталог пуст. `exports.book: "*"` разрешает экспорт всех собственных целей пространства `book`. Импортированные цели никогда не переэкспортируются. Каталог — `reference-catalog.json` в выходном каталоге.

## Проверка

```sh
quarto run tests/boundaries.ts
quarto run tests/imports.ts
quarto run tests/link-styles.ts
quarto run tests/exports.ts
quarto run tests/external.ts
quarto run tests/navigation.ts
quarto run tests/import-safety.ts
quarto run tests/portal.ts
```

Интеграционные `tests/composition.ts` и `tests/example.ts` используют соседний checkout `../quarto-project-publish`; путь можно задать через `PROJECT_PUBLISH_REPO`. Пример дополнительно проверяет JSON через CUE. Браузерный тест: `npm ci && npm run test:browser`.

Стили ссылок определяются только в `_extensions/reference-catalog/vocabulary/reference-styles.json`. Команда `quarto run tools/generate-vocabulary.ts` создаёт статические проекции TypeScript (с литеральным типом), Lua и CUE. Их актуальность проверяет `tests/boundaries.ts`; отдельная проверка — `quarto run tools/generate-vocabulary.ts --check`.

Структурная спецификация конфигурации: каталог `spec/` (`cue vet ./spec`); графовые ограничения проверяются при связывании готовых страниц.

Документация: [контракт](docs/contract.md), [архитектура](docs/architecture.md).
