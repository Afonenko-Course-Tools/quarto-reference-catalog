# Книга и две презентации

Пример использует native root website и опциональный course-site, поставляемый
репозиторием quarto-project-publish. Установка задаётся тегами; hooks используют GitHub namespace Afonenko-Course-Tools.

```sh
task install
task render
```

Hooks уже используют `_extensions/Afonenko-Course-Tools/…`. Каждая часть явно подключает QRC и свой
namespace. Root index.qmd остаётся обычной главной страницей; книга, лекции и
практика перечисляются в `subprojects` и размещаются по путям `book`, `lectures`, `practice`. Двусторонние ссылки
строго разрешаются после успешной полной native сборки. Самостоятельный
`quarto render chapter.qmd` внутри части использует local связывание.

Ресурсы книги и лекций лежат внутри своих native проектов: `book/assets/`
и `lectures/assets/`. Относительная ссылка из вложенной страницы использует
`../assets/…`, поэтому ресурс попадает и в отдельный output части, и в её mount.
Исходные QMD обеих демонстрационных групп закреплены тегом `demo-20261007`.

Блок `reference-catalog.exports` не нужен: каталог включает все собственные
цели текущих страниц корня, книги, лекций и практики по умолчанию.

`task render` записывает `_site/BUILD.json`: точная ревизия производителя,
закреплённые зависимости и версия Quarto. Архив `catalog-cross-project.tar.gz` выпускается
в отдельном неизменяемом Release `demo-20261007` из той же ревизии.
