import { setupLoginRedirect } from "./login-redirect";

export default defineBackground(() => {
  setupLoginRedirect();
});

