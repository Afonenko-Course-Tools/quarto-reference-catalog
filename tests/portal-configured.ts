import { dirname, fromFileUrl, join } from "stdlib/path";
import { copy } from "stdlib/fs";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";
import { readPage } from "../_extensions/reference-catalog/infrastructure/pages.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const quarto = Deno.env.get("QUARTO") || "quarto";
async function command(args: string[], cwd: string) {
  const result = await new Deno.Command(quarto, { args, cwd, stdout: "piped", stderr: "piped" }).output();
  assert(result.success, new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout);
}
for (const formatFilter of [false, true]) {
  const root = await Deno.makeTempDir({ prefix: "qrc-configured-portal-" });
  try {
    await copy(join(repo, "_extensions"), join(root, "_extensions"));
    const yaml = `project:\n  type: website\n  render: [index.qmd]\n${formatFilter ? 'format:\n  html:\n    filters: [reference-catalog]\nfilters: [marker.lua]\n' : 'format: html\nfilters: [marker.lua, reference-catalog]\n'}reference-catalog:\n  namespace: site\n`;
    await Deno.writeTextFile(join(root, "_quarto.yml"), yaml);
    await Deno.writeTextFile(join(root, "marker.lua"), 'function Pandoc(doc) doc.blocks:insert(pandoc.Para({pandoc.Str("AUTHORED_FILTER_PRESERVED")})); return doc end\n');
    await Deno.writeTextFile(join(root, "index.qmd"), '# Portal {#sec-portal}\n\n{{< xref book sec-book "Member" >}}\n');
    await Deno.mkdir(join(root, "book"));
    await copy(join(repo, "_extensions"), join(root, "book/_extensions"));
    await Deno.writeTextFile(join(root, "book/_quarto.yml"), "project:\n  type: website\n  render: [index.qmd]\nformat: html\nfilters: [reference-catalog]\nreference-catalog:\n  namespace: book\n");
    await Deno.writeTextFile(join(root, "book/index.qmd"), "# Book {#sec-book}\n\n@site:sec-portal\n");
    await command(["render", "index.qmd", "--output-dir", "portal-output", "--fail-if-warnings"], root);
    await command(["render", "index.qmd", "--output-dir", "book-output", "--fail-if-warnings"], join(root, "book"));
    const nativePortal = await Deno.readTextFile(join(root, "portal-output/index.html"));
    const nativeMember = await Deno.readTextFile(join(root, "book/book-output/index.html"));
    assert(readPage("index.html", nativePortal).targets.length === 1, "Native root duplicated its target probes");
    assert(readPage("book/index.html", nativeMember).targets[0].namespace === "book", "Native component lost its namespace");
    const stage = join(root, "stage");
    await Deno.mkdir(join(stage, "book"), { recursive: true });
    await Deno.writeTextFile(join(stage, "index.html"), nativePortal);
    await Deno.writeTextFile(join(stage, "book/index.html"), nativeMember);
    await publish({ root, stage, quarto: "native", members: [{ namespace: "book", format: "html" }], portal: { input: join(root, "index.qmd"), output: join(root, "portal-output") }, outputs: [join(stage, "index.html"), join(stage, "book/index.html")], config: { "reference-catalog": { namespace: "site", exports: { site: ["sec-portal"], book: ["sec-book"] } } } });
    const finalPortal = await Deno.readTextFile(join(stage, "index.html"));
    assert(finalPortal.includes("AUTHORED_FILTER_PRESERVED"), "Native configuration lost authored filters");
    assert(finalPortal.includes('href="book/index.html#sec-book"'), "Native root shortcode lost component target");
    assert((await Deno.readTextFile(join(stage, "book/index.html"))).includes('href="../index.html#sec-portal"'), "Native component lost return link");
    assert(await Deno.readTextFile(join(root, "_quarto.yml")) === yaml, "Native root config mutated");
    console.log(`PASS native ${formatFilter ? "format" : "project"} filter: preserved authored configuration, namespace, two-way links and shortcode`);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}
