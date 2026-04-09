import { registerLoginRedirectListener } from "../../lib/features/login-redirect";

export default defineBackground(() => {
  registerLoginRedirectListener();
});
