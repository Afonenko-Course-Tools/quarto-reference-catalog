import { importTargets } from "../../_extensions/reference-catalog/infrastructure/imports.ts";
import { readPage } from "../../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../../_extensions/reference-catalog/infrastructure/linker.ts";

const [catalogPath, baseUrl, output] = Deno.args;
if (!catalogPath || !baseUrl || !output || Deno.args.length !== 3) throw new Error("Ожидались путь каталога, base URL и output");
const imports = await importTargets([{ namespace: "os", source: catalogPath, sourceNamespace: "book", baseUrl, style: "external" }]);
const links = ["sol-hidden", "sol-nested"].map(id => '<a id="external-' + id + '" data-qrc-ref="os:' + id + '" data-qrc-style="default" data-qrc-custom="false">Ссылка</a>').join(" ");
const page = readPage("consumer.html", '<html><head><meta charset="utf-8"><title>Курс-потребитель</title></head><body>' + links + '</body></html>');
const linked = linkPages([page], "", imports, '.qrc-source{opacity:.8}').pages.get("consumer.html");
if (linked === undefined) throw new Error("Отсутствует HTML потребителя");
await Deno.writeTextFile(output, linked);
