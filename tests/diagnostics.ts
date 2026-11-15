import { assemble, resolve } from "../_extensions/reference-catalog/domain/catalog.ts";
import { exportedTargets } from "../_extensions/reference-catalog/domain/exports.ts";
import { catalogConfig } from "../_extensions/reference-catalog/infrastructure/config.ts";
import { parseImports } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";
import { linkPages } from "../_extensions/reference-catalog/infrastructure/linker.ts";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";
import {
  parsePostInspection,
  postConfiguration,
  postOutputDirectory,
} from "../_extensions/reference-catalog/infrastructure/post-input.ts";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => unknown, code: string, fragments: string[]) {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error &&
        error.name === "ExtensionDiagnostic" &&
        ("code" in error && error.code) === code,
      `Expected ${code}, got ${error}`,
    );
    for (const fragment of fragments) {
      assert(error.message.includes(fragment), `Missing context ${fragment}: ${error.message}`);
    }
    return error;
  }
  throw new Error(`Expected ${code}`);
}
const malformedInspect = await rejects(
  () => parsePostInspection("{", "/selected-post"),
  "QRC.CONFIG_INVALID",
  ["/selected-post", "inspect"],
);
assert(
  malformedInspect.cause instanceof SyntaxError,
  "Native inspect потерял исходный SyntaxError",
);
const target = {
  namespace: "book",
  id: "sec-one",
  page: "first.html",
  fragment: "sec-one",
  labelHtml: "Раздел",
  label: "Раздел",
  numberHtml: "",
  number: "",
};
for (const inspection of [
  null,
  [],
  {},
  { config: [] },
  { config: {} },
  { config: { "reference-catalog": null } },
  { config: { "reference-catalog": { namespace: "" } } },
  { config: { "reference-catalog": { namespace: 1 } } },
]) {
  await rejects(() => postConfiguration(inspection, "/selected-post"), "QRC.CONFIG_INVALID", [
    "источник=/selected-post",
    "поле=reference-catalog.namespace",
  ]);
}
const inspected = {
  config: {
    "reference-catalog": {
      namespace: "book",
      publication: { title: "Заголовок" },
    },
    project: { "output-dir": "native-site", unrelated: [1, null] },
    extension: { arbitrary: [true, { nested: "данные" }] },
  },
  other: "Native metadata",
};
const post = postConfiguration(inspected, "/selected-post");
assert(
  post.namespace === "book" && post.config === inspected.config,
  "Post сузил или скопировал дополнительные Native config keys",
);
assert(
  postConfiguration({ config: { "reference-catalog": { namespace: " " } } }, "/selected-post")
    .namespace === " ",
  "Post добавил новый namespace pattern gate",
);
assert(
  postOutputDirectory(post.config, undefined, "/selected-post") === "native-site",
  "Post потерял Native output-dir",
);
assert(
  postOutputDirectory(post.config, "override", "/selected-post") === "override",
  "ENV output-dir потерял precedence",
);
assert(
  postOutputDirectory({ project: { "output-dir": "" } }, undefined, "/selected-post") === "",
  "Пустой Native output-dir заменён default",
);
assert(
  postOutputDirectory({ project: { "output-dir": false } }, "", "/selected-post") === "",
  "Пустой ENV override не должен проверять перекрытый malformed Native output-dir",
);
for (const config of [
  {},
  { project: null },
  { project: false },
  { project: [] },
  {
    project: {},
  },
  { project: { "output-dir": null } },
]) {
  assert(
    postOutputDirectory(config, undefined, "/selected-post") === "_site",
    "Post изменил nullish fallback output-dir",
  );
}
for (const output of [false, 0, {}, []]) {
  await rejects(
    () => postOutputDirectory({ project: { "output-dir": output } }, undefined, "/selected-post"),
    "QRC.CONFIG_INVALID",
    ["источник=/selected-post", "поле=project.output-dir"],
  );
}
await rejects(() => catalogConfig({ unknown: true }, "/tmp", ["book"]), "QRC.CONFIG_INVALID", [
  "reference-catalog.unknown",
]);
await rejects(() => parseImports([], "/selected-component", []), "QRC.IMPORT_INVALID", [
  "источник=/selected-component",
  "поле=reference-catalog.imports",
]);
await rejects(
  () =>
    parseImports(
      {
        external: {
          source: "chosen.json",
          namespace: "book",
          "base-url": "file:///tmp/",
        },
      },
      "/tmp",
      [],
    ),
  "QRC.IMPORT_INVALID",
  ["chosen.json", "external", "base-url"],
);
await rejects(
  () =>
    parseImports(
      {
        external: {
          source: "ftp://selected.test/catalog.json",
          namespace: "book",
          "base-url": "https://selected.test/",
        },
      },
      "/tmp",
      [],
    ),
  "QRC.IMPORT_INVALID",
  ["ftp://selected.test/catalog.json", "ID=external", "поле=source"],
);
const invalidUrl = await rejects(
  () =>
    parseImports(
      {
        external: {
          source: "https://[",
          namespace: "book",
          "base-url": "https://selected.test/",
        },
      },
      "/tmp",
      [],
    ),
  "QRC.IMPORT_INVALID",
  ["https://[", "ID=external", "поле=source"],
);
assert(invalidUrl.cause instanceof Error, "Invalid source URL lost the parser cause");
await rejects(
  () => assemble([target, { ...target, page: "second.html" }]),
  "QRC.TARGET_DUPLICATE",
  ["book:sec-one", "first.html", "second.html", "связано"],
);
await rejects(() => resolve(new Map(), "book:sec-absent", "chapter.html"), "QRC.TARGET_UNKNOWN", [
  "book:sec-absent",
  "chapter.html",
]);
await rejects(() => exportedTargets([target], { book: ["sec-absent"] }), "QRC.TARGET_UNKNOWN", [
  "book:sec-absent",
  "exports.book",
]);
await rejects(
  () =>
    validateImportedCatalog(
      {
        schema: "quarto-reference-catalog",
        generator: { quarto: "test" },
        targets: { "book:sec-one": { ...target, page: "../escape.html" } },
      },
      "chosen.json",
    ),
  "QRC.IMPORT_INVALID",
  ["chosen.json", "book:sec-one", "поле=page"],
);
await rejects(
  () =>
    readPage(
      "broken.html",
      '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-one" data-qrc-style="default"></div></div>',
    ),
  "QRC.OUTPUT_INVALID",
  ["broken.html", "book:sec-one"],
);
await rejects(
  () =>
    linkPages(
      [readPage("request.html", '<a data-qrc-ref="book:sec-one" data-qrc-style="bad">Ссылка</a>')],
      "",
      [],
      "",
      "local",
    ),
  "QRC.REFERENCE_INVALID",
  ["request.html", "book:sec-one", "data-qrc-style"],
);
const root = await Deno.makeTempDir({ prefix: "qrc-diagnostics-" });
try {
  await Deno.mkdir(`${root}/stage`);
  await rejects(
    () =>
      publish({
        root,
        stage: `${root}/stage`,
        quarto: "test",
        config: {},
        members: [],
        outputs: ["stage/missing.html"],
      }),
    "QRC.OUTPUT_INVALID",
    ["missing.html", "outputs"],
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
console.log(
  "PASS diagnostic guards: stable codes, namespace/target, selected source/field and both duplicate output pages",
);
