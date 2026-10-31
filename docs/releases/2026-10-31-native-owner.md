# QRC 3.2.0

Кандидат объединяет ранее независимо проверенную native B3 ветку
`c115373c72b25e4727481be377ab1bf6922804ec` и main `989448d2afa4df7db882b0874c88808a00ae52c2`
с сохранением обеих Git историй. Исходные version-only snapshots сохранены.

Публичные owner/resource/condition гарантии B3 объединены с контекстом
наблюдения ABI 1 и прежними restricted env permissions из main. Publisher
сохраняет также main preview startup guard. Download не возвращает private
NativeRun fallback; его прежние harness проверки перенесены на actual public
операции и явный отказ старого carrier, mapping сохранён в tests.

Независимая приёмка объединения и настоящие CI окончательных SHA выполняются
отдельно. Этот файл не утверждает их прохождения. Новый immutable tag и release
создаются только после необходимых проверок; прежние опубликованные теги не
заменяются. Полный курс135, assignment/P/OCI/installed квалифицируются отдельно.
