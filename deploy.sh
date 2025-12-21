#!/bin/bash

# YAML Merger Docker 部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "YAML Merger Docker 部署脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  -b, --build       构建Docker镜像"
    echo "  -u, --up          启动服务"
    echo "  -d, --down        停止服务"
    echo "  -l, --logs        查看日志"
    echo "  -s, --status      查看服务状态"
    echo "  -r, --restart     重启服务"
    echo "  -c, --clean       清理容器和镜像"
    echo "  --prod           生产环境部署（默认开发环境）"
    echo ""
    echo "完整部署流程:"
    echo "  $0 -b    # 构建镜像"
    echo "  $0 -u    # 启动服务"
    echo "  $0 -l    # 查看日志"
    echo "  $0 -s    # 查看状态"
    echo ""
    echo "快速部署:"
    echo "  $0 -b -u # 构建并启动"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装Docker Compose"
        exit 1
    fi

    log_success "Docker 和 Docker Compose 已安装"
}

# 构建Docker镜像
build_image() {
    log_info "构建 YAML Merger Docker 镜像..."
    docker build -t yaml-merger-api:latest .
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local compose_file="docker-compose.yml"

    if [[ "$PROD_MODE" == "true" ]]; then
        compose_file="docker-compose.prod.yml"
        log_info "使用生产环境配置启动服务..."
    else
        log_info "使用开发环境配置启动服务..."
    fi

    if [[ ! -f "$compose_file" ]]; then
        log_error "配置文件 $compose_file 不存在"
        exit 1
    fi

    docker-compose -f "$compose_file" up -d
    log_success "服务启动完成"

    # 显示访问地址
    show_access_info
}

# 停止服务
stop_services() {
    local compose_file="docker-compose.yml"

    if [[ "$PROD_MODE" == "true" ]]; then
        compose_file="docker-compose.prod.yml"
    fi

    log_info "停止 YAML Merger 服务..."
    docker-compose -f "$compose_file" down
    log_success "服务已停止"
}

# 查看日志
show_logs() {
    local compose_file="docker-compose.yml"

    if [[ "$PROD_MODE" == "true" ]]; then
        compose_file="docker-compose.prod.yml"
    fi

    log_info "显示服务日志..."
    docker-compose -f "$compose_file" logs -f
}

# 查看服务状态
show_status() {
    local compose_file="docker-compose.yml"

    if [[ "$PROD_MODE" == "true" ]]; then
        compose_file="docker-compose.prod.yml"
    fi

    log_info "查看服务状态..."
    docker-compose -f "$compose_file" ps
}

# 重启服务
restart_services() {
    log_info "重启 YAML Merger 服务..."
    stop_services
    sleep 2
    start_services
    log_success "服务重启完成"
}

# 清理容器和镜像
clean_all() {
    log_warning "这将删除所有相关的容器和镜像"
    read -p "确认继续? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理容器..."
        docker-compose down -v 2>/dev/null || true

        log_info "清理镜像..."
        docker rmi yaml-merger-api:latest 2>/dev/null || true
        docker image prune -f 2>/dev/null || true

        log_success "清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 显示访问信息
show_access_info() {
    local port=8080
    if [[ "$PROD_MODE" == "true" ]] && [[ -f "docker-compose.prod.yml" ]]; then
        # 检查是否配置了80端口
        if grep -q "80:" docker-compose.prod.yml; then
            port=80
        fi
    fi

    echo ""
    log_success "🚀 YAML Merger API 服务已启动!"
    echo ""
    echo "📋 服务信息:"
    echo "   API地址: http://localhost:$port"
    echo "   健康检查: http://localhost:$port/api/status"
    echo ""
    echo "🔍 可用的API端点:"
    echo "   POST /api/merge    - 合并YAML配置"
    echo "   POST /api/validate  - 验证YAML语法"
    echo "   GET  /api/status    - 服务状态检查"
    echo ""
    echo "🧪 测试API:"
    echo "   curl http://localhost:$port/api/status"
    echo ""
}

# 创建生产环境配置
create_prod_config() {
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        log_info "创建生产环境配置..."
        cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  yaml-merger-api:
    image: yaml-merger-api:latest
    container_name: yaml-merger-api-prod
    ports:
      - "8080:8080"
    environment:
      - PYTHONUNBUFFERED=1
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - yaml-merger-network

  nginx:
    image: nginx:alpine
    container_name: yaml-merger-nginx-prod
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - yaml-merger-api
    restart: always
    networks:
      - yaml-merger-network

networks:
  yaml-merger-network:
    driver: bridge
EOF
        log_success "生产环境配置已创建"
    fi
}

# 主函数
main() {
    # 默认开发环境
    PROD_MODE=${PROD_MODE:-false}

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--build)
                BUILD=true
                shift
                ;;
            -u|--up)
                UP=true
                shift
                ;;
            -d|--down)
                DOWN=true
                shift
                ;;
            -l|--logs)
                LOGS=true
                shift
                ;;
            -s|--status)
                STATUS=true
                shift
                ;;
            -r|--restart)
                RESTART=true
                shift
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            --prod)
                PROD_MODE=true
                create_prod_config
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 检查Docker
    check_docker

    # 执行操作
    if [[ "$BUILD" == "true" ]]; then
        build_image
    fi

    if [[ "$UP" == "true" ]]; then
        start_services
    fi

    if [[ "$DOWN" == "true" ]]; then
        stop_services
    fi

    if [[ "$LOGS" == "true" ]]; then
        show_logs
    fi

    if [[ "$STATUS" == "true" ]]; then
        show_status
    fi

    if [[ "$RESTART" == "true" ]]; then
        restart_services
    fi

    if [[ "$CLEAN" == "true" ]]; then
        clean_all
    fi

    # 如果没有指定参数，显示帮助
    if [[ $# -eq 0 ]]; then
        show_help
    fi
}

# 执行主函数
main "$@"