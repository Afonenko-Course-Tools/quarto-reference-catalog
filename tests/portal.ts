import { dirname, fromFileUrl, join } from "stdlib/path";
import { copy } from "stdlib/fs";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(action: () => Promise<unknown>, expected: string) {
  try {
    await action();
  } catch (error) {
    assert(String(error).includes(expected), `Unexpected rejection: ${error}`);
    return;
  }
  throw new Error(`Expected rejection: ${expected}`);
}
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "qrc-portal-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
const stage = join(root, "stage");
const portal = {
  input: join(root, "index.qmd"),
  output: join(root, "portal-output"),
};
const config = {
  "reference-catalog": {
    namespace: "site",
    exports: { site: ["sec-portal"], book: ["sec-book"] },
  },
};
const context = {
  root,
  stage,
  quarto: "native",
  config,
  members: [{ namespace: "book", format: "html" }],
  portal,
  outputs: [join(stage, "index.html"), join(stage, "book/index.html")],
};
async function render(
  input: string,
  namespace: string,
  output: string,
  portalMetadata = false,
) {
  await Deno.writeTextFile(
    join(root, input),
    `# ${namespace} {#sec-${namespace === "site" ? "portal" : namespace}}\n\n@${
      namespace === "site" ? "book:sec-book" : "site:sec-portal"
    }\n`,
  );
  const metadata = { "reference-catalog": { namespace }, filters: ["reference-catalog"] };
  await Deno.writeTextFile(
    join(root, "metadata.json"),
    JSON.stringify(metadata),
  );
  const result = await new Deno.Command(quarto, {
    args: [
      "render",
      input,
      "--metadata-file",
      "metadata.json",
      "--output-dir",
      output,
    ],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    result.success,
    new TextDecoder().decode(result.stdout) +
      new TextDecoder().decode(result.stderr),
  );
}
async function resetStage() {
  await Deno.remove(stage, { recursive: true }).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  });
  await Deno.mkdir(join(stage, "book"), { recursive: true });
  await copy(join(root, "portal-output/index.html"), join(stage, "index.html"));
  await copy(
    join(root, "book-output/book.html"),
    join(stage, "book/index.html"),
  );
}
const withConfig = (raw: unknown) => ({
  ...context,
  config: { "reference-catalog": raw },
});
try {
  await copy(join(repo, "_extensions"), join(root, "_extensions"));
  await Deno.writeTextFile(
    join(root, "_quarto.yml"),
    "project:\n  type: website\n  render: [index.qmd, book.qmd, unknown.qmd]\nformat: html\nreference-catalog:\n  namespace: site\n",
  );
  await render("index.qmd", "site", "portal-output", true);
  await render("book.qmd", "book", "book-output");
  await resetStage();
  await publish(context);
  const catalog = JSON.parse(
    await Deno.readTextFile(join(stage, "reference-catalog.json")),
  );
  assert(
    Object.keys(catalog.targets).join() === "book:sec-book,site:sec-portal",
    "Portal and member exports must share one catalog",
  );
  assert(
    catalog.targets["site:sec-portal"].page === "index.html",
    "Portal target must retain its native root placement",
  );
  const html = await Deno.readTextFile(join(stage, "index.html"));
  assert(
    html.includes('href="book/index.html#sec-book"'),
    "Portal must link to the member target",
  );
  assert(
    (await Deno.readTextFile(join(stage, "book/index.html"))).includes(
      'href="../index.html#sec-portal"',
    ),
    "Member must link back to the root portal target",
  );
  await Deno.writeTextFile(
    join(root, "producer.json"),
    JSON.stringify(catalog),
  );
  await resetStage();
  await publish(withConfig({
    namespace: "site",
    imports: {
      os: {
        source: "producer.json",
        namespace: "book",
        "base-url": "https://example.org/producer/",
      },
    },
  }));
  const imported = JSON.parse(
    await Deno.readTextFile(join(stage, "reference-catalog.json")),
  );
  assert(
    Object.keys(imported.targets).join() === "book:sec-book,site:sec-portal",
    "Default export must publish portal/member targets without reexporting imports",
  );
  await resetStage();
  const initial = await Deno.readTextFile(join(stage, "index.html"));
  await rejects(
    () => publish({ ...context, portal: undefined }),
    "не относится к локальному проекту: site",
  );
  for (const namespace of [undefined, null, "", "bad:namespace", 42]) {
    await rejects(
      () => publish(withConfig({ namespace })),
      "порталу требуется корректное reference-catalog.namespace",
    );
  }
  await rejects(
    () => publish(withConfig({ namespace: "book" })),
    "пространство имён портала совпадает с участником: book",
  );
  await rejects(
    () =>
      publish({
        ...withConfig({ namespace: "print" }),
        members: [...context.members, { namespace: "print", format: "pdf" }],
      }),
    "пространство имён портала совпадает с участником: print",
  );
  await rejects(
    () =>
      publish(
        withConfig({
          namespace: "site",
          imports: {
            site: {
              source: "other.json",
              namespace: "book",
              "base-url": "https://example.org/",
            },
          },
        }),
      ),
    "некорректное пространство имён импорта site",
  );
  // Arbitrary stage pages never grant another local namespace for export.
  await render("unknown.qmd", "unknown", "unknown-output");
  await copy(
    join(root, "unknown-output/unknown.html"),
    join(stage, "unknown.html"),
  );
  await rejects(
    () => publish(withConfig({ namespace: "site", exports: { unknown: "*" } })),
    "не относится к локальному проекту: unknown",
  );
  await Deno.remove(join(stage, "unknown.html"));
  await rejects(
    () =>
      publish(
        withConfig({
          namespace: "site",
          exports: { site: ["sec-unpublished"] },
        }),
      ),
    "экспортируемая цель отсутствует в публикации: site:sec-unpublished",
  );
  assert(
    await Deno.readTextFile(join(stage, "index.html")) === initial,
    "Rejected publication must preserve the root HTML",
  );
  console.log(
    "PASS managed portal: native root/member captures, explicit root exports, two-way links, external import without reexport, absent/invalid/colliding namespace, import alias, unknown page and unpublished export rejection",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
