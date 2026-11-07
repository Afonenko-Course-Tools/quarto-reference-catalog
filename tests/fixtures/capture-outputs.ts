export {};
const file = Deno.env.get("QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES");
const text = file ? await Deno.readTextFile(file) : Deno.env.get("QUARTO_PROJECT_OUTPUT_FILES");
if (text === undefined) throw new Error("Отсутствует текущий список native outputs");
await Deno.writeTextFile("current-outputs.json", JSON.stringify(text.split(/\r?\n/).filter(Boolean)));
