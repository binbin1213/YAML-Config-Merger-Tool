#!/usr/bin/env python3
"""
MCP API服务器 - 将MCP功能通过HTTP API暴露给Web界面
"""

import asyncio
import json
import sys
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# 添加项目路径
sys.path.append(str(Path(__file__).parent))

from yaml_merger import MihomoConfigMerger

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPAPIServer:
    """MCP API服务器 - 将YAML合并功能通过HTTP暴露"""

    def __init__(self):
        self.merger = MihomoConfigMerger()
        self.project_root = Path(__file__).parent

    async def handle_merge_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """处理合并请求"""
        try:
            template = data.get('template', '')
            user = data.get('user', '')
            options = data.get('options', {})

            if not template or not user:
                return {
                    'success': False,
                    'error': 'Template and user config are required'
                }

            # 调用真实CLI工具
            result = self.merger.merge_configs(
                template, user,
                compatibility_mode=options.get('compatibility', False),
                array_strategy=options.get('arrayStrategy', 'append'),
                keep_comments=options.get('keepComments', True)
            )

            return {
                'success': True,
                'result': result,
                'highlighted_keys': list(self.merger.get_highlightedKeys()),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Merge request failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def handle_validate_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """处理YAML验证请求"""
        try:
            content = data.get('content', '')
            if not content:
                return {'valid': False, 'error': 'No content provided'}

            # 简单验证
            import yaml
            yaml.safe_load(content)
            return {'valid': True, 'message': 'YAML syntax is valid'}

        except yaml.YAMLError as e:
            return {'valid': False, 'error': f'YAML syntax error: {e}'}
        except Exception as e:
            return {'valid': False, 'error': str(e)}

    async def handle_status_request(self) -> Dict[str, Any]:
        """处理状态检查请求"""
        return {
            'status': 'online',
            'version': '1.0.0',
            'features': [
                'yaml_merge',
                'yaml_validate',
                'compatibility_mode',
                'array_strategies'
            ],
            'timestamp': datetime.now().isoformat()
        }

    async def handle_file_read_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """处理文件读取请求"""
        try:
            file_path = data.get('path', '')
            if not file_path:
                return {'success': False, 'error': 'No path provided'}

            full_path = self.project_root / file_path
            if not full_path.exists():
                return {'success': False, 'error': 'File not found'}

            # 安全检查：只允许读取项目内的文件
            if not str(full_path).startswith(str(self.project_root)):
                return {'success': False, 'error': 'Access denied'}

            content = full_path.read_text(encoding='utf-8')
            return {
                'success': True,
                'content': content,
                'size': len(content),
                'path': str(full_path.relative_to(self.project_root))
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def generate_html_response(self, data: Dict[str, Any], status_code: int = 200) -> bytes:
        """生成HTTP响应"""
        response_lines = [
            f"HTTP/1.1 {status_code} {'OK' if status_code == 200 else 'Error'}",
            "Content-Type: application/json; charset=utf-8",
            "Access-Control-Allow-Origin: *",
            "Access-Control-Allow-Methods: GET, POST, OPTIONS",
            "Access-Control-Allow-Headers: Content-Type",
            f"Content-Length: {len(json.dumps(data, ensure_ascii=False).encode('utf-8'))}",
            "",
            json.dumps(data, ensure_ascii=False, indent=2)
        ]
        return '\n'.join(response_lines).encode('utf-8')

class SimpleHTTPServer:
    """简单的HTTP服务器实现"""

    def __init__(self, host='127.0.0.1', port=8080):
        self.host = host
        self.port = port
        self.api_server = MCPAPIServer()

    async def handle_request(self, reader, writer):
        """处理HTTP请求"""
        try:
            # 读取请求行
            request_line = await reader.readline()
            if not request_line:
                return

            method, path, _ = request_line.decode('utf-8').strip().split()

            # 读取头部
            headers = {}
            while True:
                line = await reader.readline()
                if not line or line.decode('utf-8').strip() == '':
                    break
                header_line = line.decode('utf-8').strip()
                if ':' in header_line:
                    key, value = header_line.split(':', 1)
                    headers[key.strip()] = value.strip()

            # 处理CORS预检请求
            if method == 'OPTIONS':
                response = self.api_server.generate_html_response({'status': 'OK'})
                writer.write(response)
                await writer.drain()
                return

            # 只处理POST请求
            if method == 'POST':
                # 读取body
                content_length = int(headers.get('Content-Length', '0'))
                if content_length > 0:
                    body = await reader.read(content_length)
                    data = json.loads(body.decode('utf-8'))
                else:
                    data = {}

                # 路由处理
                try:
                    if path == '/api/merge':
                        result = await self.api_server.handle_merge_request(data)
                        response = self.api_server.generate_html_response(result)
                    elif path == '/api/validate':
                        result = await self.api_server.handle_validate_request(data)
                        response = self.api_server.generate_html_response(result)
                    elif path == '/api/file':
                        result = await self.api_server.handle_file_read_request(data)
                        response = self.api_server.generate_html_response(result)
                    else:
                        response = self.api_server.generate_html_response(
                            {'error': 'Endpoint not found'}, 404
                        )
                except Exception as e:
                    response = self.api_server.generate_html_response(
                        {'error': str(e)}, 500
                    )

            elif method == 'GET' and path == '/api/status':
                result = await self.api_server.handle_status_request()
                response = self.api_server.generate_html_response(result)
            else:
                response = self.api_server.generate_html_response(
                    {'error': 'Method not allowed'}, 405
                )

            writer.write(response)
            await writer.drain()

        except Exception as e:
            logger.error(f"Request handling error: {e}")
            try:
                error_response = self.api_server.generate_html_response(
                    {'error': str(e)}, 500
                )
                writer.write(error_response)
                await writer.drain()
            except:
                pass

    async def start_server(self):
        """启动服务器"""
        server = await asyncio.start_server(
            self.handle_request,
            self.host,
            self.port
        )

        logger.info(f"MCP API Server started on http://{self.host}:{self.port}")
        logger.info("Available endpoints:")
        logger.info("  POST /api/merge - Merge YAML configs")
        logger.info("  POST /api/validate - Validate YAML")
        logger.info("  GET  /api/status - Check server status")

        async with server:
            await server.serve()

async def main():
    """主函数"""
    server = SimpleHTTPServer()
    await server.start_server()

if __name__ == '__main__':
    asyncio.run(main())