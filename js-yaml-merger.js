/**
 * JavaScript版本的YAML合并器 - 可集成到Web界面
 * 基于Python yaml_merger.py的逻辑移植
 */

class YamlMerger {
  constructor() {
    this.highlightedKeys = new Set();
  }

  getDirectTarget(config) {
    const proxyNames = (config.proxies ?? []).map(p => p.name);
    const groupNames = (config['proxy-groups'] ?? []).map(g => g.name);
    return proxyNames.includes('直连') || groupNames.includes('直连') ? '直连' : 'DIRECT';
  }

  ensureLanBypassRules(config) {
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

  parseYaml(content) {
    try {
      // 使用js-yaml库解析
      return jsyaml.load(content) || {};
    } catch (error) {
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  dumpYaml(content) {
    try {
      // 使用js-yaml库序列化
      const yamlStr = jsyaml.dump(content, {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        sortKeys: false
      });

      return this.addComments(yamlStr);

    } catch (error) {
      throw new Error(`Failed to generate YAML: ${error.message}`);
    }
  }

  addComments(yamlStr) {
    const comments = {
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

    const lines = yamlStr.split('\n');
    const processedLines = [];

    for (const line of lines) {
      const trimLine = line.trim();

      if (!line.startsWith(' ')) {
        for (const [key, comment] of Object.entries(comments)) {
          if (trimLine.startsWith(key)) {
             if (comment.startsWith('\n')) {
               processedLines.push(comment + '\n' + line);
             } else {
               processedLines.push(comment + '\n' + line);
             }
             break;
          }
        }
      }

      if (processedLines.length === 0 || processedLines[processedLines.length - 1] !== line) {
        processedLines.push(line);
      }
    }

    return processedLines.join('\n');
  }

  mergeConfigs(templateYaml, userYaml, compatibilityMode = false) {
    if (!templateYaml || !userYaml) return '';

    this.highlightedKeys.clear();
    const template = this.parseYaml(templateYaml);
    const user = this.parseYaml(userYaml);

    const result = { ...template };

    for (const key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        this.highlightedKeys.add(key);
      }
    }

    // 合并代理节点
    const userProxies = Array.isArray(user.proxies) ? user.proxies : [];
    const templateProxies = Array.isArray(template.proxies) ? template.proxies : [];
    result.proxies = [...templateProxies, ...userProxies];
    if (userProxies.length > 0) {
      this.highlightedKeys.add('proxies');
    }

    // 处理代理组
    if (result['proxy-groups'] && Array.isArray(result['proxy-groups'])) {
      const allProxyNames = result.proxies.map(p => p.name);

      result['proxy-groups'] = result['proxy-groups'].map(group => {
        group = { ...group };

        if (compatibilityMode && group['include-all']) {
          let matches = [];

          if (group.filter) {
            try {
              const regex = new RegExp(group.filter);
              matches = allProxyNames.filter(name => regex.test(name));
            } catch (error) {
              console.warn(`Invalid regex for group ${group.name}: ${group.filter}`);
            }
          } else {
            matches = [...allProxyNames];
          }

          if (!group.proxies) group.proxies = [];

          const existing = new Set(group.proxies);
          matches.forEach(m => {
            if (!existing.has(m)) {
              group.proxies.push(m);
            }
          });

          delete group['include-all'];
          delete group['filter'];
        }

        if (compatibilityMode && group.type === 'smart') {
          group.type = 'url-test';
          delete group['policy-priority'];
          delete group['uselightgbm'];
          delete group['collectdata'];
          if (!group.url) group.url = 'http://www.gstatic.com/generate_204';
          if (!group.interval) group.interval = 300;
        }

        return group;
      });
    }

    // 处理代理提供者
    if (user['proxy-providers']) {
      result['proxy-providers'] = user['proxy-providers'];
      this.highlightedKeys.add('proxy-providers');
      for (const providerName in user['proxy-providers']) {
        if (Object.prototype.hasOwnProperty.call(user['proxy-providers'], providerName)) {
          this.highlightedKeys.add(providerName);
        }
      }
    } else {
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

    return this.dumpYaml(result);
  }

  getHighlightedKeys() {
    return this.highlightedKeys;
  }
}

// 导出类供Web界面使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YamlMerger;
} else if (typeof window !== 'undefined') {
  window.YamlMerger = YamlMerger;
}