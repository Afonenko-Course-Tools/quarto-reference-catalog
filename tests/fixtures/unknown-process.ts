import { pathToFileURL } from "node:url";
const NativeCommand = Deno.Command;
Deno.Command = class extends NativeCommand {
  override output(): Promise<Deno.CommandOutput> {
    return Promise.reject(new TypeError("INTERNAL.STARTUP_INVARIANT"));
  }
};
await import(
  new URL("./_extensions/reference-catalog/entrypoints/post.ts", pathToFileURL(Deno.cwd() + "/"))
    .href
);
