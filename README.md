# Mihomo Config Merger (Mihomo 工具箱)

**Mihomo Config Merger** 是一个基于 Web 的纯前端工具，旨在帮助用户将个人的 Clash/Mihomo 机场订阅（节点信息）自动合并到预设的高级分流规则模版中。

它解决了“拥有好的规则模版，但每次更新订阅都需要手动复制粘贴节点”的痛点，并提供了独有的“兼容模式”，让不支持正则筛选的老旧内核也能使用高级分组逻辑。

## 1. 项目特点

- **隐私安全**：所有逻辑（解析、合并、生成）均在浏览器端（Client-side）执行，您的订阅信息**永远不会**发送到任何服务器。
- **极速合并**：基于 Angular Signals 和 JS-YAML，毫秒级响应。
- **智能兼容模式 (Polyfill)**：
  - **Smart 降级**：自动将 Mihomo 专属的 smart 策略组降级为通用的 url-test，防止老核心崩溃。
  - **前端正则预处理**：浏览器代替内核执行复杂的正则筛选（如 filter: "(?=.*(香港|HK)).*$"），生成静态的节点列表，确保在任何客户端（Clash Verge, Clash for Windows, ClashX）上都能完美运行。
- **注释保留**：智能重注机制，确保生成的 YAML 文件保留关键模块的中文注释，便于阅读。
- **现代化 UI**：使用 Tailwind CSS 构建的暗色系界面，简洁美观。

------



## 2. 技术架构

本项目是一个 **Zoneless Angular (v21+)** 应用，采用 **Standalone Components** 架构。

### 技术栈

- **框架**: Angular (Standalone, Signals)
- **样式**: Tailwind CSS (通过 CDN 引入)
- **核心库**: js-yaml (用于 YAML <-> JSON 转换)
- **构建工具**: 无需复杂构建，基于浏览器原生 ES Modules (通过 index.tsx 引导)。

### 核心逻辑流程

1. **Input**: 用户输入“基础模版 YAML” + “个人订阅 YAML”。
2. **Parse**: 使用 js-yaml 将两者转换为 JSON 对象。
3. **Merge**:
   - 提取用户订阅中的 proxies (节点列表) 和 proxy-providers。
   - 将其合并到模版的 proxies 列表中。
4. **Process (兼容模式核心)**:
   - 遍历模版中的所有策略组 (proxy-groups)。
   - 检测 include-all: true 和 filter 正则表达式。
   - **在 JS 中执行正则**：用正则匹配所有节点名称，计算出该组应包含的节点。
   - **回填**：将匹配到的节点名称显式写入 proxies 数组。
   - **清理**：移除内核可能不支持的 include-all、filter、smart 等字段，生成静态配置。
5. **Dump**: 将合并后的对象转换回 YAML 字符串。
6. **Post-Process**: 重新插入中文注释头（因为 JSON 转换会丢失注释）。

------



## 3. 项目目录结构

codeText



```
.
├── index.html                  # 入口 HTML (引入 Tailwind, js-yaml, importmap)
├── index.tsx                   # Angular 启动文件 (Bootstrap)
├── metadata.json               # 项目元数据配置
├── shanshui.yaml               # (示例) 用户上传的订阅文件样例
├── clash-all-fallback-smart.yaml # (核心) 内置的高级分流模版
└── src
    ├── app.component.html      # 主布局 HTML
    ├── app.component.ts        # 根组件逻辑
    ├── components
    │   └── config-merger.component.ts # 核心交互组件 (编辑器、按钮、UI逻辑)
    └── services
        └── yaml-processor.service.ts  # 核心业务逻辑 (解析、合并、正则Polyfill、降级处理)
```

------



## 4. 详细模块说明

### 4.1 src/services/yaml-processor.service.ts

这是项目的“大脑”。

- **parse()**: 安全地解析 YAML。
- **mergeConfigs()**: 执行合并逻辑。
  - 包含**兼容模式**的判断：如果开启，会在内存中运行正则，将动态规则转换为静态列表。
  - 包含**Smart 降级**：将 type: smart 转换为 type: url-test。
- **dump()**: 生成 YAML，并配置了自定义的键值排序（sortKeys），确保 port, dns, proxies 等关键配置在文件顶部。
- **addComments()**: 一个后处理函数，用于在生成的纯文本 YAML 中“找回”丢失的注释，增强可读性。

### 4.2 src/components/config-merger.component.ts

这是项目的“脸面”。

- **状态管理**: 使用 Angular signal 管理模版内容、用户内容、合并结果和兼容模式开关。
- **默认模版**: DEFAULT_TEMPLATE 常量中存储了经过精心设计的 clash-all-fallback-smart.yaml 内容。
- **文件处理**: 处理文件上传 (FileReader) 和文件下载 (Blob).
- **策略组顺序**: 逻辑中硬编码了默认策略组的顺序（如 default 组优先使用自动测速，default-direct 组优先使用直连）。

------



## 5. 使用指南

1. **打开应用**：浏览器访问部署地址。
2. **确认模版 (左侧)**：
   - 系统已内置了一份包含 DNS 优化、去广告、自动分流（香港/日本/美国等）的高级模版。
   - 如果您有自己的模版，可以点击“导入新模版”覆盖。
3. **上传订阅 (中间)**：
   - 找到您的机场订阅链接，在浏览器下载为 .yaml 文件，或直接复制文件内容。
   - 点击“导入文件”或直接粘贴到中间的文本框。
4. **选择模式 (右上角)**：
   - **兼容模式 (开启 - 推荐)**：生成的配置文件是“静态”的。Web 工具已经帮您把正则筛选算好了。**适用于所有内核** (Clash Premium, Clash Verge, ClashX, Mihomo)。
   - **原版模式 (关闭)**：生成的配置文件保留 include-all 和正则语法。**仅适用于最新的 Mihomo (Clash Meta) 内核**。
5. **生成与下载**：
   - 点击“刷新合并”查看预览。
   - 点击“下载 YAML”保存文件，然后导入您的 Clash 客户端即可。

------



## 6. 部署指南

由于这是一个纯静态的 Web 应用（无后端数据库），部署非常简单。

### 方法 A: 使用 Vercel / Netlify (推荐)

1. 将代码推送到 GitHub 仓库。
2. 在 Vercel 中导入该仓库。
3. Build Command 留空（或根据您具体的构建环境，本项目当前是基于浏览器运行时编译的，如果是标准 Angular CLI 项目则需 ng build）。
   - *注意*：当前提供的代码是基于 AI Studio/StackBlitz 的即时运行环境。如果要部署到生产环境，建议使用 Angular CLI 初始化一个标准项目并将代码迁移进去。

### 方法 B: 使用 Docker (Nginx)

如果是标准构建后的静态文件 (dist/ 目录)：

codeDockerfile



```
FROM nginx:alpine
COPY ./dist/mihomo-merger /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 方法 C: 本地运行 (开发环境)

如果您想在本地运行此代码，最简单的方法是使用支持 Angular 的在线 IDE（如 StackBlitz）或者本地搭建 Angular 环境：

1. 安装 Node.js 和 Angular CLI: npm install -g @angular/cli
2. 创建新项目: ng new mihomo-merger --style=css --routing=false --standalone
3. 安装 Tailwind CSS (参考 Tailwind 官方 Angular 指南)。
4. 安装 js-yaml 类型库: npm install js-yaml @types/js-yaml
5. 将上述提供的 src/ 文件内容复制到本地对应的文件中。
6. 运行: ng serve

------



## 7. 常见问题 (FAQ)

**Q: 为什么生成的配置文件里没有 include-all 了？**
A: 如果您开启了“兼容模式”，工具会把 include-all 的计算过程在浏览器里执行完毕，直接把结果（节点名称列表）写入了配置文件。这大大提高了配置文件的兼容性，防止旧版软件报错。

**Q: 我的机场只有 SSR 节点，支持吗？**
A: 支持。只要您的 Clash 核心支持该协议，本工具只是负责搬运和合并节点信息，不会修改节点本身的连接参数。

**Q: 为什么默认策略组不是“直连”？**
A: 为了更好的体验，我们将 Google, YouTube, Telegram 等国外服务的默认策略设为了 所有-智选（自动测速），这样您导入即用，无需手动切换。而 国内, Steam 等组默认设为了 直连 以节省流量。
