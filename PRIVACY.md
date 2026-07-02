# 隐私政策 · Privacy Policy

**扩展名称 / Extension：** SJTU jAccount 验证码助手（SJTU-Autologin）
**最后更新 / Last updated：** 2026-07-03

---

## 中文

### 1. 概述

SJTU jAccount 验证码助手（下称"本扩展"）是一个开源的浏览器扩展，用于在
`jaccount.sjtu.edu.cn` 登录页**在本机识别并填写验证码**，并提供可选的自动登录功能。
本扩展在设计上遵循**数据最小化**与**本地优先**原则：所有处理都在你的浏览器内完成，
**不向任何服务器（包括开发者自己的服务器）发送、上传或分享任何数据**。

### 2. 本扩展处理的数据

| 数据类型 | 何时产生 | 用途 | 存储位置 | 是否上传 |
| --- | --- | --- | --- | --- |
| 登录页验证码图片 | 你打开 jAccount 登录页且页面显示验证码时 | 在本机识别验证码文本并回填输入框 | 仅存在于内存，识别后即丢弃 | 否 |
| jAccount 账号与密码 | **仅当你主动开启"自动登录"并点击"加密保存到本机"时** | 在 jAccount 登录页自动填充账号密码 | 经 AES-GCM 加密后存于浏览器本地（`chrome.storage.local`），加密密钥单独存于扩展的 IndexedDB | 否 |
| 扩展设置（是否开启自动填写／自动登录） | 你在弹窗中切换开关时 | 记住你的偏好 | 浏览器本地（`chrome.storage.local`） | 否 |

本扩展**不收集**：浏览历史、Cookie、其它网站的任何内容、设备标识、位置、
分析或遥测数据。

### 3. 数据如何被保护

- **验证码识别完全在本机进行**：使用内置的 ONNX 模型和 WebAssembly 运行时，
  验证码图片不会离开你的浏览器。
- **凭据加密存储**：若你选择保存账号密码，它们会经 **AES-GCM 256 位**加密后
  才写入本地存储；加密密钥是**不可导出（non-extractable）**的，单独保存在扩展的
  IndexedDB 中，其它网页或脚本无法读取。
- **来源校验**：后台脚本会校验消息来源，只有扩展自身的弹窗页面可以读写凭据，
  只有 `jaccount.sjtu.edu.cn` 登录页的内容脚本可以取用解密后的凭据用于填充。
- **无外部网络请求**：本扩展不请求任何外部服务、CDN 或第三方接口。

### 4. 数据保留与删除

- 验证码图片仅在识别过程中短暂存在于内存，识别后即被丢弃。
- 保存的账号密码会**一直保留在本机**，直到发生以下任一情况：
  - 你在扩展弹窗中点击**"清除"**（同时删除密文和加密密钥）；
  - 你卸载本扩展；
  - 你清除浏览器对该扩展的存储数据。

### 5. 数据共享

本扩展**不向任何第三方出售、转让或分享**你的任何数据。开发者也无法访问你的
账号、密码或验证码——这些数据从不离开你的设备。

### 6. 第三方组件

本扩展内置了以下开源组件用于本地推理，它们随扩展一起分发、在本机运行，
不涉及任何联网行为：

- **ddddocr**（验证码识别模型，MIT 许可证）
- **ONNX Runtime Web**（推理运行时，MIT 许可证）

详见仓库中的 `extension/THIRD_PARTY_NOTICES.txt`。

### 7. 儿童隐私

本扩展面向上海交通大学 jAccount 用户，不面向 13 岁以下儿童，也不会有意收集
儿童的任何信息。

### 8. 政策变更

本政策如有更新，将在本文件与扩展仓库中发布，并更新顶部的"最后更新"日期。

### 9. 联系方式

如对本隐私政策有任何疑问，请联系admin@sj-tu.com

---

## English

### 1. Overview

SJTU jAccount Captcha Helper ("the Extension") is an open-source browser
extension that **recognizes and fills login captchas locally** on the
`jaccount.sjtu.edu.cn` sign-in page, with an optional auto-login feature.
The Extension is built around **data minimization** and a **local-first**
design: all processing happens inside your browser, and **no data is ever
sent, uploaded, or shared with any server — including the developer's.**

### 2. Data the Extension Handles

| Data | When | Purpose | Where stored | Uploaded? |
| --- | --- | --- | --- | --- |
| Login captcha image | When you open the jAccount login page and a captcha is shown | Recognize the captcha text locally and fill the input | In memory only; discarded after recognition | No |
| jAccount username & password | **Only if you enable "Auto-login" and click "Save encrypted locally"** | Auto-fill credentials on the jAccount login page | AES-GCM encrypted in `chrome.storage.local`; key stored separately in the extension's IndexedDB | No |
| Extension settings (autofill / auto-login toggles) | When you toggle switches in the popup | Remember your preferences | `chrome.storage.local` | No |

The Extension does **not** collect: browsing history, cookies, content of any
other website, device identifiers, location, analytics, or telemetry.

### 3. How Data Is Protected

- **Captcha recognition runs entirely on-device** using a bundled ONNX model
  and a WebAssembly runtime; captcha images never leave your browser.
- **Credentials are encrypted at rest** with **AES-GCM 256-bit** before being
  written to local storage. The encryption key is **non-extractable** and
  stored separately in the extension's IndexedDB, unreadable by web pages or
  other scripts.
- **Origin checks**: the background script validates message senders — only the
  extension's own popup may read/write credentials, and only the content script
  on `jaccount.sjtu.edu.cn` may retrieve decrypted credentials for filling.
- **No external network requests** are made to any service, CDN, or third party.

### 4. Data Retention & Deletion

- Captcha images exist only transiently in memory and are discarded after
  recognition.
- Saved credentials **remain on your device** until any of the following:
  - you click **"Clear"** in the popup (deletes both ciphertext and key);
  - you uninstall the Extension;
  - you clear the browser's storage for this Extension.

### 5. Data Sharing

The Extension does **not sell, transfer, or share** any of your data with third
parties. The developer cannot access your credentials or captchas — that data
never leaves your device.

### 6. Third-Party Components

The Extension bundles the following open-source components for on-device
inference; they run locally and perform no network activity:

- **ddddocr** (captcha model, MIT License)
- **ONNX Runtime Web** (inference runtime, MIT License)

See `extension/THIRD_PARTY_NOTICES.txt` in the repository.

### 7. Children's Privacy

The Extension targets SJTU jAccount users, is not directed at children under 13,
and does not knowingly collect information from children.

### 8. Changes

Updates to this policy will be published in this file and the extension
repository, with the "Last updated" date revised accordingly.

### 9. Contact

Questions about this policy: please contact admin@sj-tu.com
