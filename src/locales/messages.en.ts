import { messagesEnRbac } from "./messages-en-rbac";
import { messagesEnCore } from "./messages-en-core";

/** EN catalogue — same keys as messages.fr.ts */
export const messagesEn: Record<string, string> = {
  ...messagesEnRbac,
  ...messagesEnCore,
};
