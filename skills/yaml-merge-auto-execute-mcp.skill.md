# Skill Metadata（技能元数据）
Name: YAML Merger Auto Execute & Result Check (MCP)
Scope: YAML-Config-Merger-Tool 配置合并自动化执行、结果校验与日志分析
Version: 1.0.0
Description: 自动调用 MCP 执行合并命令、读取合并结果、校验输出文件有效性，无需手动复制粘贴命令

# Trigger Phrases（触发关键词）
- "自动执行 YAML 配置合并"
- "运行合并命令并校验结果"
- "批量合并配置文件并检查"
- "分析合并命令的执行日志"
- "验证合并后的 YAML 文件是否有效"

# MCP Tool Binding（MCP 工具绑定）
- MCP Tool 1: Command Line Executor（命令行执行 MCP）
  - 调用条件：需要执行 YAML 合并命令、校验 YAML 语法
  - 预设命令模板：
    1.  执行合并：`python yaml_merger.py --input {input_files} --output {output_file} {extra_params}`
    2.  校验合并结果：`python -c "import yaml; yaml.safe_load(open('{output_file}', 'r', encoding='utf-8'))"`
- MCP Tool 2: File System MCP（文件系统 MCP）
  - 调用条件：需要读取合并后的 YAML 文件、检查输出目录是否存在
  - 预设操作：
    1.  检查输出目录是否存在，不存在则自动创建（`mkdir -p {output_dir}`）
    2.  读取合并后的 YAML 文件内容，返回结构化配置数据
    3.  对比源配置与合并后配置，确认关键配置项是否正确覆盖

# Step-by-Step Instructions（简洁版）
1.  解析用户需求，提取输入文件路径、输出路径、额外参数（如数组策略）；
2.  调用「File System MCP」：检查输入文件是否存在，自动创建输出目录；
3.  调用「Command Line MCP」：执行拼接好的合并命令，获取执行日志；
4.  若命令执行成功，调用「Command Line MCP」：校验合并后 YAML 文件的语法有效性；
5.  调用「File System MCP」：读取合并结果，对比源配置，确认合并效果；
6.  整理 MCP 结构化结果，输出执行报告（命令、日志、结果校验、问题提示）。

# Constraints（约束条件）
- 仅支持项目预设的 CLI 参数，不支持自定义未声明的参数；
- 合并文件数量不超过 5 个，避免 MCP 执行超时；
- 不处理大于 10MB 的 YAML 配置文件，防止内存溢出。