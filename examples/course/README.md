# Книга и две презентации

Этот пример проверяет локальные checkout двух пакетов и использует короткие пути `_extensions/reference-catalog/…` и `_extensions/project-publish/…`.

```sh
quarto add /path/to/quarto-reference-catalog --no-prompt
quarto add /path/to/quarto-project-publish --no-prompt
quarto render
```

Замените `/path/to` на каталог с подготовленными репозиториями. При установке опубликованных пакетов командами `quarto add Afonenko-Course-Tools/…` измените пути обработчиков и интеграции в `_quarto.yml` на `_extensions/Afonenko-Course-Tools/…`, как показано в основных README.

`book` размещается в корне сайта; `lectures` и `practice` — в собственных каталогах. Ссылки работают в обе стороны. Все проектные обработчики указаны явно в `_quarto.yml`.
