import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { isRecord } from "../_extensions/reference-catalog/infrastructure/import-config.ts";

/** Непроверенные данные остаются unknown до проверки потребителем. */
export function jsonValue(text: string): unknown {
  return JSON.parse(text);
}
export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Ожидался JSON-объект");
  return value;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Ожидался JSON-массив");
  return value;
}
export function strings(value: unknown): string[] {
  const values = array(value);
  if (!values.every((item): item is string => typeof item === "string")) {
    throw new Error("Ожидался массив строк");
  }
  return values;
}
export async function readCatalog(path: string) {
  return validateImportedCatalog(jsonValue(await Deno.readTextFile(path)), path);
}
export async function readSearch(path: string) {
  return array(jsonValue(await Deno.readTextFile(path))).map((value) => {
    const row = record(value);
    const { href, text } = row;
    if (typeof href !== "string" || typeof text !== "string") {
      throw new Error("Ожидались строковые href и text записи поиска");
    }
    return { ...row, href, text };
  });
}

/** Проверяет наличие конкретного результата, не маскируя пустую выборку. */
export function required<T>(value: T | undefined, message = "Отсутствует ожидаемый результат"): T {
  if (value === undefined) throw new Error(message);
  return value;
}
