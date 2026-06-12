import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '英文论文阅读助手',
    description: '英文论文阅读助手：PDF/网页点击划选即译，支持全文 AI 讨论。',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'tabs', 'webRequest'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    action: {
      default_title: '英文论文阅读助手',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
      },
    },
  },
});
