import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Ask AI',
    description: 'AI reading assistant for paper PDFs and HTML pages.',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'tabs', 'webRequest'],
    host_permissions: ['<all_urls>'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: 'Ask AI',
    },
  },
});
