# Skill Metadata（技能元数据）
Name: YAML Merger CLI Command Generator & Debugger
Scope: YAML-Config-Merger-Tool 项目命令行操作
Version: 1.0.0
Description: 根据用户需求生成工具对应的 CLI 命令，并排查命令执行失败的问题

# Trigger Phrases（触发关键词）
- "生成 YAML 合并工具的 CLI 命令"
- "帮我写工具执行命令"
- "命令执行失败怎么排查"
- "CLI 命令参数含义解释"
- "调整命令的输出/合并参数"

# Step-by-Step Instructions（分步操作指南）
1.  首先解析用户需求：明确待合并的配置文件路径、输出路径、是否需要特殊合并规则（数组处理、注释保留等）；
2.  第一步拼接基础命令：以 `python yaml_merger.py` 为核心（项目入口），添加 `--input` 后跟所有输入配置文件路径；
3.  第二步添加可选参数：根据用户需求补充对应参数（如 `--output` 指定输出路径、`--array-strategy` 指定数组处理模式、`--keep-comments` 保留注释、`--verbose` 开启详细日志）；
4.  第三步命令校验：检查参数格式是否正确（路径是否合法、参数是否匹配项目预设）、必填项是否齐全；
5.  若用户反馈命令执行失败：先询问错误日志信息，再逐一排查（路径不存在、配置文件格式错误、参数拼写错误、权限不足等），并给出修正后的命令；
6.  最后输出命令及参数说明，方便用户理解和执行。

# Examples（示例）
## 输入
"帮我生成命令：合并 ./config/base.yaml 和 ./config/prod.yaml，输出到 ./dist/prod-merged.yaml，保留注释，开启详细日志"

## 输出
"1.  执行命令：
python yaml_merger.py --input ./config/base.yaml ./config/prod.yaml --output ./dist/prod-merged.yaml --keep-comments --verbose
2.  参数说明：
    - --input：指定待合并的配置文件（多个文件用空格分隔）；
    - --output：指定合并后的配置文件输出路径；
    - --keep-comments：保留原始配置文件中的注释信息；
    - --verbose：开启详细日志模式，输出合并过程中的关键步骤和状态；
3.  注意：请提前创建 ./dist 目录，否则会提示「No such file or directory」。"

## 输入
"我执行命令 `python yaml_merger.py --input a.yaml b.yaml --output ./out.yaml` 报错，提示「Invalid YAML syntax in a.yaml」，怎么解决"

## 输出
"命令执行失败排查与修正：
1.  错误原因：a.yaml 存在 YAML 语法错误，导致工具无法读取配置；
2.  排查步骤：
    - 先使用「YAML 配置文件格式校验技能」校验 a.yaml 的语法和格式；
    - 重点检查缩进、引号闭合、特殊字符（如冒号后是否加空格）；
3.  修正建议：
    - 先修复 a.yaml 的语法错误；
    - 若无需保留注释，可添加 `--remove-comments` 参数简化处理；
4.  修正后命令（假设 a.yaml 已修复）：
python yaml_merger.py --input a.yaml b.yaml --output ./out.yaml"

# Constraints（约束条件）
- 仅支持 YAML-Config-Merger-Tool 项目的 CLI 参数格式，不支持其他 YAML 合并工具的命令；
- 命令中的文件路径默认遵循相对路径规则，不处理绝对路径的跨平台兼容性问题；
- 仅排查工具本身的 CLI 用法错误和基础配置错误，不处理 Python 环境缺失、依赖未安装等系统级问题。