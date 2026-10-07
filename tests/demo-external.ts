import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join } from "stdlib/path";
import { attr, content, elements, hasClass, parseHtml } from "../_extensions/reference-catalog/infrastructure/html.ts";
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "qrc-demo-external-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
try {
  await copy(join(repo, "examples/external"), root, { overwrite: true });
  await copy(join(repo, "_extensions/reference-catalog"), join(root, "_extensions/Afonenko-Course-Tools/reference-catalog"));
  const result = await new Deno.Command(quarto, { args: ["render", "--fail-if-warnings"], cwd: root, stdout: "piped", stderr: "piped" }).output();
  assert(result.success, new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr));
  const nodes = elements(parseHtml(await Deno.readTextFile(join(root, "_site/index.html"))));
  assert(nodes.some(node => node.tagName === "html" && attr(node, "lang") === "ru"), "External independent project lost lang ru");
  const source = "https://github.com/Afonenko-Course-Tools/quarto-reference-catalog/blob/demo-20261007/examples/external/index.qmd";
  const actions = nodes.filter(node => node.tagName === "a" && attr(node, "href") === source);
  assert(actions.length === 1 && hasClass(actions[0], "toc-action"), "External HTML must have exactly one native source action to the correct QMD");
  const external = nodes.filter(node => node.tagName === "a" && attr(node, "data-qrc-ref") === "docs:sec-inspect");
  assert(external.length === 3 && external.every(node => attr(node, "href")?.startsWith("https://quarto.org/docs/")), "External demo lost its published base-url contract");
  assert(external.some(node => content(node).includes("Выбранная подпись автора")), "External demo lost its authored caption");
  console.log("PASS external ready source: native ru/source action once, correct QMD, three external links and authored caption");
} finally { await Deno.remove(root, { recursive: true }); }
