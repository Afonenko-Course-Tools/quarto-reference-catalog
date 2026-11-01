import * as Public from "../_extensions/reference-catalog/public.ts";
void Public;
import { validateImportedCatalog } from "../_extensions/reference-catalog/infrastructure/catalog-validation.ts";
import { parseImports } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import type {
  Catalog,
  Import,
  Target,
} from "../_extensions/reference-catalog/domain/model.ts";
type NotAny<T> = 0 extends (1 & T) ? never : true;
const catalog = validateImportedCatalog({}, "compile-only");
const checked: NotAny<typeof catalog.targets[string]> = true;
const target: Target = catalog.targets["book:sec-a"];
const imported: Import = parseImports({}, "/owner", [])[0];
const consumer = (value: Catalog) =>
  value.targets["book:sec-a"].number.toUpperCase();
target.page.toUpperCase();
target.labelHtml.toUpperCase();
target.number.toUpperCase();
imported.source.toUpperCase();
imported.baseUrl.toUpperCase();
imported.style?.toUpperCase();
target.defaultStyle?.toUpperCase();
void checked;
void consumer;

const importsNotAny: NotAny<Import["baseUrl"]> = true;
const sourceTitle: string | undefined = target.sourceTitle;
const publicationTitle: string | undefined = catalog.publication?.title;
void importsNotAny;
void sourceTitle;
void publicationTitle;
