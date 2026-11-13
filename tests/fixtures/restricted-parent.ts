import { fileURLToPath } from "node:url";
import { quarto } from "../../_extensions/reference-catalog/infrastructure/process.ts";
const script = fileURLToPath(new URL("./print-env.sh", import.meta.url));
const output = await quarto([script], Deno.cwd(), {
  FUNCTIONAL_EXPLICIT: "override",
  QUARTO_PROFILE: "student",
});
console.log(output);
