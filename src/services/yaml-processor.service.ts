
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout, catchError } from 'rxjs';

// API接口定义
interface MergeRequest {
  template: string;
  user: string;
  options?: {
    compatibility_mode?: boolean;
    array_strategy?: string;
    keep_comments?: boolean;
    verbose?: boolean;
  };
}

interface MergeResponse {
  success: boolean;
  result?: string;
  error?: string;
  stats?: any;
}

interface ValidateResponse {
  valid: boolean;
  error?: string;
}

// 保留原有的类型定义以防备用
// Declare global jsyaml from the CDN script
interface JsYamlOptions {
  lineWidth?: number;
  noRefs?: boolean;
  quotingType?: string;
  sortKeys?: (a: string, b: string) => number;
}

interface JsYaml {
  load(content: string): MihomoConfig;
  dump(content: MihomoConfig, options?: JsYamlOptions): string;
}

declare const jsyaml: JsYaml;

export interface MihomoProxy {
  name: string;
  type: string;
  [key: string]: unknown; // 允许其他任意属性
}

export interface MihomoProxyGroup {
  name: string;
  type: string;
  proxies?: string[];
  url?: string;
  interval?: number;
  lazy?: boolean;
  filter?: string;
  'include-all'?: boolean;
  'policy-priority'?: string;
  uselightgbm?: boolean;
  collectdata?: boolean;
  [key: string]: unknown; // 允许其他任意属性
}

export interface MihomoHealthCheck {
  enable?: boolean;
  url?: string;
  interval?: number;
}

export interface MihomoProxyProvider {
  url: string;
  type: string;
  interval: number;
  'health-check'?: MihomoHealthCheck;
  proxy?: string;
  [key: string]: unknown; // 允许其他任意属性
}

export type MihomoDnsConfig = Record<string, unknown>;

export interface MihomoConfig {
  proxies?: MihomoProxy[];
  'proxy-groups'?: MihomoProxyGroup[];
  'proxy-providers'?: Record<string, MihomoProxyProvider>;
  rules?: string[];
  port?: number;
  'socks-port'?: number;
  'redir-port'?: number;
  'mixed-port'?: number;
  'tproxy-port'?: number;
  'allow-lan'?: boolean;
  'bind-address'?: string;
  mode?: string;
  'log-level'?: string;
  ipv6?: boolean;
  'external-controller'?: string;
  'external-ui'?: string;
  secret?: string;
  profile?: unknown;
  dns?: MihomoDnsConfig;
  tun?: unknown;
  experiments?: unknown;
  'sub-rules'?: unknown;
  'rule-providers'?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class YamlProcessorService {

  // 智能检测API URL：开发环境使用相对路径，生产环境使用完整URL
  private get apiUrl(): string {
    // 如果在浏览器环境中运行
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port;

      // 开发环境：如果是localhost:3000（nginx代理），使用相对路径
      if (hostname === 'localhost' && port === '3000') {
        return '/api';
      }

      // 如果是localhost:8080（直接访问API），使用完整路径
      if (hostname === 'localhost' && port === '8080') {
        return 'http://localhost:8080/api';
      }

      // 生产环境或其他情况，使用相对路径（假设nginx代理配置正确）
      return '/api';
    }

    // 服务器端渲染或其他情况，回退到默认值
    return 'http://localhost:8080/api';
  }

  private highlightedKeys = new Set<string>(); // 用于跟踪需要高亮的键

  constructor(private http: HttpClient) {}

  private getDirectTarget(config: MihomoConfig): string {
    const proxyNames = (config.proxies ?? []).map(p => p.name);
    const groupNames = (config['proxy-groups'] ?? []).map(g => g.name);
    if (proxyNames.includes('直连') || groupNames.includes('直连')) return '直连';
    return 'DIRECT';
  }

  private ensureLanBypassRules(config: MihomoConfig): void {
    const directTarget = this.getDirectTarget(config);
    const cidrs = ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'];

    const desiredRules = cidrs.map(cidr => `IP-CIDR,${cidr},${directTarget},no-resolve`);
    const existingRules = Array.isArray(config.rules) ? config.rules : [];

    const filteredRules = existingRules.filter(rule => {
      if (typeof rule !== 'string') return false;
      if (!rule.startsWith('IP-CIDR,')) return true;
      const parts = rule.split(',');
      const cidr = parts[1];
      return !cidrs.includes(cidr);
    });

    config.rules = [...desiredRules, ...filteredRules];
  }

  parse(content: string): MihomoConfig {
    try {
      return jsyaml.load(content) as MihomoConfig;
    } catch (_) {
      console.error('YAML Parse Error', _);
      throw new Error('Invalid YAML format');
    }
  }

  dump(content: MihomoConfig): string {
    try {
      // Custom sorting function to ensure specific keys are at the top
      const sortKeys = (a: string, b: string) => {
        const topOrder = [
          'port', 'socks-port', 'redir-port', 'mixed-port', 'tproxy-port',
          'allow-lan', 'bind-address', 'mode', 'log-level', 'ipv6',
          'external-controller', 'external-ui', 'secret',
          'profile', 'dns', 'tun', 'experiments', 'sub-rules',
          'proxies', 'proxy-groups', 'proxy-providers', 'rule-providers', 'rules'
        ];
        
        const indexA = topOrder.indexOf(a);
        const indexB = topOrder.indexOf(b);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        return a.localeCompare(b);
      };

      const yamlStr = jsyaml.dump(content, { 
        lineWidth: -1, 
        noRefs: true, 
        quotingType: '"',
        sortKeys: sortKeys
      });

      return this.addComments(yamlStr);

    } catch (_) {
      console.error('YAML Dump Error', _);
      throw new Error('Failed to generate YAML');
    }
  }

  /**
 * Re-injects comments into the standard YAML output to maintain readability.
 * JS-YAML strips comments, so we must add them back.
 */
  private addComments(yamlStr: string): string {
    // A map of top-level keys to their comments
    const comments: Record<string, string> = {
      'mixed-port:': '# 混合端口 (HTTP/SOCKS5)',
      'allow-lan:': '# 允许局域网连接',
      'mode:': '# 运行模式 (rule/global/direct)',
      'dns:': '\n# ========================\n# DNS 设置 (防污染/分流)\n# ========================',
      'tun:': '\n# ========================\n# TUN 模式 (虚拟网卡)\n# ========================',
      'proxies:': '\n# ========================\n# 节点列表\n# ========================',
      'proxy-groups:': '\n# ========================\n# 策略组 (分流逻辑)\n# ========================',
      'rule-providers:': '\n# ========================\n# 规则集源 (自动更新)\n# ========================',
      'rules:': '\n# ========================\n# 分流规则 (从上至下匹配)\n# ========================'
    };

    // Split by line to avoid matching nested keys inadvertently
    const lines = yamlStr.split('\n');
    const processedLines = lines.map(line => {
      const trimLine = line.trim();
      
      // We only want to comment top-level keys (no indentation)
      if (!line.startsWith(' ')) {
        for (const [key, comment] of Object.entries(comments)) {
          if (trimLine.startsWith(key)) {
             // For block headers (newlines), place comment BEFORE the line
             if (comment.startsWith('\n')) {
               return comment + '\n' + line;
             }
             return comment + '\n' + line;
          }
        }
      }
      return line;
    });

    return processedLines.join('\n');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('API Error:', error);
    let errorMessage = 'Unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    return throwError(() => errorMessage);
  }

  /**
   * 通过MCP API调用Python CLI工具进行YAML合并
   * @param templateYaml 模板YAML配置
   * @param userYaml 用户YAML配置
   * @param compatibilityMode 兼容模式
   * @returns Observable<string> 合并后的YAML字符串
   */
  mergeConfigsViaAPI(templateYaml: string, userYaml: string, compatibilityMode = false): Observable<string> {
    if (!templateYaml || !userYaml) {
      return new Observable(observer => {
        observer.next('');
        observer.complete();
      });
    }

    const request: MergeRequest = {
      template: templateYaml,
      user: userYaml,
      options: {
        compatibility_mode: compatibilityMode,
        array_strategy: 'append',
        keep_comments: true,
        verbose: false
      }
    };

    return this.http.post<MergeResponse>(`${this.apiUrl}/merge`, request).pipe(
      timeout(30000), // 30秒超时
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * 本地回退方法：通过js-yaml进行YAML合并
   * @param compatibilityMode If true, polyfills 'include-all' regex and downgrades 'smart' to 'url-test'
   */
  mergeConfigsLocally(templateYaml: string, userYaml: string, compatibilityMode = false): string {
    if (!templateYaml || !userYaml) return '';

    this.highlightedKeys.clear(); // 清除之前的记录
    const template = this.parse(templateYaml);
    const user = this.parse(userYaml);

    // 1. Initialize result with template's top-level configs
    const result: MihomoConfig = { ...template };

    // 记录用户配置中的顶级键
    for (const key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        this.highlightedKeys.add(key);
      }
    }

    // 2. Extract User Proxies
    const userProxies = Array.isArray(user.proxies) ? user.proxies : [];

    // 3. Inject User Proxies into Template Proxies
    const templateProxies = Array.isArray(template.proxies) ? template.proxies : [];
    result.proxies = [...templateProxies, ...userProxies];
    if (userProxies.length > 0) {
      this.highlightedKeys.add('proxies');
    }

    // 4. Handle Proxy Groups (The complex part)
    if (result['proxy-groups'] && Array.isArray(result['proxy-groups'])) {

      // Get a list of all available proxy names for filtering
      const allProxyNames = result.proxies.map(p => p.name);

      result['proxy-groups'] = result['proxy-groups'].map(group => {

        // --- Logic 1: Handle include-all and Regex Filters ---
        // If we are in compatibility mode OR the group specifies include-all
        // (Even in non-compat mode, some basic logic helps, but strictly:
        //  Compat Mode = Execute Regex in JS, Remove params from YAML
        //  Native Mode = Keep params in YAML, let Core handle it)

        if (compatibilityMode && group['include-all']) {
          let matches: string[] = [];

          if (group.filter) {
            try {
              const regex = new RegExp(group.filter);
              matches = allProxyNames.filter(name => regex.test(name));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_) {
              console.warn(`Invalid Regex for group ${group.name}: ${group.filter}`);
            }
          } else {
            // include-all without filter implies EVERYTHING
            matches = [...allProxyNames];
          }

          // Ensure proxies array exists
          if (!group.proxies) group.proxies = [];

          // Add matches to the group's proxies list, avoiding duplicates
          const existing = new Set(group.proxies);
          matches.forEach(m => {
            if (!existing.has(m)) {
              group.proxies.push(m);
            }
          });

          // REMOVE the dynamic keys so the core doesn't get confused or error out
          delete group['include-all'];
          delete group['filter'];
        }

        // --- Logic 2: Handle 'smart' type downgrade ---
        if (compatibilityMode && group.type === 'smart') {
          // Downgrade to url-test (Auto Select)
          group.type = 'url-test';

          // Remove smart-specific keys that might cause errors
          delete group['policy-priority'];
          delete group['uselightgbm'];
          delete group['collectdata'];

          // Ensure mandatory fields for url-test exist
          if (!group.url) group.url = 'http://www.gstatic.com/generate_204';
          if (!group.interval) group.interval = 300;
        }

        return group;
      });
    }

    // 5. Handle Proxy Providers
    if (user['proxy-providers']) {
      result['proxy-providers'] = user['proxy-providers'];
      this.highlightedKeys.add('proxy-providers');
      // 记录用户配置中的代理提供者名称
      for (const providerName in user['proxy-providers']) {
        if (Object.prototype.hasOwnProperty.call(user['proxy-providers'], providerName)) {
          this.highlightedKeys.add(providerName);
        }
      }
    } else {
      // If template has dummy providers (indicated by placeholders), remove them if user didn't supply real ones
      // or just keep them if they look real?
      if (result['proxy-providers']) {
        const providers = result['proxy-providers'];
        const hasPlaceholderUrl = Object.values(providers).some(provider => {
          return (
            provider.url.includes('YOUR_SUBSCRIPTION_ADDRESS_HERE') ||
            provider.url.includes('机场订阅地址') ||
            provider.url.startsWith('YOUR_')
          );
        });

        if (hasPlaceholderUrl) {
          delete result['proxy-providers'];
        }
      }
    }

    this.ensureLanBypassRules(result);

    return this.dump(result);
  }

  /**
   * 主要的合并方法：优先使用API，失败时回退到本地处理
   * @param templateYaml 模板YAML配置
   * @param userYaml 用户YAML配置
   * @param compatibilityMode 兼容模式
   * @returns Promise<string> 合并后的YAML字符串
   */
  async mergeConfigs(templateYaml: string, userYaml: string, compatibilityMode = false): Promise<string> {
    if (!templateYaml || !userYaml) return '';

    try {
      // 尝试使用API进行合并
      console.log('尝试使用MCP API进行YAML合并...');

      const response = await new Promise<MergeResponse>((resolve, reject) => {
        this.mergeConfigsViaAPI(templateYaml, userYaml, compatibilityMode).subscribe({
          next: (response) => resolve(response),
          error: (error) => reject(error)
        });
      });

      if (response.success && response.result) {
        console.log('MCP API合并成功');

        // 解析结果以提取高亮信息
        try {
          const result = this.parse(response.result);

          // 记录用户配置中的顶级键用于高亮
          const user = this.parse(userYaml);
          this.highlightedKeys.clear();
          for (const key in user) {
            if (Object.prototype.hasOwnProperty.call(user, key)) {
              this.highlightedKeys.add(key);
            }
          }

          // 如果有代理，添加proxies键
          if (user.proxies && Array.isArray(user.proxies) && user.proxies.length > 0) {
            this.highlightedKeys.add('proxies');
          }

          // 如果有代理提供者，添加proxy-providers键
          if (user['proxy-providers']) {
            this.highlightedKeys.add('proxy-providers');
            for (const providerName in user['proxy-providers']) {
              if (Object.prototype.hasOwnProperty.call(user['proxy-providers'], providerName)) {
                this.highlightedKeys.add(providerName);
              }
            }
          }

        } catch (parseError) {
          console.warn('解析API结果时出错:', parseError);
        }

        return response.result;
      } else {
        throw new Error(response.error || 'API返回了错误结果');
      }
    } catch (apiError) {
      console.warn('MCP API调用失败，回退到本地处理:', apiError);

      // API失败时回退到本地处理
      try {
        return this.mergeConfigsLocally(templateYaml, userYaml, compatibilityMode);
      } catch (localError) {
        console.error('本地处理也失败:', localError);
        throw new Error(`API和本地处理都失败。API错误: ${apiError}, 本地错误: ${localError}`);
      }
    }
  }

  /**
   * 验证YAML配置文件
   * @param content YAML内容
   * @returns Observable<ValidateResponse> 验证结果
   */
  validateYaml(content: string): Observable<ValidateResponse> {
    return this.http.post<ValidateResponse>(`${this.apiUrl}/validate`, {
      content
    }).pipe(
      timeout(10000), // 10秒超时
      catchError(this.handleError.bind(this))
    );
  }

  getHighlightedKeys(): Set<string> {
    return this.highlightedKeys;
  }
}
