# Skill Metadata（技能元数据）
Name: YAML Merger Env Setup & Dependency Install (MCP)
Scope: YAML-Config-Merger-Tool 项目环境搭建、依赖安装与校验
Version: 1.0.0
Description: 自动调用 MCP（Command Line MCP/File System MCP）完成项目 Python 环境校验、依赖安装，无需手动执行命令

# Trigger Phrases（触发关键词）
- "安装 YAML 合并工具的依赖"
- "校验项目 Python 环境是否符合要求"
- "自动搭建项目运行环境"
- "修复 requirements.txt 依赖安装失败"
- "初始化项目开发环境"

# MCP Tool Binding（MCP 工具绑定，核心高级配置）
- MCP Tool 1: Command Line Executor（命令行执行 MCP）
  - 调用条件：需要执行终端命令（如 pip 安装、python 版本查询）
  - 预设命令模板：
    1.  校验 Python 版本：`python --version`（返回版本号，判断是否 ≥3.7）
    2.  安装依赖：`pip install -r requirements.txt`（指定项目根目录）
    3.  校验依赖是否安装成功：`pip list | grep pyyaml`
- MCP Tool 2: File System MCP（文件系统 MCP）
  - 调用条件：需要检查文件是否存在（如 requirements.txt、yaml_merger.py）
  - 预设操作：
    1.  检查项目根目录是否存在 `requirements.txt`
    2.  读取 `requirements.txt` 内容，确认依赖清单
    3.  检查入口文件 `yaml_merger.py` 是否存在

# Step-by-Step Instructions（分步操作指南，简洁版，减少 Token 消耗）
1.  先调用「File System MCP」：检查项目核心文件（requirements.txt、yaml_merger.py）是否存在，不存在则提示用户克隆完整项目；
2.  调用「Command Line MCP」：执行 `python --version`，校验 Python 版本是否 ≥3.7，不满足则提示升级；
3.  若版本合规，调用「Command Line MCP」：执行 `pip install -r requirements.txt`，获取安装日志；
4.  调用「Command Line MCP」：执行 `pip list | grep pyyaml`，验证核心依赖是否安装成功；
5.  整理 MCP 返回的结构化结果，输出环境搭建报告（成功/失败+问题修复建议）。

# Examples（示例）
## 输入
"帮我自动搭建 YAML-Config-Merger-Tool 的运行环境"

## 输出（基于 MCP 调用结果）
"项目环境搭建报告：
1.  文件检查（File System MCP 调用成功）：
    - ✅ requirements.txt 存在（路径：./YAML-Config-Merger-Tool/requirements.txt）
    - ✅ yaml_merger.py 入口文件存在
2.  Python 版本校验（Command Line MCP 调用成功）：
    - ✅ Python 3.9.10（满足 ≥3.7 的要求）
3.  依赖安装（Command Line MCP 调用成功）：
    - ✅ PyYAML 6.0.1 已成功安装
    - ✅ 其他依赖（如 click）已完成安装
4.  最终状态：项目环境搭建完成，可直接执行 CLI 命令使用工具"

# Constraints（约束条件）
- 仅支持本地项目目录，不支持远程服务器环境搭建；
- MCP 命令执行需用户授予终端权限，不自动执行带 `sudo` 的高危命令；
- 仅处理 `requirements.txt` 声明的依赖，不处理额外的系统级依赖（如 libyaml）。