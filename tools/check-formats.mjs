// Обнаружение собственных входов; синтаксис, стиль и семантику проверяют штатные CLI.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));
const mode = process.argv[2] ?? "check";
if (!["check", "write"].includes(mode) || process.argv.length > 3)
  throw Error("Ожидается check или write");
/** @param {string} bin @param {string[]} args */
const run = (bin, args) => execFileSync(bin, args, { stdio: "inherit" });
const listing = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
const files = [...new Set(listing.split("\0"))]
  .filter(
    (file) =>
      file && existsSync(file) && !/(^|\/)(vendor|node_modules|dependencies)(\/|$)/.test(file),
  )
  .sort();
for (const file of files.filter((file) => file.endsWith(".json")))
  JSON.parse(readFileSync(file, "utf8"));
const owned = files.filter(
  (file) =>
    !/(^|\/)(generated|_generated)(\/|$)/.test(file) &&
    !file.startsWith("_extensions/reference-catalog/types/") &&
    !file.startsWith("_extensions/reference-catalog/observability/bridge.") &&
    file !== "package-lock.json",
);
/** @param {RegExp} pattern */
const select = (pattern) => owned.filter((file) => pattern.test(file));
const pretty = select(/\.(?:ts|js|cjs|mjs|json|ya?ml|css)$/);
const lua = select(/(?:\.lua$|^\.luacheckrc$)/);
const shell = select(/\.sh$/);
const yaml = select(/\.ya?ml$/);
const css = select(/\.css$/);
if (!pretty.length || !lua.length || !shell.length || !yaml.length || !css.length)
  throw Error("Пустая область обязательной проверки");
run("prettier", [
  mode === "write" ? "--write" : "--check",
  "--ignore-path",
  "/dev/null",
  ...pretty,
]);
run("stylua", [...(mode === "check" ? ["--check"] : []), ...lua]);
run("shfmt", [mode === "write" ? "-w" : "-d", "-i", "2", "-ci", ...shell]);
if (mode === "check") {
  run("yamllint", ["--strict", "--config-file", ".yamllint.yml", ...yaml]);
  run(
    "actionlint",
    files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file)),
  );
  run("stylelint", ["--max-warnings", "0", ...css]);
  run("luacheck", ["--no-color", ...lua.filter((file) => file.endsWith(".lua"))]);
  run("shellcheck", ["--severity=style", ...shell]);
  for (const file of shell) run("bash", ["-n", file]);
}
console.log(
  JSON.stringify({
    mode,
    prettier: pretty.length,
    lua: lua.length,
    shell: shell.length,
    yaml: yaml.length,
    css: css.length,
  }),
);
