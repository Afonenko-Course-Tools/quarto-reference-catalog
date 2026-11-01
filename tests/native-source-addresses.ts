import { bindConditionLinks } from "../_extensions/reference-catalog/public.ts";
const condition = {
  context: { input: "bank/index.qmd" },
  links: [
    "../other.qmd#target",
    "_downloads/exr-demo-starter.zip",
    "asset.pdf",
  ],
};
const result = bindConditionLinks(condition, {
  catalog: {
    schema: "quarto-reference-catalog",
    generator: { quarto: "1.11.5" },
    targets: {},
  },
  baseUrl: "https://pages.example/course/tasks/",
  sources: { "other.qmd": "renamed/other.html" },
  urls: {
    "_downloads/exr-demo-starter.zip": "_downloads/exr-demo-starter.zip",
  },
  resourceLinks: ["asset.pdf"],
});
if (
  result["../other.qmd#target"] !==
    "https://pages.example/course/tasks/renamed/other.html#target" ||
  Object.hasOwn(result, "asset.pdf")
) throw Error("Native source→output адресация не сохранена");
console.log("PASS actual native source→output map и явные resource links");

let foreignRejected = false;
try {
  bindConditionLinks({
    context: condition.context,
    links: ["//foreign.example/other.qmd"],
  }, {
    catalog: {
      schema: "quarto-reference-catalog",
      generator: { quarto: "1.11.5" },
      targets: {},
    },
    baseUrl: "https://pages.example/course/tasks/",
    sources: { "other.qmd": "renamed/other.html" },
  });
} catch (cause) {
  foreignRejected = String(cause).includes("QRC.REFERENCE_INVALID");
}
if (!foreignRejected) {
  throw Error("Чужой URL нельзя сопоставлять по pathname с native source");
}
