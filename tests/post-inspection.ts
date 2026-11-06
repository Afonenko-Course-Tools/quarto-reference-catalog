import { readCatalog } from "./support.ts";
import { dirname, fromFileUrl, join } from "stdlib/path";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = await Deno.makeTempDir({ prefix: "qrc-post-inspection-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
const stage = join(root, "current-output");
const trace = join(root, "commands.txt");
const inspectionFile = join(root, "inspection.json");
const executable = join(root, "inspect-only.sh");
const config = { project: { "output-dir": "other-output" }, "reference-catalog": { namespace: "book" } };
async function hook(inspection: unknown, fileList = false) {
  await Deno.writeTextFile(inspectionFile, JSON.stringify(inspection));
  await Deno.writeTextFile(trace, "");
  return await new Deno.Command(quarto, {
    args: ["run", join(repo, "_extensions/reference-catalog/entrypoints/post.ts")],
    cwd: root,
    env: {
      QUARTO: executable,
      QRC_INSPECTION: inspectionFile,
      QRC_COMMANDS: trace,
      QUARTO_PROFILE: "teacher,ru",
      QUARTO_PROJECT_OUTPUT_DIR: "current-output",
      QUARTO_PROJECT_OUTPUT_FILES: fileList ? "current-output/retained.html" : "current-output/current.html\n",
      QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES: fileList ? "outputs.txt" : "",
    },
    stdout: "piped", stderr: "piped",
  }).output();
}
try {
  await Deno.mkdir(stage);
  await Deno.writeTextFile(join(stage, "current.html"), "<html><body><p>Текущая страница</p></body></html>");
  const retained = '<div class="qrc-probes" data-qrc-namespace="book"><div class="qrc-probe" data-qrc-id="sec-broken" data-qrc-style="default"></div></div>';
  await Deno.writeTextFile(join(stage, "retained.html"), retained);
  await Deno.writeTextFile(join(root, "outputs.txt"), "current-output/current.html\n");
  await Deno.copyFile(new URL("./fixtures/inspect-only.sh", import.meta.url), executable);
  await Deno.chmod(executable, 0o700);
  for (const fileList of [false, true]) {
    const result = await hook({ config, quarto: { version: "1.11.5-fixture" } }, fileList);
    assert(result.success, `Post не использовал готовую версию inspect: ${new TextDecoder().decode(result.stderr)}`);
    const catalog = await readCatalog(join(stage, "reference-catalog-local.json"));
    assert(catalog.generator.quarto === "1.11.5-fixture", "Каталог потерял native версию inspect");
    assert((await Deno.readTextFile(trace)) === `inspect\n${root}\n--profile\nteacher,ru\n`, "Post изменил effective profiles или повторно запустил Quarto");
    assert(await Deno.readTextFile(join(stage, "retained.html")) === retained, "Post прочитал или изменил retained output вне текущего списка");
  }
  for (const nativeQuarto of [undefined, null, [], {}, { version: null }, { version: 1 }, { version: "" }, { version: " " }]) {
    await Deno.writeTextFile(join(stage, "reference-catalog-local.json"), "предыдущий результат");
    const result = await hook({ config, quarto: nativeQuarto });
    const stderr = new TextDecoder().decode(result.stderr).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
    assert(!result.success && stderr.includes("QRC.CONFIG_INVALID") && stderr.includes("quarto.version"), `Неверная диагностика native версии: ${stderr}`);
    assert(stderr.split("QRC.CONFIG_INVALID").length === 2 && !stderr.includes("at main"), `Диагностика должна быть единственной без stack: ${stderr}`);
    assert((await Deno.readTextFile(trace)) === `inspect\n${root}\n--profile\nteacher,ru\n`, "Некорректная версия запустила дополнительный Quarto");
    assert(await Deno.readTextFile(join(stage, "reference-catalog-local.json")) === "предыдущий результат", "Post изменил каталог с некорректной версией");
  }
  console.log("PASS post inspect: native версия, один вызов, profiles, текущие outputs и адресная диагностика без render");
} finally {
  await Deno.remove(root, { recursive: true });
}
