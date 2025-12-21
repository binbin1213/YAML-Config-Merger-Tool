/**
 * MCP Web桥接 - 将Web界面与CLI工具连接
 * 通过HTTP API调用本地MCP服务器
 */

class MCPWebBridge {
  constructor() {
    this.apiBase = 'http://127.0.0.1:9090'; // 可以配置为MCP服务器的HTTP接口
  }

  async mergeConfigs(templateYaml, userYaml, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}/api/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: templateYaml,
          user: userYaml,
          options: {
            compatibility: options.compatibility || false,
            arrayStrategy: options.arrayStrategy || 'append',
            verbose: options.verbose || false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Merge failed');
      }

      return result.result;
    } catch (error) {
      console.error('MCP Bridge Error:', error);
      throw error;
    }
  }

  async validateYaml(yamlContent) {
    try {
      const response = await fetch(`${this.apiBase}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: yamlContent
        })
      });

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Validation Error:', error);
      return false;
    }
  }

  async checkMCPStatus() {
    try {
      const response = await fetch(`${this.apiBase}/api/status`);
      return await response.json();
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

// Web界面集成
class YamlMergerWebUI {
  constructor() {
    this.mcpBridge = new MCPWebBridge();
    this.initializeUI();
  }

  initializeUI() {
    // 检查MCP状态
    this.mcpBridge.checkMCPStatus().then(status => {
      if (status.status === 'offline') {
        console.warn('MCP服务器离线，使用JavaScript引擎');
        // 降级到JavaScript实现
        this.engine = new YamlMerger();
        this.mcpMode = false;
      } else {
        console.log('MCP服务器在线，使用CLI引擎');
        this.mcpMode = true;
      }
    });

    // 绑定事件
    document.getElementById('mergeBtn').addEventListener('click', () => this.mergeConfigs());
    document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResult());
  }

  async mergeConfigs() {
    const template = document.getElementById('template').value;
    const user = document.getElementById('user').value;
    const compatibility = document.getElementById('compatibility').checked;

    if (!template || !user) {
      alert('请输入模板和用户配置');
      return;
    }

    try {
      let result;

      if (this.mcpMode) {
        // 使用MCP桥接调用真实CLI工具
        result = await this.mcpBridge.mergeConfigs(template, user, {
          compatibility,
          arrayStrategy: 'append',
          verbose: true
        });
      } else {
        // 降级到JavaScript实现
        if (!this.engine) {
          this.engine = new YamlMerger();
        }
        result = this.engine.mergeConfigs(template, user, compatibility);
      }

      document.getElementById('result').value = result;
      console.log('合并完成');

    } catch (error) {
      alert('合并失败: ' + error.message);
    }
  }

  downloadResult() {
    const result = document.getElementById('result').value;
    if (!result) {
      alert('没有可下载的结果');
      return;
    }

    const blob = new Blob([result], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged-config.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  new YamlMergerWebUI();
});

// 暴露到全局
window.YamlMergerWebUI = YamlMergerWebUI;
window.MCPWebBridge = MCPWebBridge;