/* Typed keys for `t()`: the cs catalog is the source. A key that does not exist in it is a
   TypeScript error, so `npm run typecheck` finds a wrong key. */
import "i18next";
import type { SourceResources } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: SourceResources;
    returnNull: false;
  }
}
