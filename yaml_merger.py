#!/usr/bin/env python3
"""
YAML Configuration Merger CLI Tool
Based on Mihomo/Clash configuration merging logic
"""

import argparse
import sys
import os
import yaml
import re
from typing import Dict, List, Set, Any, Optional
from pathlib import Path


class MihomoConfigMerger:
    """YAML配置合并器，基于Angular版本的逻辑实现"""

    def __init__(self):
        self.highlighted_keys: Set[str] = set()

    def get_direct_target(self, config: Dict[str, Any]) -> str:
        """获取直连目标名称"""
        proxy_names = [p.get('name', '') for p in config.get('proxies', [])]
        group_names = [g.get('name', '') for g in config.get('proxy-groups', [])]
        return '直连' if '直连' in proxy_names or '直连' in group_names else 'DIRECT'

    def ensure_lan_bypass_rules(self, config: Dict[str, Any]) -> None:
        """确保局域网绕行规则存在"""
        direct_target = self.get_direct_target(config)
        cidrs = ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16']

        desired_rules = [f'IP-CIDR,{cidr},{direct_target},no-resolve' for cidr in cidrs]
        existing_rules = config.get('rules', [])

        if not isinstance(existing_rules, list):
            existing_rules = []

        # 过滤掉已存在的局域网规则
        filtered_rules = []
        for rule in existing_rules:
            if isinstance(rule, str) and rule.startswith('IP-CIDR,'):
                parts = rule.split(',')
                if len(parts) >= 2:
                    rule_cidr = parts[1]
                    if rule_cidr not in cidrs:
                        filtered_rules.append(rule)
            else:
                filtered_rules.append(rule)

        config['rules'] = desired_rules + filtered_rules

    def parse_yaml(self, content: str) -> Dict[str, Any]:
        """解析YAML内容"""
        try:
            return yaml.safe_load(content) or {}
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML format: {e}")

    def dump_yaml(self, content: Dict[str, Any]) -> str:
        """转换为YAML字符串"""
        try:
            # 自定义排序函数
            def sort_keys(item):
                top_order = [
                    'port', 'socks-port', 'redir-port', 'mixed-port', 'tproxy-port',
                    'allow-lan', 'bind-address', 'mode', 'log-level', 'ipv6',
                    'external-controller', 'external-ui', 'secret',
                    'profile', 'dns', 'tun', 'experiments', 'sub-rules',
                    'proxies', 'proxy-groups', 'proxy-providers', 'rule-providers', 'rules'
                ]

                if isinstance(item, str):
                    if item in top_order:
                        return (0, top_order.index(item))
                    return (1, item)
                return (2, str(item))

            yaml_str = yaml.dump(
                content,
                default_flow_style=False,
                allow_unicode=True,
                sort_keys=False,
                width=1000,  # 避免自动换行
                Dumper=yaml.SafeDumper
            )

            return self.add_comments(yaml_str)

        except Exception as e:
            raise ValueError(f"Failed to generate YAML: {e}")

    def add_comments(self, yaml_str: str) -> str:
        """添加注释到YAML输出"""
        comments = {
            'mixed-port:': '# 混合端口 (HTTP/SOCKS5)',
            'allow-lan:': '# 允许局域网连接',
            'mode:': '# 运行模式 (rule/global/direct)',
            'dns:': '\n# ========================\n# DNS 设置 (防污染/分流)\n# ========================',
            'tun:': '\n# ========================\n# TUN 模式 (虚拟网卡)\n# ========================',
            'proxies:': '\n# ========================\n# 节点列表\n# ========================',
            'proxy-groups:': '\n# ========================\n# 策略组 (分流逻辑)\n# ========================',
            'rule-providers:': '\n# ========================\n# 规则集源 (自动更新)\n# ========================',
            'rules:': '\n# ========================\n# 分流规则 (从上至下匹配)\n# ========================'
        }

        lines = yaml_str.split('\n')
        processed_lines = []

        for line in lines:
            trim_line = line.strip()
            line_added = False

            # 只处理顶级键（无缩进）
            if not line.startswith(' ') and trim_line:
                for key, comment in comments.items():
                    if trim_line.startswith(key):
                        if comment.startswith('\n'):
                            processed_lines.append(comment + '\n' + line)
                        else:
                            processed_lines.append(comment + '\n' + line)
                        line_added = True
                        break

            if not line_added:
                processed_lines.append(line)

        return '\n'.join(processed_lines)

    def merge_configs(self, template_yaml: str, user_yaml: str,
                     compatibility_mode: bool = False,
                     array_strategy: str = 'append',
                     keep_comments: bool = True) -> str:
        """
        合并YAML配置

        Args:
            template_yaml: 模板配置YAML
            user_yaml: 用户配置YAML
            compatibility_mode: 兼容模式
            array_strategy: 数组处理策略 ('append', 'replace', 'merge')
            keep_comments: 是否保留注释
        """
        if not template_yaml or not user_yaml:
            return ''

        self.highlighted_keys.clear()
        template = self.parse_yaml(template_yaml)
        user = self.parse_yaml(user_yaml)

        # 初始化结果为模板配置
        result = template.copy()

        # 记录用户配置中的顶级键
        for key in user.keys():
            self.highlighted_keys.add(key)

        # 处理代理节点
        user_proxies = user.get('proxies', [])
        template_proxies = template.get('proxies', [])

        if array_strategy == 'append':
            result['proxies'] = template_proxies + user_proxies
        elif array_strategy == 'replace':
            result['proxies'] = user_proxies if user_proxies else template_proxies
        else:  # merge
            proxy_names = {p.get('name') for p in template_proxies}
            result['proxies'] = template_proxies.copy()
            for proxy in user_proxies:
                if proxy.get('name') not in proxy_names:
                    result['proxies'].append(proxy)

        if user_proxies:
            self.highlighted_keys.add('proxies')

        # 处理代理组
        if 'proxy-groups' in result and isinstance(result['proxy-groups'], list):
            all_proxy_names = [p.get('name', '') for p in result.get('proxies', [])]

            result['proxy-groups'] = result['proxy-groups'].copy()
            for i, group in enumerate(result['proxy-groups']):
                group = group.copy()  # 创建副本避免修改原数据

                # 兼容模式处理
                if compatibility_mode and group.get('include-all'):
                    matches = []

                    if group.get('filter'):
                        try:
                            regex = re.compile(group['filter'])
                            matches = [name for name in all_proxy_names if regex.search(name)]
                        except re.error:
                            print(f"Warning: Invalid regex for group {group.get('name')}: {group.get('filter')}")
                    else:
                        matches = all_proxy_names.copy()

                    if 'proxies' not in group:
                        group['proxies'] = []

                    existing_proxies = set(group['proxies'])
                    for match in matches:
                        if match not in existing_proxies:
                            group['proxies'].append(match)

                    # 移除动态键
                    group.pop('include-all', None)
                    group.pop('filter', None)

                # 处理smart类型降级
                if compatibility_mode and group.get('type') == 'smart':
                    group['type'] = 'url-test'
                    group.pop('policy-priority', None)
                    group.pop('uselightgbm', None)
                    group.pop('collectdata', None)

                    if not group.get('url'):
                        group['url'] = 'http://www.gstatic.com/generate_204'
                    if not group.get('interval'):
                        group['interval'] = 300

                result['proxy-groups'][i] = group

        # 处理代理提供者
        if 'proxy-providers' in user:
            result['proxy-providers'] = user['proxy-providers']
            self.highlighted_keys.add('proxy-providers')
            for provider_name in user['proxy-providers'].keys():
                self.highlighted_keys.add(provider_name)
        else:
            # 清理模板中的占位符提供者
            if 'proxy-providers' in result:
                has_placeholder = any(
                    isinstance(provider, dict) and isinstance(provider.get('url'), str) and (
                        'YOUR_SUBSCRIPTION_ADDRESS_HERE' in provider['url'] or
                        '机场订阅地址' in provider['url'] or
                        provider['url'].startswith('YOUR_')
                    )
                    for provider in result['proxy-providers'].values()
                )
                if has_placeholder:
                    del result['proxy-providers']

        # 确保局域网绕行规则
        self.ensure_lan_bypass_rules(result)

        return self.dump_yaml(result)

    def get_highlighted_keys(self) -> Set[str]:
        """获取高亮的键"""
        return self.highlighted_keys.copy()


def validate_yaml_syntax(file_path: str) -> bool:
    """验证YAML文件语法"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            yaml.safe_load(f)
        return True
    except Exception as e:
        print(f"❌ YAML syntax error in {file_path}: {e}")
        return False


def create_output_directory(output_path: str) -> None:
    """创建输出目录"""
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        print(f"📁 Created output directory: {output_dir}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        prog='yaml_merger',
        description='YAML Configuration Merger Tool - Merge Mihomo/Clash configuration files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic merge
  python yaml_merger.py --input base.yaml user.yaml --output merged.yaml

  # With compatibility mode
  python yaml_merger.py --input base.yaml user.yaml --output merged.yaml --compatibility

  # Replace array strategy
  python yaml_merger.py --input base.yaml user.yaml --output merged.yaml --array-strategy replace

  # Verbose output
  python yaml_merger.py --input base.yaml user.yaml --output merged.yaml --verbose
        """
    )

    parser.add_argument(
        '--input',
        nargs='+',
        required=True,
        help='Input YAML configuration files (at least 2 files)'
    )

    parser.add_argument(
        '--output',
        required=True,
        help='Output merged YAML file path'
    )

    parser.add_argument(
        '--array-strategy',
        choices=['append', 'replace', 'merge'],
        default='append',
        help='Array handling strategy (default: append)'
    )

    parser.add_argument(
        '--compatibility',
        action='store_true',
        help='Enable compatibility mode for legacy configurations'
    )

    parser.add_argument(
        '--keep-comments',
        action='store_true',
        default=True,
        help='Keep comments in merged output (default: enabled)'
    )

    parser.add_argument(
        '--remove-comments',
        action='store_true',
        help='Remove comments from output'
    )

    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate input files, do not merge'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    parser.add_argument(
        '--version',
        action='version',
        version='YAML Merger v1.0.0'
    )

    args = parser.parse_args()

    # 检查输入文件数量
    if len(args.input) < 2:
        print("❌ Error: At least 2 input files are required for merging")
        sys.exit(1)

    # 验证输入文件存在性
    for input_file in args.input:
        if not os.path.exists(input_file):
            print(f"❌ Error: Input file not found: {input_file}")
            sys.exit(1)

    # 验证YAML语法
    if args.verbose:
        print("🔍 Validating YAML syntax...")

    for input_file in args.input:
        if not validate_yaml_syntax(input_file):
            sys.exit(1)

    if args.validate_only:
        print("✅ All input files have valid YAML syntax")
        return

    # 创建输出目录
    create_output_directory(args.output)

    try:
        if args.verbose:
            print(f"📖 Reading {len(args.input)} input files...")

        # 读取模板文件（第一个文件）
        with open(args.input[0], 'r', encoding='utf-8') as f:
            template_content = f.read()

        # 逐个合并其他文件
        merger = MihomoConfigMerger()
        current_content = template_content

        for user_file in args.input[1:]:
            if args.verbose:
                print(f"🔀 Merging {user_file}...")

            with open(user_file, 'r', encoding='utf-8') as f:
                user_content = f.read()

            current_content = merger.merge_configs(
                current_content,
                user_content,
                compatibility_mode=args.compatibility,
                array_strategy=args.array_strategy,
                keep_comments=args.keep_comments and not args.remove_comments
            )

        # 写入输出文件
        if args.verbose:
            print(f"💾 Writing merged configuration to {args.output}...")

        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(current_content)

        # 验证输出文件
        if validate_yaml_syntax(args.output):
            print("✅ YAML merge completed successfully!")
            print(f"📁 Output saved to: {args.output}")

            if args.verbose:
                highlighted_keys = merger.get_highlighted_keys()
                if highlighted_keys:
                    print(f"\n🔑 Highlighted sections from merged configs: {', '.join(sorted(highlighted_keys))}")

                # 显示文件大小信息
                output_size = os.path.getsize(args.output)
                print(f"📊 Output file size: {output_size:,} bytes")
        else:
            print("❌ Error: Generated output file has invalid YAML syntax")
            sys.exit(1)

    except Exception as e:
        print(f"❌ Merge failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()