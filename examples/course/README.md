# Книга и две презентации

Установите QRC и координатор публикации:

```sh
quarto add Afonenko-Course-Tools/quarto-reference-catalog
quarto add Afonenko-Course-Tools/quarto-project-publish
quarto render
```

`book` размещается в корне сайта; `lectures` и `practice` — в собственных каталогах. Ссылки работают в обе стороны. Все проектные обработчики указаны явно в `_quarto.yml`.
