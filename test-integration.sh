#!/bin/bash

# YAML Merger CLI集成测试脚本

set -e

echo "🚀 开始YAML Merger CLI集成测试..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 清理之前的容器和镜像
echo "🧹 清理之前的容器..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# 构建并启动服务
echo "🔨 构建Docker镜像..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 启动服务..."
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.dev.yml ps

# 测试API健康状态
echo "🏥 测试API健康状态..."
for i in {1..30}; do
    if curl -f http://localhost:8080/api/status > /dev/null 2>&1; then
        echo "✅ API服务健康检查通过"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ API服务启动超时"
        docker-compose -f docker-compose.dev.yml logs yaml-merger-api
        exit 1
    fi
    echo "⏳ 等待API服务启动... ($i/30)"
    sleep 2
done

# 测试API合并功能
echo "🔗 测试API合并功能..."
TEMPLATE_CONTENT="mixed-port: 7890
proxies:
  - name: direct
    type: direct
proxy-groups:
  - name: PROXY
    type: select
    proxies:
      - direct"

USER_CONTENT="proxies:
  - name: test-proxy
    type: http
    server: example.com
    port: 8080"

# 发送合并请求
MERGE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/merge \
  -H "Content-Type: application/json" \
  -d "{
    \"template\": $(echo "$TEMPLATE_CONTENT" | jq -Rs .),
    \"user\": $(echo "$USER_CONTENT" | jq -Rs .),
    \"options\": {
      \"compatibility_mode\": false,
      \"array_strategy\": \"append\",
      \"keep_comments\": true
    }
  }")

# 检查合并结果
if echo "$MERGE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ API合并测试成功"
    RESULT=$(echo "$MERGE_RESPONSE" | jq -r '.result')
    echo "📄 合并结果预览:"
    echo "$RESULT" | head -10
else
    echo "❌ API合并测试失败"
    echo "$MERGE_RESPONSE"
    docker-compose -f docker-compose.dev.yml logs yaml-merger-api
    exit 1
fi

# 测试YAML验证功能
echo "✅ 测试YAML验证功能..."
VALIDATE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": $(echo "$RESULT" | jq -Rs .)
  }")

if echo "$VALIDATE_RESPONSE" | jq -e '.valid' > /dev/null 2>&1; then
    echo "✅ YAML验证测试成功"
else
    echo "❌ YAML验证测试失败"
    echo "$VALIDATE_RESPONSE"
fi

# 测试Web界面访问
echo "🌐 测试Web界面访问..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Web界面可访问: http://localhost:3000"
else
    echo "⚠️  Web界面未启动，但API服务正常"
fi

# 显示日志信息
echo "📋 服务状态摘要:"
echo "  - API服务: http://localhost:8080"
echo "  - Web界面: http://localhost:3000 (如果nginx启动)"
echo "  - 测试页面: test-integration.html"

echo ""
echo "🎉 CLI集成测试完成！"
echo ""
echo "📝 下一步操作:"
echo "  1. 访问 http://localhost:3000 查看主界面"
echo "  2. 打开 test-integration.html 进行详细测试"
echo "  3. 使用 './test-integration.sh stop' 停止服务"
echo ""
echo "🐳 Docker命令:"
echo "  - 查看日志: docker-compose -f docker-compose.dev.yml logs -f"
echo "  - 重启服务: docker-compose -f docker-compose.dev.yml restart"
echo "  - 停止服务: docker-compose -f docker-compose.dev.yml down"

# 支持命令行参数
if [ "$1" = "stop" ]; then
    echo "🛑 停止服务..."
    docker-compose -f docker-compose.dev.yml down
    echo "✅ 服务已停止"
fi