import { messagesFrRbac } from "./messages-fr-rbac";
import { messagesFrCore } from "./messages-fr-core";

/** Catalogue FR — clés plates pour translate(). */
export const messagesFr: Record<string, string> = {
  ...messagesFrRbac,
  ...messagesFrCore,
};
