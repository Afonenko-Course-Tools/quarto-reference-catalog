import { assemble, resolve } from "../_extensions/reference-catalog/domain/catalog.ts";
import { exportedTargets } from "../_extensions/reference-catalog/domain/exports.ts";
import { catalogConfig } from "../_extensions/reference-catalog/infrastructure/config.ts";
import { parseImports } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function rejects(action: () => unknown, code: string, fragments: string[]) {
  try { await action(); } catch (error) {
    assert(error instanceof Error && error.name === "ExtensionDiagnostic" && (error as Error & { code?: string }).code === code, `Expected ${code}, got ${error}`);
    for (const fragment of fragments) assert(error.message.includes(fragment), `Missing context ${fragment}: ${error.message}`);
    return error;
  }
  throw new Error(`Expected ${code}`);
}
const target = { namespace: "book", id: "sec-one", page: "first.html", fragment: "sec-one", labelHtml: "Раздел", label: "Раздел", numberHtml: "", number: "" };
await rejects(() => catalogConfig({ unknown: true }, "/tmp", ["book"]), "QRC.CONFIG_INVALID", ["reference-catalog.unknown"]);
await rejects(() => parseImports({ external: { source: "chosen.json", namespace: "book", "base-url": "file:///tmp/" } }, "/tmp", []), "QRC.IMPORT_INVALID", ["chosen.json", "external", "base-url"]);
await rejects(() => assemble([target, { ...target, page: "second.html" }]), "QRC.TARGET_DUPLICATE", ["book:sec-one", "first.html", "second.html", "связано"]);
await rejects(() => resolve(new Map(), "book:sec-absent", "chapter.html"), "QRC.TARGET_UNKNOWN", ["book:sec-absent", "chapter.html"]);
await rejects(() => exportedTargets([target], { book: ["sec-absent"] }), "QRC.TARGET_UNKNOWN", ["book:sec-absent", "exports.book"]);
await rejects(() => validateImportedCatalog({ schema: "quarto-reference-catalog", generator: { quarto: "test" }, targets: { "book:sec-one": { ...target, page: "../escape.html" } } }, "chosen.json"), "QRC.IMPORT_INVALID", ["chosen.json", "book:sec-one", "поле=page"]);
await rejects(() => readPage("broken.html", '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-one" data-qrc-style="default"></div></div>'), "QRC.OUTPUT_INVALID", ["broken.html", "book:sec-one"]);
await rejects(() => linkPages([readPage("request.html", '<a data-qrc-ref="book:sec-one" data-qrc-style="bad">Ссылка</a>')], "", [], "", "local"), "QRC.REFERENCE_INVALID", ["request.html", "book:sec-one", "data-qrc-style"]);
const root = await Deno.makeTempDir({ prefix: "qrc-diagnostics-" });
try {
  await Deno.mkdir(`${root}/stage`);
  await rejects(() => publish({ root, stage: `${root}/stage`, quarto: "test", config: {}, members: [], outputs: ["stage/missing.html"] }), "QRC.OUTPUT_INVALID", ["missing.html", "outputs"]);
} finally { await Deno.remove(root, { recursive: true }); }
console.log("PASS diagnostic guards: stable codes, namespace/target, selected source/field and both duplicate output pages");
