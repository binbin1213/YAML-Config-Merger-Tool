# 使用最小化的Python基础镜像
FROM python:3.11-alpine

# 安装运行时依赖
RUN apk add --no-cache curl && \
    adduser -D -s /app appuser

# 只安装一个Python依赖
RUN pip install --no-cache-dir PyYAML>=6.0

# 复制脚本文件（保持独立性）
COPY mcp-api-server.py /app/
COPY yaml_merger.py /app/
RUN chmod +x /app/mcp-api-server.py /app/yaml_merger.py

WORKDIR /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/status || exit 1

CMD ["/app/mcp-api-server.py"]