# Skill Metadata（技能元数据）
Name: YAML Config Format Validator
Scope: YAML-Config-Merger-Tool 项目输入配置文件校验
Version: 1.0.0
Description: 校验待合并的 YAML 配置文件是否符合语法规范、项目要求的格式约束，提前规避合并失败问题

# Trigger Phrases（触发关键词）
- "校验 YAML 配置格式"
- "检查配置文件语法是否正确"
- "验证输入 YAML 是否符合项目要求"
- "排查 YAML 配置报错问题"
- "判断配置文件能否被工具正常读取"

# Step-by-Step Instructions（分步操作指南）
1.  首先识别用户提供的 YAML 文件路径/内容，确认是工具的「源配置文件」或「目标配置文件」；
2.  第一步校验 YAML 基础语法：检查缩进一致性（2 空格缩进，禁止 tab）、键值对格式、引号闭合、特殊字符转义（如冒号、空格）；
3.  第二步校验项目专属格式约束：检查配置项层级是否符合项目预设结构（如必须包含 `config.version`、`app.settings` 节点）；
4.  第三步校验数据类型：确保配置项值的类型符合要求（如 `port` 为整数、`enable_log` 为布尔值、`paths` 为数组）；
5.  最后输出校验结果：若通过，提示「配置文件格式合规，可用于合并」；若不通过，列出具体错误位置（行号）、错误类型及修正建议。

# Examples（示例）
## 输入
"帮我校验这份 YAML 配置是否合规：
config:
  version: "1.0"
  port: 8080
app:
  settings:
    enable_log: true
    log_path: ./logs"

## 输出
"校验通过：
1. YAML 基础语法合规（缩进、键值对、引号均无问题）；
2. 项目专属节点（config.version、app.settings）齐全；
3. 数据类型符合要求（port 为整数、enable_log 为布尔值）；
该配置文件可用于 YAML-Config-Merger-Tool 进行合并操作。"

## 输入
"校验这份配置：
config:
  version: 1.0
  port: "8080"  # 这里是不是有问题？
app:
  settings:
    enable_log: True
    log_path: ./logs"

## 输出
"校验不通过，存在 2 处问题：
1.  行 4：`port` 配置项应为整数类型，当前为字符串类型（多余引号），建议修改为 `port: 8080`；
2.  行 7：`enable_log` 配置项应为小写布尔值（true/false），当前为 `True`，不符合项目格式要求，建议修改为 `enable_log: true`；
请修正后再进行配置合并。"

# Constraints（约束条件）
- 仅针对 YAML-Config-Merger-Tool 项目的输入配置文件进行校验，不处理其他类型的 YAML 文件；
- 仅校验语法格式、节点结构、数据类型，不校验配置项值的业务逻辑合理性（如 port 取值范围）；
- 支持校验本地文件路径输入和直接粘贴的 YAML 文本内容。