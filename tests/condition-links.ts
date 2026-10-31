import { dirname, fromFileUrl, join, toFileUrl } from "stdlib/path";
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const api = await import(
  toFileUrl(join(repo, "_extensions/reference-catalog/public.ts")).href
).catch(() => undefined);
const assert = (value: unknown, message: string) => {
  if (!value) throw Error(message);
};
assert(
  typeof api?.bindConditionLinks === "function",
  "B1 RED: QRC не привязывает ссылки публичного condition",
);
const target = (
  namespace: string,
  id: string,
  page: string,
  fragment = id,
) => ({
  namespace,
  id,
  page,
  fragment,
  label: "Подпись",
  labelHtml: "Подпись",
  number: "1",
  numberHtml: "1",
});
const catalog = {
  schema: "quarto-reference-catalog",
  generator: { quarto: "1.11.5" },
  targets: {
    "theory:sec-types": target("theory", "sec-types", "theory/types.html"),
  },
};
const condition = {
  context: { input: "/owner/tasks/bank.qmd" },
  links: [
    "#details",
    "other.qmd#section",
    "starter.zip",
    "theory:sec-types",
    "os:sec-memory",
    "https://docs.example.test/help?q=1#guide",
  ],
};
const destination = {
  catalog,
  baseUrl: "https://pages.example.test/course/",
  importedTargets: [{
    ...target("os", "sec-memory", "chapters/memory.html"),
    baseUrl: "https://pages.example.test/os/",
  }],
  references: {
    "theory:sec-types": { key: "theory:sec-types", style: "title" },
    "os:sec-memory": { key: "os:sec-memory", style: "external" },
  },
  urls: {
    "other.qmd#section": "projects/other/output.html#section",
    "starter.zip": "_downloads/exr-demo-starter.zip",
  },
};
const links = api!.bindConditionLinks(condition, destination);
assert(
  links["other.qmd#section"] ===
    "https://pages.example.test/course/projects/other/output.html#section",
  "QRC угадал output вместо явного конечного адреса",
);
assert(
  links["starter.zip"] ===
    "https://pages.example.test/course/_downloads/exr-demo-starter.zip",
  "Self-download требует хеш ZIP или потерял publication base",
);
assert(
  links["theory:sec-types"] ===
    "https://pages.example.test/course/theory/types.html#sec-types",
  "Потерян каталог назначения",
);
assert(
  links["os:sec-memory"] ===
    "https://pages.example.test/os/chapters/memory.html#sec-memory",
  "Импорт получил базу текущего курса",
);
assert(
  links["https://docs.example.test/help?q=1#guide"] ===
    "https://docs.example.test/help?q=1#guide",
  "Изменена внешняя ссылка",
);
assert(
  !Object.hasOwn(links, "#details"),
  "Локальный anchor должен проверять Core по полному телу",
);
function refused(use: () => unknown, marker: string) {
  let error = "";
  try {
    use();
  } catch (cause) {
    error = String(cause);
  }
  assert(
    error.includes(marker) && error.includes("/owner/tasks/bank.qmd"),
    "Нет адресного отказа: " + error,
  );
}
refused(
  () =>
    api!.bindConditionLinks(
      { ...condition, links: ["missing.qmd"] },
      destination,
    ),
  "QRC.REFERENCE_INVALID",
);
refused(
  () =>
    api!.bindConditionLinks(condition, {
      ...destination,
      urls: { ...destination.urls, "starter.zip": "file:///private.zip" },
    }),
  "QRC.REFERENCE_INVALID",
);
refused(
  () =>
    api!.bindConditionLinks(condition, {
      ...destination,
      urls: { ...destination.urls, "starter.zip": "javascript:alert(1)" },
    }),
  "QRC.REFERENCE_INVALID",
);
refused(
  () =>
    api!.bindConditionLinks(condition, {
      ...destination,
      references: {
        ...destination.references,
        "theory:sec-types": { key: "theory:missing" },
      },
    }),
  "QRC.TARGET_UNKNOWN",
);
console.log(
  "PASS condition→QRC: конечные outputs, anchors, imports, стабильная self-download ссылка и адресные отказы",
);
