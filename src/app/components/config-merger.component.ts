import { Component, signal, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { YamlProcessorService } from '../services/yaml-processor.service';
import { HighlightService } from '../services/highlight.service';

import 'prismjs';
import 'prismjs/components/prism-yaml';

@Component({
  selector: 'app-config-merger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-merger.component.html',
  styleUrls: []
})
export class ConfigMergerComponent implements AfterViewInit {
  @ViewChild('outputPreview') outputPreview!: ElementRef;

  private yamlProcessor = inject(YamlProcessorService);
  private highlightService = inject(HighlightService);
  private sanitizer = inject(DomSanitizer);

  // 模板配置
  templateConfig = signal<string>('');
  customConfig = signal<string>('');

  // 输出
  mergedConfig = signal<string>('');
  highlightedOutput = signal<SafeHtml>('');

  // 状态
  isProcessing = signal<boolean>(false);
  error = signal<string>('');
  showPreview = signal<boolean>(false);

  // 预设模板
  presets = [
    { name: 'Clash 配置模板', content: this.getDefaultTemplate() },
    { name: '空模板', content: '' }
  ];

  constructor() {
    // 设置默认模板
    this.templateConfig.set(this.getDefaultTemplate());
  }

  ngAfterViewInit() {
    this.updateHighlight();
  }

  onTemplateChange(content: string) {
    this.templateConfig.set(content);
  }

  onCustomConfigChange(content: string) {
    this.customConfig.set(content);
  }

  async onFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const content = await this.readFile(file);
      this.customConfig.set(content);
      this.error.set('');
    } catch (err) {
      this.error.set('文件读取失败: ' + (err as Error).message);
    }
  }

  async mergeConfigs() {
    if (!this.templateConfig() || !this.customConfig()) {
      this.error.set('请提供模板配置和自定义配置');
      return;
    }

    this.isProcessing.set(true);
    this.error.set('');

    try {
      const template = this.yamlProcessor.parseYaml(this.templateConfig());
      const custom = this.yamlProcessor.parseYaml(this.customConfig());

      const merged = this.yamlProcessor.mergeConfigs(template, custom);
      const yamlOutput = this.yamlProcessor.stringifyYaml(merged);

      this.mergedConfig.set(yamlOutput);
      this.showPreview.set(true);

      // 延迟高亮以确保 DOM 已更新
      setTimeout(() => this.updateHighlight(), 0);
    } catch (err) {
      this.error.set('合并失败: ' + (err as Error).message);
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult() {
    const content = this.mergedConfig();
    if (!content) return;

    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e.target?.error);
      reader.readAsText(file);
    });
  }

  private updateHighlight() {
    if (this.outputPreview && this.mergedConfig()) {
      const highlighted = this.highlightService.highlight(this.mergedConfig(), 'yaml');
      this.highlightedOutput.set(this.sanitizer.bypassSecurityTrustHtml(highlighted));
    }
  }

  private getDefaultTemplate(): string {
    return `# YAML 配置模板
# 示例 Clash/Mihomo 配置

port: 7890
socks-port: 7891
mixed-port: 7892

dns:
  enable: true
  listen: 0.0.0.0:1053
  enhanced-mode: fake-ip
  nameserver:
    - 8.8.8.8
    - 8.8.4.4

proxies: []

proxy-groups:
  - name: "PROXY"
    type: select
    proxies:
      - DIRECT

rules:
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
`;
  }
}