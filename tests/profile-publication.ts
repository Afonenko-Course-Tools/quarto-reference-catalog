import { required } from "./support.ts";
import { readSearch, record } from "./support.ts";
import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { jsonValue } from "./support.ts";
import { join } from "stdlib/path";
import { publish } from "../_extensions/reference-catalog/infrastructure/publish.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-profile-publication-" });
const target = (id: string, label: string, body: string) =>
  `<div id="${id}"><p>${body}</p></div><div class="qrc-probes" data-qrc-namespace="bank"><div class="qrc-probe" data-qrc-id="${id}" data-qrc-style="default"><a class="qrc-anchor" href="#${id}">${label}</a></div><div class="qrc-probe" data-qrc-id="${id}" data-qrc-style="number"><span class="qrc-unavailable"></span></div></div>`;
const page = (full: boolean) =>
  `<html><body><main>${
    target("exr-open", "Open native caption", "OPEN_BODY_SENTINEL")
  }${
    full
      ? target(
        "exr-restricted",
        "Restricted native caption",
        "RESTRICTED_BODY_SENTINEL",
      )
      : ""
  }</main></body></html>`;

try {
  for (const view of ["student", "full"]) {
    const stage = join(root, view);
    await Deno.mkdir(stage);
    await Deno.mkdir(join(stage, "book"));
    // A retained full page must never contribute facts to current student outputs.
    await Deno.writeTextFile(join(stage, "retained-full.html"), page(true));
    await Deno.writeTextFile(
      join(stage, "current.html"),
      page(view === "full"),
    );
    await Deno.writeTextFile(
      join(stage, "search.json"),
      JSON.stringify([
        { href: "current.html", text: "old text" },
        { href: "retained-full.html", text: "RESTRICTED_BODY_SENTINEL" },
      ]),
    );
    await Deno.writeTextFile(join(stage, "book/search.json"), JSON.stringify([
      { href: "../current.html#exr-open", text: "old section", metadata: { audience: view } },
      { href: "../retained-full.html", text: "RESTRICTED_BODY_SENTINEL" },
    ]));
    const context = {
      root,
      stage,
      quarto: "native-current-fixture",
      config: {},
      members: [{ namespace: "bank", format: "html" }],
      outputs: [join(stage, "current.html")],
      searchIndexes: [{ path: join(stage, "search.json") }, { path: join(stage, "book/search.json"), mount: "book" }],
    };
    await publish(context);
    const text = await Deno.readTextFile(join(stage, "reference-catalog.json"));
    const catalog = validateImportedCatalog(jsonValue(text), join(stage, "reference-catalog.json"));
    assert(
      Object.keys(catalog.targets).sort().join() ===
        (view === "full"
          ? "bank:exr-open,bank:exr-restricted"
          : "bank:exr-open"),
      "Catalog does not follow current profile targets",
    );
    assert(
      !text.includes("BODY_SENTINEL"),
      "Address catalog imported exercise body",
    );
    assert(
      required(catalog.targets["bank:exr-open"]).label === "Open native caption",
      "Catalog lost the native authored target caption",
    );
    const search = await Deno.readTextFile(join(stage, "search.json"));
    assert(
      search.includes("OPEN_BODY_SENTINEL"),
      "Current open search text missing",
    );
    assert(
      search.includes("RESTRICTED_BODY_SENTINEL") === (view === "full"),
      "Search does not follow current profile content",
    );
    assert(
      !search.includes("retained-full.html"),
      "Search retained stale full output",
    );
    const mounted = await readSearch(join(stage, "book/search.json"));
    assert(mounted.length === 1 && mounted[0]?.href === "../current.html#exr-open" && mounted[0]?.text === "OPEN_BODY_SENTINEL", "Mounted search retained stale full output or lost current relative fragment");
    assert(JSON.stringify(record(mounted[0]).metadata) === JSON.stringify({ audience: view }), "Mounted search lost profile metadata");
    if (view === "student") {
      assert(
        !text.includes("Restricted"),
        "Student catalog leaked restricted label",
      );
      let refused = false;
      try {
        await publish({
          ...context,
          config: {
            "reference-catalog": { exports: { bank: ["exr-restricted"] } },
          },
        });
      } catch (error) {
        assert(
          (error instanceof Error && "code" in error && error.code) === "QRC.TARGET_UNKNOWN",
          `Wrong unavailable current target diagnostic: ${error}`,
        );
        refused = true;
      }
      assert(
        refused,
        "Explicit full-scope export silently filtered unavailable restricted target",
      );
    }
  }
  console.log(
    "PASS profile publication: current student/full addresses and search, no body imports, retained full isolation and strict unavailable target selection",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
