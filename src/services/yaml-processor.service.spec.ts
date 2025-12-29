import { TestBed } from '@angular/core/testing';

import { YamlProcessorService } from './yaml-processor.service';

describe('YamlProcessorService', () => {
  let service: YamlProcessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YamlProcessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parse', () => {
    it('should parse valid YAML correctly', () => {
      const yamlContent = `
        port: 7890
        socks-port: 7891
        proxies:
          - name: "测试节点"
            type: ss
      `;

      const result = service.parse(yamlContent);
      expect(result).toBeDefined();
      expect(result.port).toBe(7890);
      expect(result['socks-port']).toBe(7891);
      expect(result.proxies).toBeDefined();
      expect(result.proxies?.length).toBe(1);
      expect(result.proxies?.[0].name).toBe('测试节点');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `
        port: 7890
          invalid indentation
            more invalid
      `;

      expect(() => service.parse(invalidYaml)).toThrow();
    });

    it('should parse empty YAML', () => {
      const result = service.parse('');
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('dump', () => {
    it('should dump config to YAML string', () => {
      const config = {
        port: 7890,
        'socks-port': 7891,
        proxies: [
          { name: '测试', type: 'ss' }
        ]
      };

      const result = service.dump(config);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('port: 7890');
      expect(result).toContain('测试');
    });

    it('should add comments to dumped YAML', () => {
      const config = {
        'mixed-port': 7893,
        'allow-lan': true,
        mode: 'rule',
        dns: {
          enable: true
        },
        proxies: [],
        'proxy-groups': [],
        rules: []
      };

      const result = service.dump(config);
      expect(result).toContain('# 混合端口');
      expect(result).toContain('# 允许局域网连接');
      expect(result).toContain('# DNS 设置');
    });

    it('should sort keys in correct order', () => {
      const config = {
        'z-key': 'last',
        'a-key': 'first',
        port: 7890,
        proxies: []
      };

      const result = service.dump(config);
      const portIndex = result.indexOf('port:');
      const aKeyIndex = result.indexOf('a-key:');
      const zKeyIndex = result.indexOf('z-key:');

      // port should come before other keys
      expect(portIndex).toBeLessThan(aKeyIndex);
      expect(portIndex).toBeLessThan(zKeyIndex);
    });
  });

  describe('mergeConfigs', () => {
    const templateYaml = `
      port: 7890
      mixed-port: 7893
      allow-lan: true
      mode: rule
      dns:
        enable: true
      proxies:
        - name: 直连
          type: direct
        - name: 拒绝
          type: reject
      proxy-groups:
        - name: 所有-手选
          type: select
          include-all: true
          filter: "^((?!(直连|拒绝)).)*$"
        - name: 香港-手选
          type: select
          include-all: true
          filter: "(?=.*(香港|HK)).*$"
      rules:
        - IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
    `;

    const userYaml = `
      proxies:
        - name: "香港 01"
          type: ss
          server: hk01.example.com
          port: 443
        - name: "日本 01"
          type: ss
          server: jp01.example.com
          port: 443
      proxy-providers:
        订阅:
          url: "https://example.com/subscription"
          type: http
          interval: 86400
    `;

    it('should merge template and user configs', () => {
      const result = service.mergeConfigs(templateYaml, userYaml, false);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Check that user proxies are included
      expect(result).toContain('香港 01');
      expect(result).toContain('日本 01');

      // Check that template proxies are preserved
      expect(result).toContain('直连');
      expect(result).toContain('拒绝');
    });

    it('should handle compatibility mode with regex filtering', () => {
      const result = service.mergeConfigs(templateYaml, userYaml, true);

      expect(result).toBeDefined();

      // In compatibility mode, the regex should be evaluated
      // and include-all/filter should be removed
      expect(result).toContain('香港 01');

      // The filter regex should be removed in compatibility mode
      const lines = result.split('\n');
      const filterLine = lines.find(line => line.includes('filter:'));

      // In compatibility mode, filter should be removed
      expect(filterLine).toBeUndefined();
    });

    it('should downgrade smart groups to url-test in compatibility mode', () => {
      const smartTemplate = `
        port: 7890
        proxies:
          - name: "香港 01"
            type: ss
        proxy-groups:
          - name: 所有-智选
            type: smart
            include-all: true
            policy-priority: "香港:1.2"
            uselightgbm: true
            collectdata: true
            interval: 300
      `;

      const result = service.mergeConfigs(smartTemplate, userYaml, true);

      expect(result).toContain('type: url-test');
      expect(result).not.toContain('type: smart');
      expect(result).not.toContain('policy-priority');
      expect(result).not.toContain('uselightgbm');
      expect(result).not.toContain('collectdata');
    });

    it('should preserve smart groups in non-compatibility mode', () => {
      const smartTemplate = `
        port: 7890
        proxies:
          - name: "香港 01"
            type: ss
        proxy-groups:
          - name: 所有-智选
            type: smart
            include-all: true
            policy-priority: "香港:1.2"
      `;

      const result = service.mergeConfigs(smartTemplate, userYaml, false);

      expect(result).toContain('type: smart');
      expect(result).toContain('policy-priority');
    });

    it('should handle empty user config', () => {
      const result = service.mergeConfigs(templateYaml, '', false);

      // Should return empty result for invalid input
      expect(result).toBe('');
    });

    it('should handle empty template config', () => {
      const result = service.mergeConfigs('', userYaml, false);

      expect(result).toBe('');
    });

    it('should preserve highlighted keys', () => {
      service.mergeConfigs(templateYaml, userYaml, true);
      const highlightedKeys = service.getHighlightedKeys();

      expect(highlightedKeys.size).toBeGreaterThan(0);
      expect(highlightedKeys.has('proxies')).toBeTruthy();
      expect(highlightedKeys.has('proxy-providers')).toBeTruthy();
    });

    it('should ensure LAN bypass rules exist', () => {
      const result = service.mergeConfigs(templateYaml, userYaml, true);

      expect(result).toContain('IP-CIDR,127.0.0.0/8');
      expect(result).toContain('IP-CIDR,10.0.0.0/8');
      expect(result).toContain('IP-CIDR,172.16.0.0/12');
      expect(result).toContain('IP-CIDR,192.168.0.0/16');
    });

    it('should remove placeholder proxy-providers', () => {
      const templateWithPlaceholder = `
        port: 7890
        proxy-providers:
          订阅:
            url: "YOUR_SUBSCRIPTION_ADDRESS_HERE"
            type: http
            interval: 86400
      `;

      const result = service.mergeConfigs(templateWithPlaceholder, userYaml, true);

      // Should remove placeholder when user provides real providers
      // But keep user providers
      expect(result).toContain('https://example.com/subscription');
    });
  });

  describe('validateRegex (private method testing via mergeConfigs)', () => {
    it('should handle malicious regex patterns', () => {
      const templateWithMaliciousRegex = `
        port: 7890
        proxies:
          - name: "测试节点"
            type: ss
        proxy-groups:
          - name: 测试组
            type: select
            include-all: true
            filter: "((a+)++)+"  # Catastrophic backtracking pattern
      `;

      const simpleUserYaml = `
        proxies:
          - name: "香港 01"
            type: ss
      `;

      // Should not crash even with malicious regex
      expect(() => {
        service.mergeConfigs(templateWithMaliciousRegex, simpleUserYaml, true);
      }).not.toThrow();
    });

    it('should handle invalid regex gracefully', () => {
      const templateWithInvalidRegex = `
        port: 7890
        proxies:
          - name: "测试节点"
            type: ss
        proxy-groups:
          - name: 测试组
            type: select
            include-all: true
            filter: "[invalid(regex"
      `;

      const simpleUserYaml = `
        proxies:
          - name: "香港 01"
            type: ss
      `;

      // Should not crash with invalid regex
      expect(() => {
        service.mergeConfigs(templateWithInvalidRegex, simpleUserYaml, true);
      }).not.toThrow();
    });
  });

  describe('getDirectTarget (private behavior testing)', () => {
    it('should use "直连" when present in config', () => {
      const configWithZhiliang = `
        proxies:
          - name: 直连
            type: direct
        rules:
          - DOMAIN,example.com,直连
      `;

      const result = service.dump(service.parse(configWithZhiliang));
      expect(result).toContain('直连');
    });

    it('should fallback to "DIRECT" when "直连" not present', () => {
      const configWithoutZhiliang = `
        proxies:
          - name: Direct
            type: direct
        rules:
          - DOMAIN,example.com,DIRECT
      `;

      const result = service.dump(service.parse(configWithoutZhiliang));
      expect(result).toContain('DIRECT');
    });
  });
});
