// Service Worker 注册脚本

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('Service Worker 注册成功:', registration.scope);

          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新的 Service Worker 可用
                  console.log('新版本可用，请刷新页面');
                  // 可以在这里显示更新提示
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker 注册失败:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('Service Worker 已注销');
      })
      .catch((error) => {
        console.error('Service Worker 注销失败:', error);
      });
  }
}
