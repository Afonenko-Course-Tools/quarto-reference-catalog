import { attr, elements, hasClass, parseHtml, type Element, type Node } from "./html.ts";
import { relative } from "./files.ts";
function readable(node: Node): string {
  if ("tagName" in node && (["script", "style", "nav", "button"].includes(node.tagName) || hasClass(node, "anchorjs-link"))) return "";
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(readable).join(" ") : "";
}
/** Штатные индексы созданы до post-render; обновляем их текст из окончательного HTML. */
export async function updateSearch(root: string, indexFiles: string[], pages: Map<string, string>): Promise<void> {
  // Parse final linked bytes, never the pre-link Page.nodes. The lookup lives
  // only for this update and keeps the traversal's first match for duplicate IDs.
  const parsed = new Map<string, { main?: Element; ids: Map<string, Element> }>();
  for (const file of indexFiles) {
    const rows = JSON.parse(await Deno.readTextFile(file));
    if (!Array.isArray(rows)) throw new Error(`QRC неподдерживаемый поисковый индекс ${file}`);
    for (const row of rows) {
      if (typeof row.href !== "string" || typeof row.text !== "string") throw new Error(`QRC неподдерживаемая запись поискового индекса ${file}`);
      const url = new URL(row.href, "https://qrc.invalid/" + relative(root, file));
      const path = decodeURIComponent(url.pathname).slice(1);
      const page = pages.get(path);
      if (!page) continue;
      let selection = parsed.get(path);
      if (!selection) {
        const nodes = elements(parseHtml(page));
        const ids = new Map<string, Element>();
        for (const node of nodes) {
          const id = attr(node, "id");
          if (id !== undefined && !ids.has(id)) ids.set(id, node);
        }
        selection = { main: nodes.find((node) => node.tagName === "main"), ids };
        parsed.set(path, selection);
      }
      const fragment = decodeURIComponent(url.hash.slice(1));
      const selected = fragment ? selection.ids.get(fragment) : selection.main;
      if (selected) row.text = readable(selected).replace(/\s+/g, " ").trim();
    }
    await Deno.writeTextFile(file, JSON.stringify(rows, null, 2) + "\n");
  }
}
