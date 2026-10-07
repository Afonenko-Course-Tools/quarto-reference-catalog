import { dirname, fromFileUrl, join } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url))),
  root = await Deno.makeTempDir({ prefix: "qrc-export-context-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function run(args: string[]) {
  const result = await new Deno.Command(quarto, {
    args,
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
try {
  await run(["add", repo, "--no-prompt"]);
  await Deno.writeTextFile(
    join(root, "bank.qmd"),
    '---\nfilters: [reference-catalog]\nreference-catalog: {namespace: bank}\ncourse-export-context: true\n---\n\n{{< xref other exr-task "Authored label" >}}\n\n@other:exr-second\n',
  );
  await run(["render", "bank.qmd", "--to", "json", "--output", "bank.json"]);
  const document = JSON.parse(await Deno.readTextFile(join(root, "bank.json")));
  const markers: any[] = [];
  function walk(value: any) {
    if (!value || typeof value !== "object") return;
    if (
      value.t === "Span" &&
      value.c[0][2].some(([key]: string[]) => key === "data-qrc-ref")
    ) markers.push(value);
    for (const item of Object.values(value)) {
      if (Array.isArray(item)) item.forEach(walk);
      else if (typeof item === "object") walk(item);
    }
  }
  walk(document);
  assert(
    markers.length === 2,
    "explicit export must preserve shortcode and citation as two neutral QRC markers",
  );
  assert(
    markers.some((span) => JSON.stringify(span).includes("Authored label")),
    "authored label was lost",
  );
  assert(
    markers.some((span) => JSON.stringify(span).includes("other:exr-second")),
    "reference identity was lost",
  );
  assert(
    !JSON.stringify(document).includes('"t":"Link"'),
    "export inserted a fake QRC href",
  );
  await Deno.writeTextFile(join(root, "invalid.qmd"), '---\nfilters: [reference-catalog]\nreference-catalog: {namespace: bank}\ncourse-export-context: true\n---\n\n{{< xref other sec-target style="invalid" >}}\n');
  const invalid = await new Deno.Command(quarto, { args: ["render", "invalid.qmd", "--to", "json"], cwd: root, stdout: "piped", stderr: "piped" }).output();
  const refusal = new TextDecoder().decode(invalid.stderr);
  assert(!invalid.success && refusal.includes("QRC.REFERENCE_INVALID") && refusal.includes("other:sec-target") && refusal.includes("invalid.qmd") && refusal.includes("style"), `Native reference diagnostics lost source/target/style: ${refusal}`);
  console.log(
    "PASS explicit source export captures neutral QRC AST markers without fake links",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
