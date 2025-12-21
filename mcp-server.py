#!/usr/bin/env python3
"""
自定义MCP服务器 - 为YAML合并工具提供文件系统和命令执行功能
"""

import asyncio
import json
import sys
import os
import subprocess
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional

# MCP server imports would go here, but for now we'll create a simple interface
class YamlMergerMCPServer:
    """YAML合并工具的MCP服务器"""

    def __init__(self):
        self.project_root = "/Users/apple/Documents/xiangmu/YAML-Config-Merger-Tool"

    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """处理MCP请求"""
        method = request.get("method")
        params = request.get("params", {})

        if method == "tools/call":
            return await self.handle_tool_call(params)
        elif method == "initialize":
            return await self.handle_initialize(params)
        else:
            return {"error": {"code": -32601, "message": f"Method not found: {method}"}}

    async def handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理初始化请求"""
        return {
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "yaml-merger-mcp",
                    "version": "1.0.0"
                }
            }
        }

    async def handle_tool_call(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理工具调用请求"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        try:
            if tool_name == "read_file":
                result = await self.read_file(arguments.get("path"))
            elif tool_name == "write_file":
                result = await self.write_file(arguments.get("path"), arguments.get("content"))
            elif tool_name == "list_files":
                result = await self.list_files(arguments.get("path", "."))
            elif tool_name == "execute_command":
                result = await self.execute_command(
                    arguments.get("command"),
                    arguments.get("args", []),
                    arguments.get("cwd", self.project_root)
                )
            elif tool_name == "validate_yaml":
                result = await self.validate_yaml(arguments.get("path"))
            elif tool_name == "merge_yaml_configs":
                result = await self.merge_yaml_configs(
                    arguments.get("input_files"),
                    arguments.get("output_file"),
                    arguments.get("options", {})
                )
            elif tool_name == "create_directory":
                result = await self.create_directory(arguments.get("path"))
            else:
                return {"error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}}

            return {"result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}

        except Exception as e:
            return {"error": {"code": -32603, "message": str(e)}}

    async def read_file(self, path: str) -> Dict[str, Any]:
        """读取文件内容"""
        full_path = Path(self.project_root) / path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        content = full_path.read_text(encoding='utf-8')
        return {
            "path": str(full_path),
            "content": content,
            "size": len(content),
            "exists": True
        }

    async def write_file(self, path: str, content: str) -> Dict[str, Any]:
        """写入文件内容"""
        full_path = Path(self.project_root) / path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        full_path.write_text(content, encoding='utf-8')
        return {
            "path": str(full_path),
            "size": len(content),
            "success": True
        }

    async def list_files(self, path: str) -> Dict[str, Any]:
        """列出目录文件"""
        full_path = Path(self.project_root) / path
        if not full_path.exists():
            raise FileNotFoundError(f"Directory not found: {path}")

        files = []
        for item in full_path.iterdir():
            files.append({
                "name": item.name,
                "path": str(item.relative_to(self.project_root)),
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else 0
            })

        return {"path": path, "files": files}

    async def execute_command(self, command: str, args: List[str], cwd: str) -> Dict[str, Any]:
        """执行命令"""
        full_command = [command] + args

        try:
            result = subprocess.run(
                full_command,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=30
            )

            return {
                "command": " ".join(full_command),
                "cwd": cwd,
                "exit_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                "command": " ".join(full_command),
                "cwd": cwd,
                "exit_code": -1,
                "stdout": "",
                "stderr": "Command timed out after 30 seconds",
                "success": False
            }

    async def validate_yaml(self, path: str) -> Dict[str, Any]:
        """验证YAML文件语法"""
        full_path = Path(self.project_root) / path

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                yaml.safe_load(f)

            return {
                "path": path,
                "valid": True,
                "message": "YAML syntax is valid"
            }
        except yaml.YAMLError as e:
            return {
                "path": path,
                "valid": False,
                "message": f"YAML syntax error: {e}"
            }
        except FileNotFoundError:
            return {
                "path": path,
                "valid": False,
                "message": "File not found"
            }

    async def merge_yaml_configs(self, input_files: List[str], output_file: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """合并YAML配置文件"""
        # 构建命令参数
        cmd_args = ["python", "yaml_merger.py", "--input"] + input_files + ["--output", output_file]

        if options.get("compatibility"):
            cmd_args.append("--compatibility")
        if options.get("verbose"):
            cmd_args.append("--verbose")
        if options.get("array_strategy"):
            cmd_args.extend(["--array-strategy", options["array_strategy"]])
        if options.get("remove_comments"):
            cmd_args.append("--remove-comments")

        # 执行合并命令
        result = await self.execute_command("python3", cmd_args[1:], self.project_root)

        # 验证输出文件
        if result["success"]:
            validation = await self.validate_yaml(output_file)
            result["validation"] = validation

            # 读取合并后的内容（如果文件不太大）
            output_path = Path(self.project_root) / output_file
            if output_path.exists() and output_path.stat().st_size < 1024 * 1024:  # 1MB limit
                result["merged_content"] = output_path.read_text(encoding='utf-8')

        return result

    async def create_directory(self, path: str) -> Dict[str, Any]:
        """创建目录"""
        full_path = Path(self.project_root) / path
        full_path.mkdir(parents=True, exist_ok=True)

        return {
            "path": path,
            "created": True,
            "exists": True
        }

async def main():
    """主函数 - 简单的stdio接口"""
    server = YamlMergerMCPServer()

    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break

            try:
                request = json.loads(line.strip())
                response = await server.handle_request(request)

                # 添加响应ID（如果请求中有）
                if "id" in request:
                    response["id"] = request["id"]

                print(json.dumps(response), flush=True)

            except json.JSONDecodeError:
                error_response = {
                    "error": {"code": -32700, "message": "Parse error"},
                    "jsonrpc": "2.0"
                }
                print(json.dumps(error_response), flush=True)

    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    asyncio.run(main())