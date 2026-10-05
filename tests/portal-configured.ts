import { dirname, fromFileUrl, join } from "stdlib/path";
import { copy } from "stdlib/fs";
import integration from "../_extensions/reference-catalog/entrypoints/publication.ts";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const quarto = Deno.env.get("QUARTO") || "quarto";
async function command(args: string[], cwd: string) {
  const result = await new Deno.Command(quarto, {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    result.success,
    new TextDecoder().decode(result.stdout) +
      new TextDecoder().decode(result.stderr),
  );
  return new TextDecoder().decode(result.stdout);
}
for (const configured of [true, false]) {
  const root = await Deno.makeTempDir({ prefix: "qrc-configured-portal-" });
  try {
    await copy(join(repo, "_extensions"), join(root, "_extensions"));
    const yaml =
      `project:\n  type: website\n  render: [index.qmd]\nformat: html\nfilters: [marker.lua${
        configured ? ", reference-catalog" : ""
      }]\nreference-catalog:\n  namespace: site\n`;
    await Deno.writeTextFile(join(root, "_quarto.yml"), yaml);
    await Deno.writeTextFile(
      join(root, "marker.lua"),
      'function Pandoc(doc) doc.blocks:insert(pandoc.Para({pandoc.Str("AUTHORED_FILTER_PRESERVED")})); return doc end\n',
    );
    await Deno.writeTextFile(
      join(root, "index.qmd"),
      '# Portal {#sec-portal}\n\n{{< xref book sec-book "Member" >}}\n',
    );
    await Deno.mkdir(join(root, "book"));
    await Deno.writeTextFile(
      join(root, "book/_quarto.yml"),
      "project:\n  type: website\n  render: [index.qmd]\nformat: html\n",
    );
    await Deno.writeTextFile(
      join(root, "book/index.qmd"),
      "# Book {#sec-book}\n\n@site:sec-portal\n",
    );
    const inspected = JSON.parse(await command(["inspect", root], root)).config;
    const portalContext = {
      namespace: undefined,
      format: "html",
      config: inspected,
    };
    const portalMetadata = integration.metadata(portalContext);
    await Deno.writeTextFile(
      join(root, "portal-metadata.json"),
      JSON.stringify(portalMetadata),
    );
    await command([
      "render",
      "index.qmd",
      "--metadata-file",
      "portal-metadata.json",
      "--output-dir",
      "portal-output",
    ], root);
    // A native member owns its own config, while its adapter sees the outer context.
    const memberContext = {
      namespace: "book",
      format: "html",
      config: inspected,
    };
    await Deno.writeTextFile(
      join(root, "book/member-metadata.json"),
      JSON.stringify(integration.metadata(memberContext)),
    );
    await command([
      "render",
      "index.qmd",
      "--metadata-file",
      "member-metadata.json",
      "--output-dir",
      "book-output",
    ], join(root, "book"));
    const nativePortal = await Deno.readTextFile(
      join(root, "portal-output/index.html"),
    );
    const nativeMember = await Deno.readTextFile(
      join(root, "book/book-output/index.html"),
    );
    const portalPage = readPage("index.html", nativePortal);
    const memberPage = readPage("book/index.html", nativeMember);
    const stage = join(root, "stage");
    await Deno.mkdir(join(stage, "book"), { recursive: true });
    await Deno.writeTextFile(join(stage, "index.html"), nativePortal);
    await Deno.writeTextFile(join(stage, "book/index.html"), nativeMember);
    await publish({
      root,
      stage,
      quarto: "native",
      members: [{ namespace: "book", format: "html" }],
      portal: {
        input: join(root, "index.qmd"),
        output: join(root, "portal-output"),
      },
      config: {
        ...inspected,
        "reference-catalog": {
          namespace: "site",
          exports: { site: ["sec-portal"], book: ["sec-book"] },
        },
      },
    });
    assert(
      portalPage.targets.length === 1 &&
        portalPage.targets[0].namespace === "site",
      "Root must have exactly one native configured capture",
    );
    assert(
      memberPage.targets.length === 1 &&
        memberPage.targets[0].namespace === "book",
      "Member overlay must still produce one capture",
    );
    const finalPortal = await Deno.readTextFile(join(stage, "index.html"));
    assert(
      finalPortal.includes("AUTHORED_FILTER_PRESERVED"),
      "Portal overlay cleared authored filters",
    );
    assert(
      finalPortal.includes('href="book/index.html#sec-book"'),
      "Native root shortcode lost member target",
    );
    assert(
      (await Deno.readTextFile(join(stage, "book/index.html"))).includes(
        'href="../index.html#sec-portal"',
      ),
      "Native member lost return link",
    );
    assert(
      await Deno.readTextFile(join(root, "_quarto.yml")) === yaml,
      "Native root config mutated",
    );
    console.log(
      `PASS ${
        configured ? "configured" : "unconfigured"
      } native portal: one capture, preserved authored filter/namespace, member overlay, two-way links and shortcode`,
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}
