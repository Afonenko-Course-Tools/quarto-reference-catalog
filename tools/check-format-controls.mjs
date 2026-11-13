// Контроли проходят через тот же gate и его штатное обнаружение новых файлов.
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));
/** @type {string[]} */
const temporary = [];
const dependencyDirectory = "tests/fixtures/dependencies";
let directoryCreated = false;
function run(env = process.env) {
  const result = spawnSync(process.execPath, ["tools/check-formats.mjs"], {
    encoding: "utf8",
    env,
  });
  return {
    status: result.status,
    output: String(result.stdout ?? "") + String(result.stderr ?? ""),
  };
}
/** @param {string} file @param {string} source */
function put(file, source) {
  if (existsSync(file)) throw Error("Контрольный путь занят: " + file);
  writeFileSync(file, source);
  temporary.push(file);
}
function clean() {
  for (const file of temporary.splice(0)) unlinkSync(file);
}
/** @param {{status: number | null, output: string}} result @param {RegExp} diagnostic @param {string} name */
function expect(result, diagnostic, name) {
  if (result.status === 0 || !diagnostic.test(result.output))
    throw Error("Контроль не обнаружен: " + name + "\n" + result.output);
  console.log(JSON.stringify({ control: name, status: "rejected" }));
}
try {
  if (existsSync(dependencyDirectory))
    throw Error("Контрольный каталог занят: " + dependencyDirectory);
  mkdirSync(dependencyDirectory);
  directoryCreated = true;
  const positive = run();
  if (positive.status !== 0) throw Error("Исходный gate не проходит:\n" + positive.output);
  /** @type {[string, string][]} */
  const positiveFiles = [
    ["tests/__format_discovery.ts", "export const discovered = 1;\n"],
    ["tests/__format_discovery.lua", "return {}\n"],
    ["tests/__format_discovery.sh", "#!/usr/bin/env bash\nprintf '%s\\n' ok\n"],
    ["tests/__format_discovery.yml", "discovered: true\n"],
    ["tests/__format_discovery.json", '{ "discovered": true }\n'],
    ["tests/__format_discovery.css", "a {\n  color: red;\n}\n"],
    [dependencyDirectory + "/__format_discovery.toml", "discovered = true\n"],
  ];
  for (const [file, source] of positiveFiles) put(file, source);
  const discovered = run();
  clean();
  if (discovered.status !== 0)
    throw Error("Новые корректные файлы не приняты:\n" + discovered.output);
  console.log(JSON.stringify({ control: "new files", status: "passed" }));
  /** @type {[string, string, RegExp][]} */
  const negative = [
    ["tests/__format_negative.json", "{", /JSON|SyntaxError/],
    ["tests/__format_negative.ts", "export const unformatted=1;\n", /Code style issues/],
    ["tests/__format_negative.lua", "return misspelled_global\n", /undefined variable/],
    [
      "tests/__format_negative.sh",
      "#!/usr/bin/env bash\nprintf '%s\\n' \"$missing_variable\"\n",
      /SC2154/,
    ],
    ["tests/__format_negative.css", "a {\n  unknown-property: 1;\n}\n", /property-no-unknown/],
    ["tests/__format_negative.yml", "duplicate: 1\nduplicate: 2\n", /duplicat|Map keys/],
    [
      dependencyDirectory + "/__format_negative.ts",
      "export const unformatted=1;\n",
      /Code style issues/,
    ],
    [
      dependencyDirectory + "/__format_negative.toml",
      "duplicate = 1\nduplicate = 2\n",
      /duplicate|conflicting/,
    ],
    [dependencyDirectory + "/__format_style.toml", "value=1\n", /not properly formatted/],
    ["tests/__format_warning.yml", "truthy: yes\n", /truthy/],
  ];
  for (const [file, source, diagnostic] of negative) {
    put(file, source);
    const result = run();
    clean();
    expect(result, diagnostic, file);
  }
  const workflow = ".github/workflows/__format_negative.yml";
  const source =
    "on: push\njobs:\n  check:\n    runs-on: ubuntu-latest\n    unknown-field: true\n    steps:\n      - run: echo ok\n";
  put(
    workflow,
    execFileSync("prettier", ["--stdin-filepath", workflow], { input: source, encoding: "utf8" }),
  );
  const semantic = run();
  clean();
  expect(semantic, /unexpected key "unknown-field"/, "actionlint new workflow");
  put(
    "tools/__quality_typecheck.mjs",
    '/** @type {number} */\nexport const incorrect = "string";\n',
  );
  const typed = spawnSync(
    process.execPath,
    ["node_modules/typescript/bin/tsc", "--project", "typecheck/node.json"],
    { encoding: "utf8" },
  );
  clean();
  expect(
    { status: typed.status, output: String(typed.stdout ?? "") + String(typed.stderr ?? "") },
    /__quality_typecheck.mjs.*TS2322/,
    "strict new mjs helper",
  );
  put(
    dependencyDirectory + "/__quality_typecheck.ts",
    'export const incorrect: number = "string";\n',
  );
  const deno = spawnSync("quarto", ["run", "tools/check-types.ts", "--typescript"], {
    encoding: "utf8",
  });
  clean();
  const denoOutput = String(deno.stdout ?? "") + String(deno.stderr ?? "");
  if (!denoOutput.includes("__quality_typecheck.ts"))
    throw Error("Новый собственный dependencies TS не обнаружен");
  expect({ status: deno.status, output: denoOutput }, /TS2322/, "strict new dependencies TS");
  expect(run({ ...process.env, PATH: "/nonexistent-quality-tools" }), /ENOENT/, "missing tool");
} finally {
  clean();
  if (directoryCreated) rmdirSync(dependencyDirectory);
}
