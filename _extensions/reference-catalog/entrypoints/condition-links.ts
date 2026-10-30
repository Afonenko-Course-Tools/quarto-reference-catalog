import { diagnostic } from "../diagnostics.ts";
import { createBodyLinks } from "./body-links.ts";
import type { Target } from "../domain/model.ts";

export interface ConditionLinkDestination {
  catalog: unknown;
  baseUrl: string;
  importedTargets?: Target[];
  /** Ключ — ссылка позднего тела; output предоставляет Publisher. */
  urls?: Record<string, string>;
  references?: Record<string, { key: string; style?: string }>;
}

/** Адреса выбранного условия без повторного чтения/преобразования его тела. */
export function bindConditionLinks(
  condition: { context: { input: string }; links: readonly string[] },
  destination: ConditionLinkDestination,
): Record<string, string> {
  const resolver = createBodyLinks(destination);
  const result: Record<string, string> = Object.create(null);
  for (const link of condition.links) {
    // Полный набор локальных IDs и их проверка принадлежат Core writer.
    if (link.startsWith("#")) continue;
    const reference = Object.hasOwn(destination.references ?? {}, link)
      ? destination.references![link]
      : undefined;
    if (reference) {
      result[link] = resolver.resolve(
        reference.key,
        reference.style ?? "default",
        condition.context.input,
      ).href;
      continue;
    }
    const explicit = Object.hasOwn(destination.urls ?? {}, link)
      ? destination.urls![link]
      : undefined;
    const address = explicit ??
      (/^(https?:|mailto:)/i.test(link) ? link : undefined);
    try {
      if (
        !address ||
        [...address].some((c) =>
          c.charCodeAt(0) <= 32 || c === "<" || c === ">"
        )
      ) throw Error("URL");
      const url = new URL(address, destination.baseUrl);
      if (!["https:", "http:", "mailto:"].includes(url.protocol)) {
        throw Error("URL");
      }
      result[link] = url.href;
    } catch (cause) {
      throw diagnostic(
        "QRC.REFERENCE_INVALID",
        "Для ссылки условия нужен явный конечный адрес или цель каталога",
        { source: condition.context.input, id: link, field: "links" },
        cause,
      );
    }
  }
  return result;
}
