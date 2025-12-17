# YAML Config Merger Tool (YAML 配置合并工具)

**YAML Config Merger Tool** 是一个基于 Web 的纯前端工具，旨在帮助用户将个人的 Clash/Mihomo 机场订阅（节点信息）自动合并到预设的高级分流规则模版中。

它解决了"拥有好的规则模版，但每次更新订阅都需要手动复制粘贴节点"的痛点，并提供了独有的"兼容模式"，让不支持正则筛选的老旧内核也能使用高级分组逻辑。

## 1. 项目特点

- **隐私安全**：所有逻辑（解析、合并、生成）均在浏览器端（Client-side）执行，您的订阅信息**永远不会**发送到任何服务器。
- **极速合并**：基于 Angular Signals 和 JS-YAML，毫秒级响应。
- **智能兼容模式 (Polyfill)**：
  - **Smart 降级**：自动将 Mihomo 专属的 smart 策略组降级为通用的 url-test，防止老核心崩溃。
  - **前端正则预处理**：浏览器代替内核执行复杂的正则筛选（如 filter: "(?=.*(香港|HK)).*$"），生成静态的节点列表，确保在任何客户端（Clash Verge, Clash for Windows, ClashX）上都能完美运行。
- **注释保留**：智能重注机制，确保生成的 YAML 文件保留关键模块的中文注释，便于阅读。
- **现代化 UI**：使用 Tailwind CSS 构建的暗色系界面，简洁美观。

![YAML Config Merger Tool 界面预览](assets/Mihomo.png)

## 2. 部署指南

本项目完全支持 **Vercel** 和 **Netlify** 等现代静态网站托管平台，部署过程简单快捷。

### 2.1 Vercel 部署

#### 方法一：通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **构建项目**
   ```bash
   npm install
   npm run build
   ```

4. **部署到 Vercel**
   ```bash
   vercel --prod
   ```

#### 方法二：通过 Vercel 网页端

1. 将项目代码推送到 GitHub/GitLab/Bitbucket
2. 访问 [vercel.com](https://vercel.com) 并登录
3. 点击 "New Project"
4. 导入你的代码仓库
5. Vercel 会自动检测到 Angular 项目并进行以下配置：
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/yaml-config-merger-tool/browser`
   - **Node.js Version**: 18.x
6. 点击 "Deploy" 即可

#### Vercel 配置文件

项目已包含 `vercel.json` 配置文件：

```json
{
  "version": 2,
  "name": "yaml-config-merger-tool",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/yaml-config-merger-tool/browser"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist/yaml-config-merger-tool/browser",
  "installCommand": "npm install",
  "framework": "angular"
}
```

### 2.2 Netlify 部署

#### 方法一：通过 Netlify CLI

1. **安装 Netlify CLI**
   ```bash
   npm i -g netlify-cli
   ```

2. **登录 Netlify**
   ```bash
   netlify login
   ```

3. **构建项目**
   ```bash
   npm install
   npm run build
   ```

4. **部署到 Netlify**
   ```bash
   netlify deploy --prod --dir=dist/yaml-config-merger-tool/browser
   ```

#### 方法二：通过 Netlify 网页端

1. 将项目代码推送到 GitHub/GitLab/Bitbucket
2. 访问 [netlify.com](https://netlify.com) 并登录
3. 点击 "New site from Git"
4. 选择你的代码仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist/yaml-config-merger-tool/browser`
6. 点击 "Deploy site"

#### Netlify 配置文件

项目已包含 `netlify.toml` 配置文件：

```toml
[build]
  publish = "dist/yaml-config-merger-tool/browser"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### 2.3 GitHub Pages 部署

#### 方法一：使用 angular-cli-ghpages

1. **安装 angular-cli-ghpages**：
   ```bash
   npm install -g angular-cli-ghpages
   ```

2. **构建并部署**：
   ```bash
   # 方法A：使用预设的构建脚本（推荐）
   npm run build:github
   npx angular-cli-ghpages --dir=dist/yaml-config-merger-tool/browser

   # 方法B：手动指定仓库名（如果仓库名不是 yaml-config-merger-tool）
   npm run build -- --base-href "/your-repo-name/"
   npx angular-cli-ghpages --dir=dist/yaml-config-merger-tool/browser
   ```

3. **在 GitHub 仓库中启用 GitHub Pages**：
   - 进入仓库的 Settings 页面
   - 找到 Pages 选项
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "gh-pages" 和 "/"
   - 保存后即可访问 `https://your-username.github.io/your-repo-name`

#### 方法二：使用 GitHub Actions 自动部署

1. **创建 GitHub Actions 工作流**：

   在 `.github/workflows/deploy.yml` 中创建：

   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v4

       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
           node-version: '18'
           cache: 'npm'

       - name: Install dependencies
         run: npm ci

       - name: Build
         run: npm run build:github

       - name: Upload artifact
         uses: actions/upload-pages-artifact@v3
         with:
           path: ./dist/yaml-config-merger-tool/browser

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
       - name: Deploy to GitHub Pages
         id: deployment
         uses: actions/deploy-pages@v4
   ```

2. **启用 GitHub Pages**：
   - 在仓库 Settings → Pages 中，Source 选择 "GitHub Actions"

#### GitHub Pages 配置文件

项目已添加 GitHub Pages 相关配置：

- `package.json` 中包含 `build:github` 脚本
- `public/_redirects` 文件确保 Angular 路由正常工作

### 2.4 Cloudflare Pages 部署

#### 方法一：通过 Git 集成

1. **推送代码到 GitHub/GitLab**

2. **登录 Cloudflare Dashboard**：
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 选择 "Pages" 服务

3. **创建新项目**：
   - 点击 "Create a project"
   - 连接你的 Git 账户
   - 选择你的仓库

4. **配置构建设置**：
   - **Framework preset**: `Angular`
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `dist/yaml-config-merger-tool/browser`
   - **Node.js version**: `18`

5. **部署**：
   - 点击 "Save and Deploy"
   - Cloudflare 会自动构建和部署

#### 方法二：通过 Wrangler CLI

1. **安装 Wrangler CLI**：
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**：
   ```bash
   wrangler auth login
   ```

3. **构建项目**：
   ```bash
   npm install
   npm run build:cloudflare
   ```

4. **部署到 Cloudflare Pages**：
   ```bash
   npx wrangler pages deploy dist/yaml-config-merger-tool/browser --project-name yaml-config-merger-tool
   ```

#### 方法三：手动上传

1. **构建项目**：
   ```bash
   npm install
   npm run build:cloudflare
   ```

2. **上传文件**：
   - 访问 Cloudflare Pages Dashboard
   - 创建新项目，选择 "Upload assets"
   - 上传 `dist/yaml-config-merger-tool/browser` 目录下的所有文件

#### Cloudflare Pages 配置文件

项目已包含 Cloudflare Pages 配置：

- `wrangler.toml`：Cloudflare Workers 配置文件
- `public/_redirects`：确保 Angular SPA 路由正常工作
- `package.json` 中的 `build:cloudflare` 脚本

### 2.5 自定义服务器部署

#### 静态文件服务器

1. **构建项目**：
   ```bash
   npm install
   npm run build
   ```

2. **部署文件**：
   将 `dist/yaml-config-merger-tool/browser` 目录下的所有文件上传到任何静态文件服务器。

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist/yaml-config-merger-tool/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Apache 配置示例

在网站根目录创建 `.htaccess` 文件：

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# 静态资源缓存
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/ico "access plus 1 year"
    ExpiresByType image/svg "access plus 1 year"
</IfModule>
```

### 2.6 部署前检查清单

在部署前，请确保：

- ✅ 项目依赖已正确安装：`npm install`
- ✅ 本地构建成功：`npm run build`
- ✅ 确认 `dist/yaml-config-merger-tool/browser` 目录存在且包含 `index.html`
- ✅ 检查 `package.json` 中的构建脚本正确
- ✅ 如有自定义域名，配置相应的域名解析

### 2.7 部署后验证

部署完成后，验证以下功能：

1. 页面能够正常加载
2. YAML 配置上传功能正常
3. 配置合并功能正常工作
4. 结果下载功能正常
5. 所有样式和脚本正确加载

## 3. 部署平台对比

| 平台 | 部署难度 | 免费额度 | 全球 CDN | 自动 HTTPS | 自定义域名 | 持续部署 |
|------|----------|----------|----------|------------|------------|----------|
| **Vercel** | ⭐⭐ | 100GB/月 | ✅ | ✅ | ✅ | ✅ |
| **Netlify** | ⭐⭐ | 100GB/月 | ✅ | ✅ | ✅ | ✅ |
| **GitHub Pages** | ⭐⭐⭐ | 1GB 存储 | ✅ | ✅ | ✅ | ✅ |
| **Cloudflare Pages** | ⭐⭐ | 500 构建/月 | ✅ | ✅ | ✅ | ✅ |
| **自定义服务器** | ⭐⭐⭐⭐⭐ | 自定义 | 视配置 | 需配置 | 需配置 | 手动 |

### 推荐选择

- **新手推荐**：Vercel 或 Netlify - 零配置，自动检测
- **开源项目**：GitHub Pages - 与 GitHub 深度集成
- **性能优先**：Cloudflare Pages - 全球性能最优
- **企业用户**：自定义服务器 - 完全控制

## 4. 技术架构

本项目是一个 **Angular (v21+)** 应用，采用 **Standalone Components** 架构。

### 技术栈

- **框架**: Angular (Standalone, Signals)
- **样式**: Tailwind CSS
- **核心库**: js-yaml (用于 YAML <-> JSON 转换)
- **构建工具**: Angular CLI
- **语法高亮**: Prism.js

### 核心逻辑流程

1. **Input**: 用户输入"基础模版 YAML" + "个人订阅 YAML"。
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

## 5. 项目目录结构

```
.
├── README.md                    # 项目说明文档
├── package.json                 # 项目依赖配置
├── angular.json                 # Angular 项目配置
├── tsconfig.json                # TypeScript 配置
├── vercel.json                  # Vercel 部署配置
├── netlify.toml                 # Netlify 部署配置
├── assets/                      # 存放图片等资源文件
│   └── Mihomo.png              # 应用界面预览图
├── public/                      # 存放公共资源文件
│   ├── favicon.ico             # 网站 favicon 图标
│   └── favicon.svg             # 网站 favicon 图标 (SVG格式)
└── src
    ├── index.html               # 入口 HTML
    ├── main.ts                  # Angular 启动文件
    ├── styles.css               # 全局样式文件
    └── app/
        ├── app.component.html    # 主布局 HTML
        ├── app.component.ts      # 根组件逻辑
        ├── components
        │   └── config-merger.component.ts    # 核心交互组件
        └── services
            ├── yaml-processor.service.ts     # YAML 处理服务
            └── highlight.service.ts          # 语法高亮服务
```

### 目录结构说明

- **根目录**：包含主要的项目文件和配置文件
- **assets/**：存放应用内部使用的资源文件，如图片、字体等
- **public/**：存放需要直接对外提供访问的静态资源文件，如 favicon、robots.txt 等
- **src/**：存放应用的源代码
  - **app/**：Angular 应用主目录
    - **components/**：存放 Angular 组件
    - **services/**：存放服务类，提供业务逻辑和数据处理功能

## 6. 本地开发

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run start
```

访问 http://localhost:4200 查看应用。

### 构建生产版本

```bash
npm run build
```

构建后的文件将生成在 `dist/yaml-config-merger-tool/browser` 目录。

## 7. 贡献指南

欢迎提交 Issue 和 Pull Request！

## 8. 许可证

本项目采用 MIT 许可证。