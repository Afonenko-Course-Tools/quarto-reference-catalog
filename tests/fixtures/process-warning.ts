import { quarto } from "../../_extensions/reference-catalog/infrastructure/process.ts";
await quarto(["render", "."], Deno.cwd(), { MODE: "warning" });
