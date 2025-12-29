import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './src/app.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { registerServiceWorker } from './src/service-worker-registration';
import { WebVitalsService } from './src/services/web-vitals.service';

// 注册 Service Worker
registerServiceWorker();

// 初始化性能监控
const webVitalsService = new WebVitalsService();
webVitalsService.init();

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
