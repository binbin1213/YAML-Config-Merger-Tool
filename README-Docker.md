# YAML Merger Docker 部署指南

## 🐳 Docker 快速部署

### 一、准备工作

1. **安装Docker和Docker Compose**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

# CentOS/RHEL
sudo yum install docker docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

# 将用户添加到docker组
sudo usermod -aG docker $USER
newgrp docker
```

2. **克隆项目到Ubuntu服务器**
```bash
git clone <your-repo-url>
cd YAML-Config-Merger-Tool
```

### 二、快速部署

#### 方法1：使用部署脚本（推荐）
```bash
# 一键部署
./deploy.sh --prod -b -u

# 查看状态
./deploy.sh -s

# 查看日志
./deploy.sh -l
```

#### 方法2：手动部署
```bash
# 构建镜像
docker build -t yaml-merger-api:latest .

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 三、验证部署

#### 1. 检查服务状态
```bash
curl http://localhost:8080/api/status
```

#### 2. 测试API功能
```bash
# 测试合并
curl -X POST http://localhost:8080/api/merge \
  -H "Content-Type: application/json" \
  -d '{
    "template": "mixed-port: 7890\nproxies:\n  - name: test\n    type: direct",
    "user": "mixed-port: 8090\nproxies:\n  - name: user\n    type: direct",
    "options": {"verbose": true}
  }'

# 测试验证
curl -X POST http://localhost:8080/api/validate \
  -H "Content-Type: application/json" \
  -d '{"content": "test: value"}'
```

### 四、部署脚本使用

#### 开发环境
```bash
./deploy.sh -b -u    # 构建并启动
./deploy.sh -l        # 查看日志
./deploy.sh -s        # 查看状态
./deploy.sh -d        # 停止服务
```

#### 生产环境
```bash
./deploy.sh --prod -b -u   # 生产环境构建并启动
./deploy.sh -l              # 查看日志
./deploy.sh -r              # 重启服务
```

#### 维护命令
```bash
./deploy.sh --prod -c        # 清理容器和镜像
./deploy.sh -h              # 查看帮助信息
```

### 五、配置说明

#### 环境变量
| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PYTHONUNBUFFERED` | 1 | Python输出缓冲设置 |
| `LOG_LEVEL` | INFO | 日志级别 |

#### 端口配置
| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP访问 |
| 8080 | API | 服务API |
| 443 | Nginx | HTTPS访问 |

#### 健康检查
- 端点：`/api/status`
- 间隔：30秒
- 超时：10秒
- 重试：3次

### 六、监控和维护

#### 日志查看
```bash
# 实时日志
docker-compose logs -f yaml-merger-api

# 日志级别控制
docker exec -it yaml-merger-api python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
```

#### 性能监控
```bash
# 查看资源使用
docker stats yaml-merger-api

# 查看容器内部进程
docker exec -it yaml-merger-api ps aux
```

#### 数据备份
```bash
# 备份配置文件
docker cp yaml-merger-api:/app/mcp-api-server.py ./backup/

# 备份镜像
docker save yaml-merger-api:latest | gzip > yaml-merger-api.tar.gz
```

### 七、故障排除

#### 常见问题

1. **端口冲突**
```bash
# 检查端口占用
sudo netstat -tlnp | grep :8080

# 修改端口
sed -i 's/8080:8080/9080:8080/' docker-compose.yml
```

2. **权限问题**
```bash
# 检查用户权限
id $USER

# 添加到docker组
sudo usermod -aG docker $USER
```

3. **内存不足**
```bash
# 增加swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 日志分析
```bash
# 查看错误日志
docker-compose logs yaml-merger-api | grep ERROR

# 查看启动日志
docker-compose logs yaml-merger-api | head -50
```

### 八、更新升级

#### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建和部署
./deploy.sh -b -u
```

#### 回滚版本
```bash
# 停止服务
./deploy.sh -d

# 切换到旧版本
git checkout <tag>
./deploy.sh -b -u
```

### 九、安全配置

#### HTTPS配置
```bash
# 生成SSL证书
sudo certbot --nginx -d your-domain.com

# 配置HTTPS
# 编辑 nginx.conf 添加SSL配置
```

#### 防火墙配置
```bash
# Ubuntu UFW
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080
sudo ufw enable
```

### 十、扩展配置

#### 负载均衡
```bash
# 使用多实例
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

#### 监控集成
```bash
# 集成Prometheus
# 添加metrics端点
# 配置Grafana仪表板
```

---

🎉 **部署完成后，你就有了一个完整的YAML合并API服务！**