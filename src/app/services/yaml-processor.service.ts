
import { Injectable } from '@angular/core';

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

  private highlightedKeys = new Set<string>(); // 用于跟踪需要高亮的键

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

  /**
   * Merges user proxies into the template.
   * @param compatibilityMode If true, polyfills 'include-all' regex and downgrades 'smart' to 'url-test'
   */
  mergeConfigs(templateYaml: string, userYaml: string, compatibilityMode = false): string {
    if (!templateYaml || !userYaml) return '';

    this.highlightedKeys.clear(); // 清除之前的记录
    const template = this.parse(templateYaml);
    const user = this.parse(userYaml);

    // 1. Initialize result with template's top-level configs
    const result: MihomoConfig = { ...template };

    // 2. Extract User Proxies
    // Some formats have proxies in 'proxies', others might be different, strictly following standard here.
    const userProxies = Array.isArray(user.proxies) ? user.proxies : [];
    
    // 3. Inject User Proxies into Template Proxies
    // We keep template proxies (like 'Direct', 'Reject') and append user proxies
    const templateProxies = Array.isArray(template.proxies) ? template.proxies : [];
    result.proxies = [...templateProxies, ...userProxies];
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
            } catch (e) {
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
    // If the user has providers, they override the template's placeholders.
    // If user has NO providers, we should probably remove the template's dummy providers to avoid errors.
    if (user['proxy-providers']) {
      result['proxy-providers'] = user['proxy-providers'];
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
      // Safe bet: If the template has specific "placeholder" providers like "山水云", remove them.
      if (result['proxy-providers']) {
         // Check if it contains known placeholder keys
         if (result['proxy-providers']['山水云']) {
            delete result['proxy-providers']; 
         }
      }
    }

    return this.dump(result);
  }

  getHighlightedKeys(): Set<string> {
    return this.highlightedKeys;
  }
}
