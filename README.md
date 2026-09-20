# Open Excalidraw Manager

自托管 Excalidraw，带服务器目录文件管理、导入/导出与保存。

Fork 自 [wu66chen/excalidraw-nas-file-browser](https://github.com/wu66chen/excalidraw-nas-file-browser)，并增强：

- 右下角固定 **导入 / 导出 / 保存** 按钮
- 从本机导入 `.excalidraw` 并写入服务器工作目录
- 导出当前画布到本机
- 禁用缓存，避免与旧版前端冲突
- SPA 路由回退

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Excalidraw](https://img.shields.io/badge/Excalidraw-0.17.6-6965db)](https://excalidraw.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com)

## 功能

| 模块 | 功能 |
|------|------|
| **文件浏览** | 侧边栏浏览服务器目录，面包屑导航 |
| **打开文件** | 双击 `.excalidraw` 加载到画布 |
| **保存** | Ctrl+S / 保存按钮，写回服务器原路径 |
| **导入** | 从本机选择文件，保存到服务器并打开 |
| **导出** | 下载当前画布为 `.excalidraw` |
| **重命名** | 鼠标悬停文件/文件夹，点击 ✏️ |
| **删除** | 鼠标悬停文件/文件夹，点击 🗑️ |
| **未保存保护** | 切换文件/刷新前提示 |

## 快速部署

```bash
git clone https://github.com/cloud-prg/open-excalidraw-manager.git
cd open-excalidraw-manager
mkdir -p data
docker compose up -d --build
```

默认端口 `48501`，工作目录挂载为 `./data`。

访问：http://localhost:48501/

## 配置

| 项 | 说明 |
|----|------|
| 端口 | 修改 `docker-compose.yml` 中 `48501:80` |
| 工作目录 | 修改 volumes 中 `./data:/data` |
| 默认目录 | `public/index.html` 中 `DEFAULT_DIR`（默认 `/`） |

## 构建说明

Docker 构建需要 `assets/` 下的 Excalidraw UMD 文件（已包含在仓库中）。若缺失，可执行：

```bash
cd assets
curl -fsSLO https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js -o excalidraw.js
curl -fsSLO https://unpkg.com/react@18/umd/react.production.min.js -o react.js
curl -fsSLO https://unpkg.com/react-dom@18/umd/react-dom.production.min.js -o react-dom.js
curl -fsSLO https://raw.githubusercontent.com/excalidraw/excalidraw/v0.17.6/src/locales/zh-CN.json -o zh-CN.json
```

## 许可

MIT License — 基于原项目 [wu66chen/excalidraw-nas-file-browser](https://github.com/wu66chen/excalidraw-nas-file-browser)。
