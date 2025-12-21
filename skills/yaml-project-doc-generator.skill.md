# Skill Metadata（技能元数据）
Name: YAML Config Merger Project Doc Generator
Scope: YAML-Config-Merger-Tool 项目文档编写与更新
Version: 1.0.0
Description: 生成/更新项目的 README.md、使用手册、参数说明文档，确保文档与项目功能同步

# Trigger Phrases（触发关键词）
- "生成项目 README.md"
- "更新工具使用手册"
- "补充 CLI 参数说明文档"
- "完善项目功能介绍"
- "优化文档的使用示例"

# Step-by-Step Instructions（分步操作指南）
1.  首先明确文档类型（README.md/使用手册/参数文档），梳理项目核心信息（功能介绍、技术栈、安装步骤、使用方法、参数说明、示例）；
2.  第一步编写基础信息：项目名称、简介、功能亮点、技术栈（Python、PyYAML 等）、安装依赖命令（`pip install -r requirements.txt`）；
3.  第二步编写使用指南：分「快速开始」和「高级用法」，快速开始包含简单合并命令示例，高级用法包含数组策略、注释保留等可选参数的使用说明；
4.  第三步编写参数说明：整理所有 CLI 参数，包含参数名称、是否必填、含义、默认值、示例；
5.  第四步补充示例：提供 2-3 个不同场景的使用示例（简单合并、带数组去重的合并、保留注释的合并）；
6.  第五步更新文档：若用户反馈功能迭代（如新增参数），仅修改对应章节内容，保持文档结构不变；
7.  最后格式化文档：使用 Markdown 规范排版（标题层级、列表、代码块、表格），确保可读性。

# Examples（示例）
## 输入
"帮我生成项目 README.md 的核心内容，突出工具的 YAML 配置合并功能"

## 输出
"# YAML-Config-Merger-Tool
一款轻量、高效的 YAML 配置文件合并工具，支持多文件优先级合并、数组灵活处理、注释保留等功能，适用于多环境配置管理场景。

## 功能亮点
- 支持多 YAML 文件按优先级递进覆盖；
- 数组配置支持「追加」「去重追加」「覆盖」三种处理模式；
- 可选保留/移除原始配置文件注释；
- 提供详细日志模式，方便排查合并问题；
- 轻量无冗余依赖，快速部署使用。

## 技术栈
- 编程语言：Python 3.7+
- 核心依赖：PyYAML

## 安装步骤
1.  克隆项目：
    git clone https://github.com/binbin1213/YAML-Config-Merger-Tool.git
2.  进入项目目录：
    cd YAML-Config-Merger-Tool
3.  安装依赖：
    pip install -r requirements.txt

## 快速开始
### 简单合并
将 base.yaml 和 dev.yaml 合并，输出到 dev-merged.yaml：
```bash
python yaml_merger.py --input base.yaml dev.yaml --output dev-merged.yaml