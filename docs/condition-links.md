# Адреса публичного условия

`_extensions/reference-catalog/public.ts` предоставляет `bindConditionLinks`.
Операция принимает ссылки уже выбранного Core condition и конечное назначение:
`catalog`, фактический `baseUrl`, проверенные `importedTargets`, явные `urls` и
`references`. Результат — карта `links` для `materializeProject` Core.

`references` сопоставляет ссылке тела `{key, style?}` существующего каталога QRC.
Используются прежние правила namespace, import, стиля и Reveal anchor.
`urls` сопоставляет ссылке тела точный output URL либо путь относительно
публикационного base. Publisher предоставляет такое соответствие для QMD и
ссылки на собственную заготовку до создания ZIP. QRC не выводит output по имени
исходника и не требует хеша ZIP. Внешние HTTP(S)/mailto ссылки сохраняются;
непривязанная относительная ссылка получает отказ с input и исходной ссылкой.

Локальные `#anchor` остаются Core: только его writer видит полное выбранное тело
и может проверить существование anchor. QRC не читает и не переписывает AST.
Вызвавшая композиция передаёт проверенный актуальный condition; эта адресная
операция не подтверждает operation/currentness исходников.

Проверки: `quarto run tests/condition-links.ts` и прежний
`quarto run tests/body-links.ts`. Общий native Core→QRC→Download fixture находится
в Download `tests/public-inventory.ts`; он не заменяет приёмку штатного Publisher
и установленных Java/SP consumers.
