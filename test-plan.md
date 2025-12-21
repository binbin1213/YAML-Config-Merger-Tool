# 测试计划

## 1. Docker镜像测试
- [ ] 构建镜像: `docker build -t yaml-merger-api:test .`
- [ ] 检查镜像大小: `docker images | grep yaml-merger-api`
- [ ] 启动容器: `docker run -p 8080:8080 yaml-merger-api:test`
- [ ] 健康检查: `curl http://localhost:8080/api/status`

## 2. API功能测试
- [ ] 测试YAML合并接口
- [ ] 测试YAML验证接口
- [ ] 测试错误处理
- [ ] 测试大文件处理

## 3. CLI工具测试
- [ ] 测试基本合并功能
- [ ] 测试兼容模式
- [ ] 测试不同数组策略
- [ ] 测试错误处理

## 4. 模板优化验证
- [ ] 验证策略组数量正确减少
- [ ] 验证合并后的配置文件功能正常
- [ ] 验证代理规则正确性

## 5. 性能测试
- [ ] 内存使用测试
- [ ] 响应时间测试
- [ ] 并发请求测试

## 6. 安全测试
- [ ] 输入验证测试
- [ ] 恶意文件防护测试

