// @ts-check
/// <reference path="../typecheck/browser.d.ts" />
// Optional browser regression suite. Playwright is a development dependency;
// installing/using the Quarto extension still needs only Quarto itself.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
/**
 * @param {unknown} value
 * @returns {value is {chromium: Pick<typeof import("playwright").chromium, "launch">}}
 */
function hasChromiumLaunch(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "chromium" in value &&
    typeof value.chromium === "object" &&
    value.chromium !== null &&
    "launch" in value.chromium &&
    typeof value.chromium.launch === "function"
  );
}
/** @type {Pick<typeof import("playwright").chromium, "launch">} */
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  /** @type {unknown} */
  const fallback = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright"));
  if (!hasChromiumLaunch(fallback))
    throw new TypeError("Fallback Playwright не предоставляет chromium.launch");
  chromium = fallback.chromium;
}

const repo = path.resolve(__dirname, "..");
const quarto = process.env.QUARTO || "quarto";
const navigationPath = path.join(repo, "_extensions/reference-catalog/browser/navigation.js");
const book = `---
title: Disclosure regression
format: html
---

[Open answer](#sol-hidden){#open-answer}

::: {.callout-tip collapse="true"}
## Outer answer

<details id="nested-details"><summary>Inner answer</summary>

::: {#sol-hidden}
This answer has two closed ancestors.
:::

</details>
:::
`;
const slides = `---
title: Fragment regression
format:
  revealjs:
    hash: true
    transition: none
---

## Start {#sec-start}

::: {.fragment}
::: {#sol-zero}
First fragment; native index zero.
:::
:::

::: {.fragment}
Outer fragment.

::: {.fragment}
::: {#sol-nested}
Nested fragment.
:::
:::
:::

## Finish {#sec-finish}

Finished.
`;

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qrc-browser-"));
  /** @type {import("playwright").Browser | undefined} */
  let browser;
  /** @type {import("node:http").Server | undefined} */
  let server;
  try {
    const script = await fs.readFile(navigationPath, "utf8");
    /** @type {[string, string][]} */
    const renderFixtures = [
      ["book", book],
      ["slides", slides],
    ];
    for (const [name, content] of renderFixtures) {
      await fs.writeFile(path.join(root, `${name}.qmd`), content);
      const render = spawnSync(quarto, ["render", `${name}.qmd`, "--fail-if-warnings"], {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(render.status, 0, render.stdout + render.stderr);
      const output = path.join(root, `${name}.html`);
      const html = await fs.readFile(output, "utf8");
      await fs.writeFile(
        output,
        html.replace("</body>", `<script data-qrc-navigation>${script}</script></body>`),
      );
    }
    server = http.createServer(async (req, res) => {
      try {
        const file = path.resolve(
          root,
          "." + decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname),
        );
        if (!file.startsWith(root + path.sep)) throw new Error("outside fixture");
        /** @type {Record<string, string>} */
        const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
        const mime = mimeTypes[path.extname(file)];
        if (mime) res.setHeader("Content-Type", mime);
        res.end(await fs.readFile(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    const activeServer = server;
    await new Promise((resolve) => activeServer.listen(0, "127.0.0.1", () => resolve(undefined)));
    const address = activeServer.address();
    assert(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    // Потребитель связывает импортированный каталог с настоящими HTML-целями
    // производителя. Переход проверяет совместную работу импорта и раскрытия.
    const catalogPath = path.join(root, "reference-catalog.json");
    const targets = Object.fromEntries(
      [
        ["sol-hidden", "book.html", undefined, "Ответ в книге"],
        ["sol-nested", "slides.html", "sec-start", "Ответ на слайде"],
      ].map(([id, file, slide, title]) => [
        `book:${id}`,
        {
          namespace: "book",
          id,
          page: file,
          fragment: id,
          ...(slide ? { slide } : {}),
          labelHtml: title,
          label: title,
          numberHtml: "",
          number: "",
          title,
        },
      ]),
    );
    await fs.writeFile(
      catalogPath,
      JSON.stringify({
        schema: "quarto-reference-catalog",
        generator: { quarto: "браузерная проверка" },
        publication: { title: "Курс-производитель" },
        targets,
      }),
    );
    const consumer = spawnSync(
      quarto,
      [
        "run",
        path.join(repo, "tests/fixtures/browser-consumer.ts"),
        catalogPath,
        base + "/",
        path.join(root, "consumer.html"),
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(consumer.status, 0, consumer.stdout + consumer.stderr);
    browser = await chromium.launch({
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    /** @type {string[]} */
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${base}/consumer.html`);
    assert.match(
      await page.locator("#external-sol-hidden").innerText(),
      /Ответ в книге.*Курс-производитель/,
    );
    assert.equal(await page.locator("#external-sol-hidden").getAttribute("rel"), "external");
    await page.locator("#external-sol-hidden").click();
    await page.waitForFunction(
      () =>
        document.querySelector(".collapse.show") &&
        document.querySelector("#nested-details")?.hasAttribute("open"),
    );
    assert.equal(new URL(page.url()).hash, "#sol-hidden");
    await page.goto(`${base}/consumer.html`);
    await page.locator("#external-sol-nested").click();
    await page.waitForFunction(() => window.Reveal?.isReady() && Reveal.getIndices().f === 2);
    assert.equal(
      await page.locator("#sol-nested").evaluate((node) => {
        /** @type {Element | null} */
        let parent = node;
        for (; parent; parent = parent.parentElement)
          if (parent.matches(".fragment") && !parent.classList.contains("visible")) return false;
        return true;
      }),
      true,
    );

    await page.goto(`${base}/book.html`);
    assert.equal(await page.locator("#nested-details").getAttribute("open"), null);
    assert.equal(await page.locator(".collapse.show").count(), 0);
    // Change the query too so this is an actual page arrival, not just a hash
    // transition within the already loaded page.
    await page.goto(`${base}/book.html?arrival=1#sol-hidden`);
    await page.waitForFunction(
      () =>
        document.querySelector(".collapse.show") &&
        document.querySelector("#nested-details")?.hasAttribute("open"),
    );
    assert.equal(await page.locator('[aria-controls][aria-expanded="true"]').count(), 1);
    await page.evaluate(() => {
      const details = document.querySelector("#nested-details");
      const collapse = document.querySelector(".collapse");
      if (!(details instanceof HTMLDetailsElement) || !collapse)
        throw new Error("Потеряны блоки fixture");
      details.open = false;
      bootstrap.Collapse.getOrCreateInstance(collapse).hide();
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".collapse:not(.show)") && !document.querySelector(".collapsing"),
    );
    // The current URL already has this hash, so no hashchange is guaranteed.
    await page.locator("#open-answer").click();
    await page.waitForFunction(
      () =>
        document.querySelector(".collapse.show") &&
        document.querySelector("#nested-details")?.hasAttribute("open"),
    );

    // The adapter is not coupled to Bootstrap's presence.
    await page.goto(`${base}/book.html`);
    await page.evaluate(() => {
      window.bootstrap = undefined;
      location.hash = "sol-hidden";
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".collapse.show") &&
        document.querySelector("#nested-details")?.hasAttribute("open"),
    );
    assert.equal(await page.locator('[aria-controls][aria-expanded="true"]').count(), 1);

    await page.goto(`${base}/slides.html?qrc-target=sol-zero#/sec-start`);
    await page.waitForFunction(() => window.Reveal?.isReady() && Reveal.getIndices().f === 0);
    assert.equal(
      await page
        .locator("#sol-zero")
        .evaluate((node) => node.closest(".fragment")?.classList.contains("visible")),
      true,
    );
    assert.equal(
      await page
        .locator("#sol-nested")
        .evaluate((node) => node.closest(".fragment")?.classList.contains("visible")),
      false,
    );
    await page.goto(`${base}/slides.html?qrc-target=sol-nested#/sec-start`);
    await page.waitForFunction(() => window.Reveal?.isReady() && Reveal.getIndices().f === 2);
    assert.equal(
      await page.locator("#sol-nested").evaluate((node) => {
        /** @type {Element | null} */
        let parent = node;
        for (; parent; parent = parent.parentElement)
          if (parent.matches(".fragment") && !parent.classList.contains("visible")) return false;
        return true;
      }),
      true,
    );
    await page.evaluate(() => Reveal.next());
    await page.waitForFunction(() => Reveal.getCurrentSlide().id === "sec-finish");
    // Flush animation/hash events: the stale qrc-target must never pull us back.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(await page.evaluate(() => Reveal.getCurrentSlide().id), "sec-finish");
    assert.deepEqual(errors, []);
    console.log(
      "ПРОЙДЕНО: внешние ссылки на свёрнутые HTML-блоки и вложенные фрагменты Revealjs; повторное раскрытие, индекс 0, работа без Bootstrap и переход вперёд",
    );
  } finally {
    if (browser) await browser.close();
    if (server) {
      const activeServer = server;
      await new Promise((resolve, reject) =>
        activeServer.close((error) => (error ? reject(error) : resolve(undefined))),
      );
    }
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
