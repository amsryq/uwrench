import { setupLoginRedirect } from "../../lib/features/login-redirect";

export default defineBackground(() => {
  setupLoginRedirect();
});

