import { Component, signal, inject, AfterViewInit, SecurityContext, ViewChild, ElementRef, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { YamlProcessorService } from '../services/yaml-processor.service';
import { HighlightService } from '../services/highlight.service';

import 'prismjs';
import 'prismjs/components/prism-yaml';

@Component({
  selector: 'app-config-merger',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="flex flex-col w-full gap-4 h-full">
      
      <!-- Instructions / Top Bar -->
      <div class="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center shadow-sm flex-wrap gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">配置文件合并工具</h2>
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <span class="px-2 py-1 rounded-md" [class.bg-[var(--primary)]]="currentStep() === 1">1. 选择模版</span>
            <span>→</span>
            <span class="px-2 py-1 rounded-md" [class.bg-[var(--primary)]]="currentStep() === 2">2. 导入订阅</span>
            <span>→</span>
            <span class="px-2 py-1 rounded-md" [class.bg-[var(--primary)]]="currentStep() === 3">3. 下载结果</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
             
             <!-- Compatibility Toggle -->
             <div class="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                <div class="flex flex-col items-end">
                   <span class="text-xs font-medium text-slate-200">{{ compatibilityMode() ? '兼容模式' : 'Smart模式' }}</span>
                   <span class="text-[10px] font-medium text-red-500">{{ compatibilityMode() ? '未开启Smart内核（兼容模式）' : 'Smart内核（需开启Smart内核）' }}</span>
                </div>
                <button 
                  role="switch" 
                  [attr.aria-checked]="compatibilityMode()"
                  (click)="toggleCompatibility()"
                  [class.bg-indigo-600]="compatibilityMode()"
                  [class.bg-slate-600]="!compatibilityMode()"
                  class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                  <span 
                    [class.translate-x-5]="compatibilityMode()"
                    [class.translate-x-0]="!compatibilityMode()"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                </button>
             </div>

             <button 
              (click)="processMerge()"
              class="px-4 py-2 bg-indigo-600 hover:bg-[var(--primary)] text-white text-sm font-medium rounded-md transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新合并
            </button>
            <button 
              (click)="downloadResult()"
              [disabled]="!mergedOutput()"
              class="px-4 py-2 bg-emerald-600 hover:bg-[var(--primary)] disabled:bg-slate-800/50 disabled:text-slate-500 disabled:border disabled:border-slate-700/50 disabled:shadow-none text-white text-sm font-medium rounded-md transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载 YAML
            </button>
        </div>
      </div>

      <!-- Main Editor Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 flex-1 h-full">
        
        <!-- Column 1: Template -->
        <div class="flex flex-col gap-1 flex-1 min-h-0 bg-[rgb(30,30,35)] rounded-[10px] p-4">
          <div class="card-header flex items-center mb-4">
            <h3 class="text-white text-base font-bold flex items-center gap-2 border-b border-[var(--primary)] pb-2">
              <!-- Icon Placeholder: Template -->
              <span class="w-4 h-4 flex items-center justify-center text-slate-400">📄</span>
              基础模版 (Template)
            </h3>
            <div class="flex gap-2">
              <button class="text-xs text-blue-400 hover:text-[var(--primary)] transition-colors" (click)="copyTemplate()">复制</button>
              <button class="text-xs text-blue-400 hover:text-[var(--primary)] transition-colors" (click)="clearTemplate()">清空</button>
              <label class="cursor-pointer text-xs text-blue-400 hover:text-[var(--primary)] transition-colors">
                <input type="file" class="hidden" (change)="onFileSelected($event, 'template')">
                上传
              </label>
            </div>
          </div>
          <div class="relative flex-1 h-full">
            <pre class="absolute inset-0 w-full h-full p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none resize-none custom-scroll leading-relaxed whitespace-pre"><code #templateCode class="language-yaml"></code></pre>
          </div>
        </div>

        <!-- Column 2: User Config -->
        <div class="flex flex-col gap-1 flex-1 min-h-0 bg-[rgb(30,30,35)] rounded-[10px] p-4">
          <div class="card-header flex items-center mb-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2 border-b border-[var(--primary)] pb-2">
              <!-- Icon Placeholder: User Config -->
              <span class="w-4 h-4 flex items-center justify-center text-slate-400">👤</span>
              您的订阅配置 (User Config)
            </h3>
            <div class="flex gap-2">
              <button class="text-xs text-purple-400 hover:text-[var(--primary)] transition-colors" (click)="copyUser()">复制</button>
              <button class="text-xs text-purple-400 hover:text-[var(--primary)] transition-colors" (click)="clearUser()">清空</button>
              <label class="cursor-pointer text-xs text-purple-400 hover:text-[var(--primary)] transition-colors">
                <input type="file" class="hidden" (change)="onFileSelected($event, 'user')">
                上传
              </label>
            </div>
          </div>
          <div class="relative flex-1 h-full">
            <pre class="absolute inset-0 w-full h-full p-4 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none resize-none custom-scroll leading-relaxed whitespace-pre"><code #userCode class="language-yaml"></code></pre>
          </div>
        </div>

        <!-- Column 3: Merged Result -->
        <div class="flex flex-col gap-1 flex-1 min-h-0 bg-[rgb(30,30,35)] rounded-[10px] p-4">
          <div class="card-header flex items-center mb-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2 border-b border-[var(--primary)] pb-2">
              <!-- Icon Placeholder: Merged Result -->
              <span class="w-4 h-4 flex items-center justify-center text-slate-400">✨</span>
              合并结果 (Result)
            </h3>
            <div class="flex gap-2">
              <button class="text-xs text-emerald-500/80 hover:text-[var(--primary)] transition-colors" (click)="copyMergedOutput()">复制</button>
              @if (statusMessage()) {<span class="text-xs text-emerald-500/80">{{ statusMessage() }}</span>}
            </div>
          </div>
          <div class="relative flex-1 h-full">
            <pre class="absolute inset-0 w-full h-full p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-100/90 focus:outline-none resize-none custom-scroll leading-relaxed whitespace-pre"><code #mergedCode class="language-yaml" [innerHTML]="mergedOutput()"></code></pre>
          </div>
        </div>

      </div>
    </div>
  `
})
export class ConfigMergerComponent implements AfterViewInit {
  private yamlService = inject(YamlProcessorService);
  private highlightService = inject(HighlightService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('mergedCode') mergedCode!: ElementRef<HTMLElement>;
  @ViewChild('templateCode') templateCode!: ElementRef<HTMLElement>;
  @ViewChild('userCode') userCode!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    this.highlightService.highlightAll();
    this.highlightMergedCode();
    this.highlightTemplateCode();
    this.highlightUserCode();
  }

  templateContent = signal<string>('');
  userContent = signal<string>('');
  mergedOutput = signal<SafeHtml>(this.sanitizer.bypassSecurityTrustHtml(''));
  statusMessage = signal<string>('');
  compatibilityMode = signal<boolean>(false); // Default to True to fix crashes
  currentStep = signal<number>(1);

  constructor() {
    // Set the provided complex template as default
    this.templateContent.set(DEFAULT_TEMPLATE);

    // 监听合并结果变更并触发高亮
    effect(() => {
      this.mergedOutput();
      setTimeout(() => this.highlightMergedCode(), 0);
    });

    effect(() => {
      this.templateContent();
      setTimeout(() => this.highlightTemplateCode(), 0);
    });

    effect(() => {
      this.userContent();
      setTimeout(() => this.highlightUserCode(), 0);
    });
  }

  private highlightMergedCode() {
    if (this.mergedCode?.nativeElement) {
      this.highlightService.highlightElement(this.mergedCode.nativeElement);
    }
  }

  private highlightTemplateCode() {
    if (this.templateCode?.nativeElement) {
      this.templateCode.nativeElement.textContent = this.templateContent();
      this.highlightService.highlightElement(this.templateCode.nativeElement);
    }
  }

  private highlightUserCode() {
    if (this.userCode?.nativeElement) {
      this.userCode.nativeElement.textContent = this.userContent();
      this.highlightService.highlightElement(this.userCode.nativeElement);
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.statusMessage.set('已复制到剪贴板！');
      setTimeout(() => this.statusMessage.set(''), 2000);
    }).catch(err => {
      console.error('复制失败:', err);
      this.statusMessage.set('复制失败！');
    });
  }

  copyTemplate() {
    this.copyToClipboard(this.templateContent());
  }

  clearTemplate() {
    this.templateContent.set('');
    this.processMerge();
  }

  copyUser() {
    this.copyToClipboard(this.userContent());
  }

  clearUser() {
    this.userContent.set('');
    this.processMerge();
  }

  copyMergedOutput() {
    // Extract plain text from SafeHtml
    const div = document.createElement('div');
    div.innerHTML = this.sanitizer.sanitize(SecurityContext.HTML, this.mergedOutput() as SafeHtml) || '';
    const plainText = div.innerText;
    this.copyToClipboard(plainText);
  }

  updateTemplate(event: Event) {
    this.templateContent.set((event.target as HTMLTextAreaElement).value);
    this.currentStep.set(1);
    this.processMerge();
  }

  updateUser(event: Event) {
    this.userContent.set((event.target as HTMLTextAreaElement).value);
    this.currentStep.set(2);
    this.processMerge();
  }

  toggleCompatibility() {
    this.compatibilityMode.update(v => !v);
    this.processMerge();
  }

  onFileSelected(event: Event, type: 'template' | 'user') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // 校验文件类型
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
        this.statusMessage.set('错误：仅支持 YAML (.yaml/.yml) 文件 ❌');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (type === 'template') {
          this.templateContent.set(text);
        } else {
          this.userContent.set(text);
        }
        this.processMerge();
      };
      reader.readAsText(file);
    }
  }

  async processMerge() {
    if (!this.templateContent() || !this.userContent()) {
       this.statusMessage.set('等待输入...');
       return;
    }

    this.statusMessage.set('处理中...');
    try {
      const result = await this.yamlService.mergeConfigs(
        this.templateContent(),
        this.userContent(),
        this.compatibilityMode()
      );

      if (!result) {
        throw new Error('合并结果为空');
      }

      const highlightedKeys = this.yamlService.getHighlightedKeys();
      let highlightedResult = this.highlightService.highlight(result, 'yaml');
      console.log('Highlighted Result:', highlightedResult);

      // Apply custom highlighting for user-derived keys
      highlightedKeys.forEach(key => {
        // This regex targets the key itself, ensuring it's not part of a larger word
        // and handles potential YAML structure (e.g., key: value, - key: value)
        const regex = new RegExp(`(\\\\b${key}\\\\b)(?=\\\\s*:)`, 'g');
        highlightedResult = highlightedResult.replace(regex, `<span style="background-color: rgba(185, 174, 245, 0.15);">$1</span>`);
      });

      this.mergedOutput.set(this.sanitizer.bypassSecurityTrustHtml(highlightedResult));
      const modeText = this.compatibilityMode() ? '兼容模式' : '原版模式';
      this.statusMessage.set(`合并成功 (${modeText}) ✅`);
      this.currentStep.set(3);
    } catch (err) {
      console.error('合并失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      this.statusMessage.set(`错误：${errorMessage} ❌`);
    }
  }

  downloadResult() {
    if (!this.mergedOutput()) return;
    // Extract plain text from SafeHtml
    const div = document.createElement('div');
    div.innerHTML = this.sanitizer.sanitize(SecurityContext.HTML, this.mergedOutput() as SafeHtml) || '';
    const plainText = div.innerText;

    const blob = new Blob([plainText], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.yaml';
    a.click();
    // 释放 URL 资源
    window.URL.revokeObjectURL(url);
  }
}

const DEFAULT_TEMPLATE = `# ========================
# Clash-ALL 优化配置
# ========================

# 机场节点订阅

proxy-providers:

  订阅提供商:
    url: "机场订阅地址"
    type: http
    interval: 86400
    health-check:
      enable: true
      url: "YOUR_SUBSCRIPTION_ADDRESS_HERE"
      interval: 300
    proxy: 直连 
proxies:
  - {name: 直连, type: direct}
  - {name: 拒绝, type: reject}

# ========================
# 主要端口设置
# ========================
port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
tproxy-port: 7895

allow-lan: true
mode: rule
log-level: info

external-controller: 0.0.0.0:9090
# external-ui: ui
# external-ui-name: zashboard
# external-ui-url: https://gh-proxy.com/github.com/Zephyruso/zashboard/archive/refs/heads/gh-pages.zip
secret: "123456"

# ========================
# DNS 设置
# ========================
dns:
  ipv6: true  # 若你的网络不支持IPv6，可改为false
  enable: true
  enhanced-mode: fake-ip  # 高效解析模式，搭配分流更优
  fake-ip-filter:
    - +.lan       # 本地局域网域名
    - +.local     # 本地域名
    - geosite:cn  # 国内域名（不使用fake-ip，用真实IP解析）
  fake-ip-filter-mode: blacklist  # 黑名单模式：列表内域名不用fake-ip
  fake-ip-range: 198.20.0.1/16   # fake-ip地址段，默认即可
  listen: 0.0.0.0:7874           # DNS监听端口，保持你的配置
  nameserver:  # 基础DNS（国内优先用公共DNS）
    - 223.5.5.5        # 阿里云公共DNS（国内快）
    - 119.29.29.29     # 腾讯公共DNS（国内快）
  nameserver-policy:  # 分流策略：按域名归属地切换DNS
    # 境外域名 → 用加密DNS（防污染）
    'geosite:!cn':
      - https://223.5.5.5/dns-query  # 阿里云DoH（国内可用的加密DNS）
      - https://dns.pub/dns-query    # 公共DoH（稳定防污染）
      - tls://8.8.4.4                # Google DoT（需确保能访问）
    # 国内域名 → 用公共DNS（速度快）
    'geosite:cn':
      - 223.5.5.5
      - 119.29.29.29
  fallback:  # 兜底DNS（解析失败时自动切换）
    - https://cloudflare-dns.com/dns-query  # Cloudflare DoH（全球稳定）
  fallback-filter:  # 兜底触发条件
    geoip: true     # 境外IP解析失败时用兜底DNS
    ipcidr:
      - 0.0.0.0/0   # 所有IP段都生效

ipv6: false

# ========================
# TUN 模块
# ========================
tun:
  enable: true
  stack: gvisor
  device: utun
  endpoint-independent-nat: true
  auto-route: false
  auto-detect-interface: false
  auto-redirect: false
  strict-route: false

profile:
  store-selected: true
  store-fake-ip: true

# ========================
# 策略组定义
# ========================

# 1. 定义默认策略（默认走代理，适合国外服务）
default: &default
  type: select
  proxies:
    - 所有-智选  # <--- 默认第一顺位：自动测速
    - 所有-手选
    - 香港-智选
    - 香港-手选
    - 台湾-手选
    - 日本-手选
    - 新加坡-手选
    - 韩国-手选
    - 美国-手选
    - 英国-手选
    - 其他-手选
    - 直连      # <--- 直连放后面
    - 拒绝

# 2. 定义直连策略（默认直连，适合国内/下载）
default-direct: &default-direct
  type: select
  proxies:
    - 直连      # <--- 默认第一顺位：直连
    - 所有-智选
    - 所有-手选
    - 香港-智选
    - 其他-手选
    - 拒绝

proxy-groups:

  # 业务分流组

  - {name: ChatGPT, <<: *default}
  - {name: Gemini, <<: *default}
  - {name: Copilot, <<: *default}
  - {name: Perplexity, <<: *default}
  - {name: Claude, <<: *default}
  - {name: Meta AI, <<: *default}
  - {name: GitHub, <<: *default}
  - {name: Reddit, <<: *default}
  - {name: Telegram, <<: *default}
  - {name: WhatsApp, <<: *default}
  - {name: Facebook, <<: *default}
  - {name: YouTube, <<: *default}
  - {name: TikTok, <<: *default}
  - {name: Netflix, <<: *default}
  - {name: HBO, <<: *default}
  - {name: Disney, <<: *default}
  - {name: Amazon, <<: *default}
  - {name: Crunchyroll, <<: *default}
  - {name: Spotify, <<: *default}
  - {name: Nvidia, <<: *default}
  - {name: Crypto, <<: *default}
  - {name: Google, <<: *default}
  - {name: Test, <<: *default}
  - {name: Block, <<: *default}
  - {name: 国外, <<: *default}
  - {name: 其他, <<: *default}

  # 直连优先组 (节省流量/CDN优化)
  - {name: Apple, <<: *default-direct}
  - {name: Microsoft, <<: *default-direct}
  - {name: Steam, <<: *default-direct}
  - {name: Games, <<: *default-direct}
  - {name: 国内, <<: *default-direct}

  # 所有组

  - name: 所有-手选
    type: select
    include-all: true
    filter: "^((?!(直连|拒绝)).)*$"

  - name: 所有-智选
    type: smart
    include-all: true
    policy-priority: "香港:1.2;牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "^((?!(直连|拒绝)).)*$"

  # 香港组

  - name: 香港-手选
    type: select
    include-all: true
    filter: "(?=.*(广港|香港|HK|Hong Kong|🇭🇰|HongKong)).*$"

  - name: 香港-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广港|香港|HK|Hong Kong|🇭🇰|HongKong)).*$"

  # 台湾组

  - name: 台湾-手选
    type: select
    include-all: true
    filter: "(?=.*(广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan)).*$"
  - name: 台湾-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan)).*$"

  # 日本组

  - name: 日本-手选
    type: select
    include-all: true
    filter: "(?=.*(广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan)).*$"
  - name: 日本-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan)).*$"

  # 新加坡组

  - name: 新加坡-手选
    type: select
    include-all: true
    filter: "(?=.*(广新|新加坡|SG|坡|狮城|🇸🇬|Singapore)).*$"
  - name: 新加坡-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广新|新加坡|SG|坡|狮城|🇸🇬|Singapore)).*$"

  # 韩国组

  - name: 韩国-手选
    type: select
    include-all: true
    filter: "(?=.*(广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea)).*$"
  - name: 韩国-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea)).*$"

  # 美国组

  - name: 美国-手选
    type: select
    include-all: true
    filter: "(?=.*(广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States)).*$"
  - name: 美国-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States)).*$"

  # 英国组

  - name: 英国-手选
    type: select
    include-all: true
    filter: "(?=.*(英国|英|伦敦|UK|United Kingdom|🇬🇧|London)).*$"
  - name: 英国-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "(?=.*(英国|英|伦敦|UK|United Kingdom|🇬🇧|London)).*$"

  # 其他组

  - name: 其他-手选
    type: select
    include-all: true
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"
  - name: 其他-智选
    type: smart
    include-all: true
    policy-priority: "牛逼:0.8"
    uselightgbm: true
    collectdata: true
    interval: 300
    filter: "^((?!(直连|拒绝|广港|香港|HK|Hong Kong|🇭🇰|HongKong|广台|台湾|台灣|TW|Tai Wan|🇹🇼|🇨🇳|TaiWan|Taiwan|广日|日本|JP|川日|东京|大阪|泉日|埼玉|沪日|深日|🇯🇵|Japan|广新|新加坡|SG|坡|狮城|🇸🇬|Singapore|广韩|韩国|韓國|KR|首尔|春川|🇰🇷|Korea|广美|US|美国|纽约|波特兰|达拉斯|俄勒|凤凰城|费利蒙|洛杉|圣何塞|圣克拉|西雅|芝加|🇺🇸|United States|英国|UK|United Kingdom|伦敦|英|London|🇬🇧)).)*$"

# ========================
# 规则引擎（rules）
# ========================
rules:

  - RULE-SET,TEST / Domain,Test
  - RULE-SET,Block / Domain,Block  
  - RULE-SET,ChatGPT / Domain,ChatGPT
  - RULE-SET,Claude / Domain,Claude
  - RULE-SET,Meta AI / Domain,Meta AI
  - RULE-SET,Perplexity / Domain,Perplexity
  - RULE-SET,Copilot / Domain,Copilot
  - RULE-SET,Gemini / Domain,Gemini
  - RULE-SET,Reddit / Domain,Reddit 
  - RULE-SET,GitHub / Domain,GitHub
  - RULE-SET,Telegram / Domain,Telegram
  - RULE-SET,Telegram / IP,Telegram
  - RULE-SET,WhatsApp / Domain,WhatsApp
  - RULE-SET,Facebook / Domain,Facebook
  - RULE-SET,Apple / Domain,Apple
  - RULE-SET,Apple-CN / Domain,Apple  
  - RULE-SET,Microsoft / Domain,Microsoft
  - RULE-SET,OKX / Domain,Crypto
  - RULE-SET,Bybit / Domain,Crypto
  - RULE-SET,Binance / Domain,Crypto
  - RULE-SET,Youtube / Domain,YouTube
  - RULE-SET,TikTok / Domain,TikTok
  - RULE-SET,Netflix / Domain,Netflix
  - RULE-SET,Netflix / IP,Netflix,no-resolve
  - RULE-SET,Disney / Domain,Disney
  - RULE-SET,Amazon / Domain,Amazon
  - RULE-SET,Crunchyroll / Domain,Crunchyroll
  - RULE-SET,HBO / Domain,HBO
  - RULE-SET,Spotify / Domain,Spotify
  - RULE-SET,Steam / Domain,Steam
  - RULE-SET,Epic / Domain,Games
  - RULE-SET,EA / Domain,Games
  - RULE-SET,Blizzard / Domain,Games
  - RULE-SET,UBI / Domain,Games
  - RULE-SET,PlayStation / Domain,Games
  - RULE-SET,Nintend / Domain,Games
  - RULE-SET,Google / Domain,Google
  - RULE-SET,Google / IP,Google,no-resolve
  - RULE-SET,Nvidia / Domain,Nvidia 
  - RULE-SET,Telegram / IP,国外
  - RULE-SET,Telegram / Domain,国外
  - RULE-SET,Proxy / Domain,国外
  - RULE-SET,Globe / Domain,国外  
  - RULE-SET,Direct / Domain,国内
  - RULE-SET,China / Domain,国内
  - RULE-SET,China / IP,国内,no-resolve
  - RULE-SET,Private / Domain,国内
  - MATCH,其他

# ========================
# 规则集提供者
# ========================
rule-anchor:
  ip: &ip {type: http, interval: 86400, behavior: ipcidr, format: mrs}
  domain: &domain {type: http, interval: 86400, behavior: domain, format: mrs}
  class: &class {type: http, interval: 86400, behavior: classical, format: text}

rule-providers:
  TEST / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Check.list"}
  ChatGPT / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/openai.mrs"}
  Claude / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Claude/Claude.list"}
  Meta AI / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/MetaAi.list"}
  Perplexity / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/perplexity.mrs"}
  Copilot / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Copilot.list"}
  Gemini / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Gemini.list"}
  GitHub / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/github.mrs"}
  Telegram / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/telegram.mrs"}  
  Telegram / IP: {<<: *ip, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geoip/telegram.mrs"}
  Twitter / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/x.mrs"}
  WhatsApp / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Whatsapp/Whatsapp.list"}
  Facebook / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/facebook.mrs"}
  Amazon / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/amazon.mrs"}
  Apple-CN / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/apple-cn.mrs"}
  Apple / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/apple.mrs"} 
  Microsoft / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/microsoft.mrs"}
  OKX / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/okx.mrs"}
  Bybit / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/bybit.mrs"}
  Binance / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/binance.mrs"}
  TikTok / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/tiktok.mrs"}
  Netflix / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/netflix.mrs"}
  Netflix / IP: {<<: *ip, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geoip/netflix.mrs"}
  Disney / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/disney.mrs"}
  HBO / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/hbo.mrs"}
  Spotify / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/spotify.mrs"}
  Steam / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/steam.mrs"}
  Epic / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Epic/Epic.list"}
  EA / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/EA/EA.list"}
  Blizzard / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Blizzard/Blizzard.list"}
  UBI / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/UBI/UBI.list"}
  PlayStation / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/PlayStation/PlayStation.list"}
  Nintend / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Nintendo/Nintendo.list"}
  Proxy / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Proxy.list"}
  Globe / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Global/Global.list"} 
  Direct / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Direct.list"}
  China / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/cn.mrs"}
  China / IP: {<<: *ip, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geoip/cn.mrs"}
  Private / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/private.mrs"}
  Block / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Block.list"}
  Nvidia / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Nvidia/Nvidia.list"}
  Crunchyroll / Domain: {<<: *class, url: "https://gh-proxy.com/raw.githubusercontent.com/liandu2024/clash/refs/heads/main/list/Crunchyroll.list"}
  Reddit / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/reddit.mrs"}
  Youtube / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/youtube.mrs"}  
  Google / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/google.mrs"}  
  Google / IP: {<<: *ip, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geoip/google.mrs"}
# GateFireWall / Domain: {<<: *domain, url: "https://gh-proxy.com/github.com/metacubex/meta-rules-dat/raw/refs/heads/meta/geo/geosite/gfw.mrs"}
`;
