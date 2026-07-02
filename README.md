# SJTU jAccount 验证码助手

[![CI](https://github.com/tangmubai/SJTU-Login-Addon/actions/workflows/ci.yml/badge.svg)](https://github.com/tangmubai/SJTU-Login-Addon/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tangmubai/SJTU-Login-Addon)](https://github.com/tangmubai/SJTU-Login-Addon/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

你是否不胜 jAccount 频繁登录还要输验证码的烦扰？这个适用于 Edge/Chrome 的 Manifest V3 扩展正适合你：打开 SJTU jAccount 登录页后，扩展在**浏览器本地**识别并填写验证码，无需任何第三方服务。搭配可选的"自动登录"功能，可以做到打开登录页即完成登录。

## 功能特性

- **本地验证码识别**：内置 ddddocr 的 ONNX 模型，通过 onnxruntime-web（WASM）在浏览器内推理，验证码图片不离开本机
- **自动填写**：监测登录页验证码出现或刷新，识别后自动填入输入框
- **可选自动登录**：默认关闭；开启后可将 jAccount 账号密码经 AES-GCM 加密保存在本机，登录页加载后自动填充并提交
- **克制的提交策略**：仅当用户名、密码、验证码全部就绪时才延迟 500 ms 点击登录；每次页面加载最多自动尝试 3 次
- **最小权限**：只申请 `storage` 权限和 `jaccount.sjtu.edu.cn` 的站点权限

## 安装

### 方式一：从 Release 下载（推荐）

1. 在 [Releases](https://github.com/tangmubai/SJTU-Login-Addon/releases/latest) 下载最新的 `SJTU-Autologin-<version>.zip` 并解压。
2. Edge 打开 `edge://extensions`，Chrome 打开 `chrome://extensions`。
3. 开启"开发人员模式"。
4. 点击"加载解压缩的扩展"，选择解压后的目录。

> Release 同时提供签名的 `.crx` 文件和 `SHA256SUMS.txt` 校验和。注意 Windows/macOS 上的 Chrome 默认禁止安装商店外的 `.crx`（Linux 开发者模式可用），普通用户请使用 ZIP 方式。

### 方式二：从源码构建

见下方[开发](#开发)一节，构建产物在 `dist/` 目录，同样用"加载解压缩的扩展"载入。

## 使用方法

1. 安装后点击工具栏扩展图标，等待状态显示"本地 OCR 模型已就绪"（首次加载模型需几秒）。
2. "自动填写验证码"默认开启，打开 jAccount 登录页即生效。
3. 如需自动登录：打开"自动登录"开关，填入 jAccount 账号密码并点击"加密保存到本机"。之后打开登录页会自动填充账号、识别验证码并提交。
4. 随时可在弹窗中点击"清除"删除已保存的凭据。

## 工作原理

```
登录页 (content.js)                 Service Worker (background.js)
┌─────────────────────┐            ┌──────────────────────────────┐
│ 监测验证码 <img>     │──图片 PNG──▶│ ocr.js: onnxruntime-web WASM │
│ 填入识别结果          │◀──识别文本──│  + common.onnx + CTC 解码    │
│ 自动登录门控          │──取凭据────▶│ credentials.js: AES-GCM      │
│ (500ms 延迟/限 3 次) │◀──解密凭据──│  加解密 chrome.storage       │
└─────────────────────┘            └──────────────────────────────┘
```

- `content.js` 通过多组选择器定位密码登录表单的验证码图片与输入框（刻意排除短信登录和图标），用 canvas 将图片转为 PNG 后发给后台。
- `ocr.js` 用 onnxruntime-web 的单线程 WASM 后端运行 `assets/common.onnx`（ddddocr beta 模型），输出经 `ctc.js` 做 CTC 贪心解码得到文本。
- 自动登录由 `auto-login.js` 的提交门控管理：凭据填充完成 + 验证码识别完成 → 延迟 `500 ms` 提交，每页最多 `3` 次，避免识别错误时无限循环。
- 凭据经 Web Crypto 的 AES-GCM（256 位）加密后存入 `chrome.storage.local`；密钥是**不可导出**的 CryptoKey，单独存于扩展的 IndexedDB。后台校验消息来源，仅扩展自身页面可读写凭据、仅 jAccount 登录页的内容脚本可取用。

## 隐私与安全

- 扩展不读取、不上传网页内用户输入的任何信息；验证码图片只在当前浏览器中处理。
- 自动登录为可选功能，凭据加密保存在本机，清除按钮会同时删除密文和密钥。
- 构建和测试都会校验内置模型 `common.onnx` 的 SHA-256，防止资产被篡改。

## 开发

需要 Node.js 18 或更高版本：

```powershell
npm install
npm run check   # 运行测试
npm run build   # 构建到 dist/
npm run package # 构建并打包 release/SJTU-Autologin-<version>.zip
```

构建会先校验内置 `common.onnx` 的 SHA-256，再用 esbuild 打包三个入口（`background.js`、`content.js`、`popup.js`）并复制静态资源到 `dist/`。修改代码后重新执行 `npm run build`，在扩展管理页点击"重新加载"。

### 测试

```powershell
npm run check
```

测试包含 CTC 解码、自动登录门控、清单与发布资源审计。`tests/fixtures/jaccount-captcha.png` 是匿名获取的固定测试验证码；Python `ddddocr(beta=True)` 和浏览器 WASM 的参考结果均为 `bsbsk`。`tests/browser-harness.html` 可在浏览器中手动验证 WASM 推理结果。

## 许可证

本项目源码以 [MIT 许可证](LICENSE) 开源，版权所有 © 2026 sj-tu.com。

内置的验证码识别模型（`common.onnx`，源自 ddddocr）及 onnxruntime-web 等运行时依赖遵循各自的许可证，详见 [THIRD_PARTY_NOTICES.txt](extension/THIRD_PARTY_NOTICES.txt)。
