import { required } from "./support.ts";
import { readSearch } from "./support.ts";
import { readCatalog } from "./support.ts";
import { join } from "stdlib/path";
import { publishReferenceCatalog as publish } from "../_extensions/reference-catalog/public.ts";
import {
  attr,
  elements,
  parseHtml,
} from "../_extensions/reference-catalog/infrastructure/html.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-local-outputs-" });
const stage = join(root, "stage");
const html = (caption: string) =>
  `<html><body><main><h1 id="sec-current">Current heading</h1><a data-qrc-ref="book:sec-current" data-qrc-style="default">placeholder</a><a data-qrc-ref="practice:sec-missing" data-qrc-style="default">practice:sec-missing</a></main><div class="qrc-probes" hidden aria-hidden="true" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="default"><a class="qrc-anchor" href="#sec-current">${caption}</a></div><div class="qrc-probe" data-qrc-id="sec-current" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div></body></html>`;
const current = html("Current caption");
const stale = html("Stale duplicate caption");
const context = {
  root,
  stage,
  quarto: "fixture",
  config: {},
  members: [{ namespace: "book", format: "html" }],
  scope: "local" as const,
  outputs: ["stage/current.html"],
};
try {
  await Deno.mkdir(stage);
  await Deno.writeTextFile(join(stage, "current.html"), current);
  await Deno.writeTextFile(join(stage, "stale.html"), stale);
  const completeCatalog =
    '{"schema":"quarto-reference-catalog","generator":{"quarto":"prior"},"targets":{}}\n';
  await Deno.writeTextFile(
    join(stage, "reference-catalog.json"),
    completeCatalog,
  );
  await Deno.writeTextFile(
    join(stage, "search.json"),
    JSON.stringify([{ href: "current.html", text: "old current" }, {
      href: "stale.html",
      text: "keep unrelated",
    }]),
  );
  // A global stage scan would assemble a duplicate target and block this edit.
  await publish(context);
  const defaultCatalog = await readCatalog(
    join(stage, "reference-catalog-local.json"),
  );
  assert(
    Object.keys(defaultCatalog.targets).join() === "book:sec-current",
    "Local catalog without exports must publish current own targets",
  );
  assert(
    await Deno.readTextFile(join(stage, "stale.html")) === stale,
    "A selected local render rewrote an unrelated retained page",
  );
  assert(
    (await Deno.readTextFile(join(stage, "current.html"))).includes(
      'href="current.html#sec-current">Current caption',
    ),
    "Current facts were replaced by a retained duplicate",
  );
  const rows = await readSearch(join(stage, "search.json"));
  assert(
    required(rows[0]).text ===
        "Current heading Current caption practice:sec-missing" &&
      required(rows[1]).text === "keep unrelated",
    "Local search read unrelated pages or retained probes",
  );
  assert(
    await Deno.readTextFile(join(stage, "reference-catalog.json")) ===
      completeCatalog,
    "Local linking replaced the prior complete public catalog with partial facts",
  );

  const selectedExports = {
    ...context,
    config: {
      "reference-catalog": { exports: { book: ["sec-current", "sec-later"] } },
    },
  };
  await publish(selectedExports);
  const localCatalog = await readCatalog(
    join(stage, "reference-catalog-local.json"),
  );
  assert(
    Object.keys(localCatalog.targets).join() === "book:sec-current",
    "Local export did not restrict itself to current available targets",
  );
  assert(
    await Deno.readTextFile(join(stage, "reference-catalog.json")) ===
      completeCatalog,
    "Local selected exports replaced the complete catalog",
  );

  await publish({
    ...context,
    config: { "reference-catalog": { exports: {} } },
  });
  const disabledCatalog = await readCatalog(
    join(stage, "reference-catalog-local.json"),
  );
  assert(
    Object.keys(disabledCatalog.targets).length === 0,
    "Explicit empty exports must disable local export",
  );

  const malformed =
    '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-broken" data-qrc-style="default"></div></div>';
  await Deno.writeTextFile(join(stage, "malformed.html"), malformed);
  await publish({ ...context, outputs: [join(stage, "current.html")] });
  assert(
    await Deno.readTextFile(join(stage, "malformed.html")) === malformed,
    "Local linking touched unrelated malformed retained HTML",
  );

  let fullRejected = false;
  try {
    await publish({ ...context, scope: "full" });
  } catch {
    fullRejected = true;
  }
  assert(fullRejected, "Explicit full finalization deferred a missing target");
  await Deno.remove(join(stage, "stale.html"));
  await Deno.remove(join(stage, "malformed.html"));
  let missingExportRejected = false;
  try {
    await publish({ ...selectedExports, scope: "full" });
  } catch (error) {
    missingExportRejected = String(error).includes("sec-later");
  }
  assert(
    missingExportRejected,
    "Full export silently omitted an unavailable declared target",
  );
  // Реальный public local→full: retained sibling catalog не делает внутреннюю ссылку внешней.
  const promotion = join(root, "promotion"),
    importedFile = join(root, "sibling.json");
  await Deno.mkdir(promotion);
  const incoming =
    '<html><head></head><body><a class="qrc-link" rel="author" data-qrc-ref="other:sec-target" data-qrc-style="default">placeholder</a><a class="qrc-link" rel="external noopener" data-qrc-ref="other:sec-target" data-qrc-style="default" data-qrc-custom="true"><em>Авторский текст</em></a><div class="qrc-probes" data-qrc-namespace="first"></div></body></html>';
  const target =
    '<html><body><h1 id="sec-target">Текущий раздел</h1><div class="qrc-probes" data-qrc-namespace="other"><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="default"><a class="qrc-anchor" href="#sec-target">Текущий раздел</a></div><div class="qrc-probe" data-qrc-id="sec-target" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div></body></html>';
  const firstPath = join(promotion, "first.html"),
    targetPath = join(promotion, "other.html");
  const local = {
    root,
    stage: promotion,
    quarto: "fixture",
    config: {
      "reference-catalog": {
        imports: {
          other: {
            source: importedFile,
            namespace: "other",
            "base-url": "https://course.test/other/",
            style: "external",
          },
        },
      },
    },
    members: [{ namespace: "first", format: "html" }],
    outputs: [firstPath],
    scope: "local" as const,
  };
  const complete = {
    ...local,
    config: {},
    members: [...local.members, { namespace: "other", format: "html" }],
    outputs: [firstPath, targetPath],
    scope: "full" as const,
  };
  const retained = join(root, "retained");
  await Deno.mkdir(retained);
  const retainedTarget = join(retained, "other.html");
  await Deno.writeTextFile(
    retainedTarget,
    target.replaceAll("Текущий раздел", "Старая импортированная метка"),
  );
  await publish({
    root,
    stage: retained,
    quarto: "fixture",
    config: {},
    members: [{ namespace: "other", format: "html" }],
    outputs: [retainedTarget],
    scope: "local",
  });
  await Deno.copyFile(
    join(retained, "reference-catalog-local.json"),
    importedFile,
  );
  await Deno.writeTextFile(firstPath, incoming);
  await Deno.writeTextFile(targetPath, target);
  await publish(local);
  await publish(local);
  const intermediate = await Deno.readTextFile(firstPath);
  await publish(complete);
  const warmFull = await Deno.readTextFile(firstPath);
  const linked = elements(parseHtml(warmFull)).filter((node) =>
    node.tagName === "a"
  );
  assert(
    attr(required(linked[0]), "rel") === "author" &&
      attr(required(linked[1]), "rel") === "external noopener",
    "Full должен удалить только rel=external, добавленный QRC, сохранив авторские токены",
  );
  assert(
    linked.every((node) => attr(node, "href") === "other.html#sec-target"),
    "Promotion потерял текущий внутренний href",
  );
  assert(
    warmFull.includes("Текущий раздел") &&
      !warmFull.includes("Старая импортированная метка") &&
      warmFull.includes("<em>Авторский текст</em>"),
    "Promotion потерял текущую метку или авторскую разметку",
  );
  assert(
    !warmFull.includes('class="qrc-link qrc-external"') &&
      !warmFull.includes("data-qrc-external-style") &&
      !warmFull.includes('class="qrc-source"'),
    "Full оставил оформление прошлого imported target",
  );
  assert(
    !warmFull.includes("data-qrc-generated-external-rel"),
    "Full оставил промежуточный маркер владения rel",
  );
  await Deno.remove(importedFile);
  await Deno.writeTextFile(firstPath, intermediate);
  await publish(local);
  const deferred = elements(parseHtml(await Deno.readTextFile(firstPath)))
    .filter((node) => node.tagName === "a");
  assert(
    attr(required(deferred[0]), "rel") === "author" &&
      attr(required(deferred[0]), "href") === undefined,
    "После исчезновения импорта остались generated rel/href",
  );
  await Deno.writeTextFile(firstPath, incoming);
  await Deno.writeTextFile(targetPath, target);
  await publish(local);
  await publish(complete);
  assert(
    await Deno.readTextFile(firstPath) === warmFull,
    "Cold/warm retained catalog меняет итоговые HTML bytes на одной разметке",
  );
  console.log(
    "PASS local outputs: selected current facts, unchanged unrelated duplicate/malformed HTML and search, strict full current validation",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
