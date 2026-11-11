import { fromFileUrl, join } from "stdlib/path";
import { quarto } from "../_extensions/reference-catalog/infrastructure/process.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const root = await Deno.makeTempDir({ prefix: "qrc-trace-" });
const saved = new Map(
  ["QUARTO", "COURSE_BUILD_TRACE"].map((name) => [name, Deno.env.get(name)]),
);
const trace = join(root, "trace.jsonl");
const relativeTrace = `relative-trace-${crypto.randomUUID()}.jsonl`;
async function outcome(mode: string) {
  try {
    return await quarto(
      [
        "render",
        ".",
        "--profile",
        "student",
        "--metadata-file",
        "PRIVATE_ARGUMENT",
      ],
      root,
      { MODE: mode },
    );
  } catch (error) {
    return String(error);
  }
}
try {
  const fake = join(root, "quarto.sh");
  await Deno.copyFile(new URL("./fixtures/process-tool.sh", import.meta.url), fake);
  await Deno.chmod(fake, 0o700);
  Deno.env.set("QUARTO", fake);
  Deno.env.delete("COURSE_BUILD_TRACE");
  let invalidArguments: unknown;
  try { await Reflect.apply(quarto, undefined, [null, root]); } catch (error) { invalidArguments = error; }
  assert(invalidArguments instanceof TypeError && invalidArguments.stack?.includes("process.ts"), `Internal argument failure must retain native TypeError/stack: ${invalidArguments}`);
  const originalCommand = Deno.Command;
  const invariant = new TypeError("INTERNAL.INVARIANT: command fixture");
  const originalStack = invariant.stack;
  try {
    Deno.Command = class extends originalCommand {
      override output(): Promise<Deno.CommandOutput> { return Promise.reject(invariant); }
    };
    let failure: unknown;
    try { await quarto(["inspect", root], root); } catch (error) { failure = error; }
    assert(failure === invariant && invariant.stack === originalStack, "Unknown command exception identity/stack must survive unchanged");
  } finally { Deno.Command = originalCommand; }
  const missing = join(root, "missing-quarto");
  Deno.env.set("QUARTO", missing);
  let startup: unknown;
  try { await quarto(["inspect", root], root); } catch (error) { startup = error; }
  assert(startup instanceof Error && startup.name === "ExternalToolFailure" && startup.cause instanceof Deno.errors.NotFound && "tool" in startup && "exitCode" in startup && "stdout" in startup && "stderr" in startup && startup.tool === missing && startup.exitCode === null && startup.stdout === "" && startup.stderr === startup.cause.message, `Operational startup refusal must preserve tool/cause: ${startup}`);
  Deno.env.set("QUARTO", fake);
  const baseline = await Promise.all([
    outcome("success"),
    outcome("warning"),
    outcome("failure"),
  ]);
  assert(baseline[1] === "PRIVATE_STDOUT\n", "Exit zero plus WARNING must remain success");
  let failure: unknown;
  try { await quarto(["render", "."], root, { MODE: "failure" }); } catch (error) { failure = error; }
  assert(failure instanceof Error && "tool" in failure && "exitCode" in failure && "stdout" in failure && "stderr" in failure && failure.name === "ExternalToolFailure" && failure.tool === fake && failure.exitCode === 23 && failure.stdout === "PRIVATE_STDOUT\n" && failure.stderr === "WARNING: PRIVATE_FAILURE\n" && failure.cause !== undefined, `Native failure lost tool/exit/streams/cause: ${failure}`);
  const probe = new URL("./fixtures/process-warning.ts", import.meta.url);
  const nativeQuarto = saved.get("QUARTO") || "quarto";
  const visible = await new Deno.Command(nativeQuarto, { args: ["run", fromFileUrl(probe)], cwd: root, stdout: "piped", stderr: "piped" }).output();
  assert(visible.success && new TextDecoder().decode(visible.stderr).includes("WARNING: PRIVATE_WARNING"), "Successful native stderr was hidden: " + new TextDecoder().decode(visible.stderr) + new TextDecoder().decode(visible.stdout));
  Deno.env.set("COURSE_BUILD_TRACE", trace);
  assert(await outcome("success") === baseline[0], "Отключённые метрики изменили результат");
  let exists=false;try{await Deno.stat(trace);exists=true;}catch(error){if(!(error instanceof Deno.errors.NotFound))throw error;}
  assert(!exists,"Legacy trace удалён: обычный режим не пишет журнал");
  console.log("PASS native command: выводы, ошибки, causes и отсутствие legacy trace");
} finally {
  for (const [name, value] of saved) {
    value === undefined ? Deno.env.delete(name) : Deno.env.set(name, value);
  }
  await Deno.remove(root, { recursive: true });
  try {
    await Deno.remove(relativeTrace);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}
