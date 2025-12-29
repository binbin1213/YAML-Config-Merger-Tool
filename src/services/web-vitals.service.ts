import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

@Injectable({
  providedIn: 'root'
})
export class WebVitalsService {
  private isProduction = false; // 可通过环境变量配置

  constructor() {
    // 检测是否为生产环境
    this.isProduction = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? false
      : true;
  }

  /**
   * 初始化性能监控
   */
  init() {
    if (typeof window === 'undefined') return;

    // 监控 Core Web Vitals
    onCLS(this.logMetric); // Cumulative Layout Shift
    onINP(this.logMetric); // Interaction to Next Paint (替代 FID)
    onLCP(this.logMetric); // Largest Contentful Paint
    onFCP(this.logMetric); // First Contentful Paint
    onTTFB(this.logMetric); // Time to First Byte
  }

  /**
   * 记录性能指标
   */
  private logMetric = (metric: Metric) => {
    const { name, value, rating } = metric;

    // 控制台输出（开发环境）
    if (!this.isProduction) {
      console.log(`[Web Vitals] ${name}:`, {
        value: Math.round(value),
        rating: rating
      });
    }

    // 发送到分析平台（生产环境）
    if (this.isProduction) {
      this.sendToAnalytics(metric);
    }
  };

  /**
   * 发送性能指标到分析平台
   * 可以替换为 Google Analytics, Sentry, 或其他平台
   */
  private sendToAnalytics(metric: Metric) {
    const { name, value, rating, id } = metric;

    // 示例：发送到 Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: id,
        value: Math.round(value),
        custom_map: { metric_rating: rating }
      });
    }

    // 示例：发送到自定义后端
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     metric: name,
    //     value: Math.round(value),
    //     rating: rating,
    //     id: id,
    //     userAgent: navigator.userAgent,
    //     timestamp: new Date().toISOString()
    //   })
    // }).catch(err => console.error('Analytics send failed:', err));

    // 示例：发送到 Sentry
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureMessage(`Web Vitals: ${name}`, {
    //     level: rating === 'poor' ? 'warning' : 'info',
    //     extra: {
    //       metric: name,
    //       value: Math.round(value),
    //       rating: rating
    //     }
    //   });
    // }
  }

  /**
   * 手动记录自定义性能指标
   */
  recordCustomMetric(name: string, value: number) {
    const rating = value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor';

    const metric: Metric = {
      name: name as any,
      value,
      rating: rating as any,
      id: `custom-${Date.now()}`,
      delta: value,
      navigationType: 'navigate',
      entries: []
    };

    this.logMetric(metric);
  }

  /**
   * 测量操作时间
   */
  measureOperation(operationName: string, operation: () => void | Promise<void>) {
    const startTime = performance.now();

    const endOperation = () => {
      const duration = performance.now() - startTime;
      this.recordCustomMetric(`operation-${operationName}`, duration);

      if (duration > 100) {
        console.warn(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);
      }
    };

    const result = operation();

    if (result instanceof Promise) {
      return result.then(endOperation);
    } else {
      endOperation();
      return result;
    }
  }
}
