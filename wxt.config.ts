import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    permissions: ["webRequest", "storage"],
    host_permissions: ["*://ufuture.uitm.edu.my/*"],
  },
  modules: ['@wxt-dev/module-svelte'],
});
