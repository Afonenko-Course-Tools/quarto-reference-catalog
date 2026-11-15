/** Единственный исходный словарь преобразуется в статические проекции сред исполнения. */
export function referenceStyleVocabulary(value: unknown): string[] {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !("referenceStyles" in value)
  ) {
    throw new Error("Словарь должен содержать только referenceStyles");
  }
  const styles = value.referenceStyles;
  if (
    !Array.isArray(styles) ||
    !styles.length ||
    !styles.every(
      (style: unknown): style is string =>
        typeof style === "string" && /^[a-z][a-z0-9-]*$/.test(style),
    ) ||
    new Set(styles).size !== styles.length
  ) {
    throw new Error("referenceStyles должен быть непустым списком уникальных технических имён");
  }
  return styles;
}
export function vocabularyProjections(styles: string[]): Map<string, string> {
  const header =
    "Создано tools/generate-vocabulary.ts из vocabulary/reference-styles.json. Не редактировать вручную.";
  const quoted = styles.map((style) => JSON.stringify(style));
  return new Map([
    [
      "_extensions/reference-catalog/domain/generated/reference-styles.ts",
      `// ${header}\nexport const referenceStyles = [${quoted.join(", ")}] as const;\n`,
    ],
    [
      "_extensions/reference-catalog/lua/generated/reference-styles.lua",
      `-- ${header}\nreturn {\n${quoted.map((style) => `  [${style}] = true,`).join("\n")}\n}\n`,
    ],
  ]);
}
