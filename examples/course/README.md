# Книга и две презентации

Пример использует native root website и опциональный course-site, поставляемый
репозиторием quarto-project-publish. Локальные установки используют короткие
пути `_extensions/reference-catalog/…` и `_extensions/course-site/…`.

```sh
quarto add /path/to/quarto-reference-catalog --no-prompt
quarto add /path/to/quarto-project-publish --no-prompt
(cd book && quarto add /path/to/quarto-reference-catalog --no-prompt)
(cd lectures && quarto add /path/to/quarto-reference-catalog --no-prompt)
(cd practice && quarto add /path/to/quarto-reference-catalog --no-prompt)
quarto render
```

При установке из GitHub адаптируйте пути hooks под
`_extensions/Afonenko-Course-Tools/…`. Каждая часть явно подключает QRC и свой
namespace. Root index.qmd остаётся обычной главной страницей; книга, лекции и
практика размещаются в mounts `book`, `lectures`, `practice`. Двусторонние ссылки
строго разрешаются после успешной полной native сборки. Самостоятельный
`quarto render chapter.qmd` внутри части использует local связывание.
