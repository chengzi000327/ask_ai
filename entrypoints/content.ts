export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    document.documentElement.dataset.askAiContent = 'ready';
  },
});
