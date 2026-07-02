# 商店上架清单与文案（Chrome Web Store / Edge Add-ons）

这份文档汇总了两个商店提交时需要填写的所有字段，内容可直接复制粘贴。
提交用的安装包是 `npm run package` 生成的 `release/SJTU-Autologin-<version>.zip`
（**不要**上传 `.crx`，商店会自行签名）。

---

## 一、通用清单（两个商店都要）

| 项目 | 内容 | 状态 |
| --- | --- | --- |
| 安装包 ZIP | `release/SJTU-Autologin-<version>.zip`（manifest 在根目录） | ✅ `npm run package` |
| 图标 128×128 | `extension/icons/icon-128.png` | ✅ 已内置 |
| 隐私政策 URL | `https://privacy.sj-tu.com/sjtu-autologin/` | ✅ Cloudflare Pages 页面已准备 |
| 商店截图（≥1 张） | 弹窗界面 + 登录页自动填写效果 | ⬜ **待你截图** |
| 支持/联系邮箱 | 你的邮箱 | ⬜ 提交时填写 |
| 类别 | Productivity / Tools（生产力工具） | 提交时选择 |
| 语言 | 简体中文（zh-CN） | 提交时选择 |

> **截图要求**：Chrome 需 1280×800 或 640×400；Edge 需 1280×800（或
> 640×480）。至少 1 张，建议 2–3 张：①弹窗总览 ②开启自动登录后的凭据表单
> ③登录页验证码被自动填入的效果。截图中请**使用测试/示例账号**，不要暴露真实密码。

---

## 二、商店文案（可直接复制）

### 名称
```
SJTU jAccount 验证码助手
```

### 简短描述（Chrome ≤132 字符 / Edge 亦短）
```
在浏览器本地识别并填写 SJTU jAccount 登录验证码，可选加密保存账号密码实现自动登录，数据全程不出本机。
```

### 详细描述
```
告别 jAccount 登录时反复手输验证码的烦恼。

本扩展在你打开 jAccount 登录页时，于浏览器本地自动识别并填写验证码，
无需任何第三方服务。你还可以选择开启"自动登录"，在本机加密保存账号密码后，
打开登录页即可自动完成登录。

【功能特性】
· 本地验证码识别：内置 ONNX 模型 + WebAssembly，验证码图片不离开你的浏览器
· 自动填写：识别后自动填入验证码输入框
· 可选自动登录：默认关闭；开启后账号密码经 AES-GCM 加密保存在本机
· 克制的提交策略：仅当账号、密码、验证码全部就绪时才延迟点击登录，每页最多尝试 3 次
· 最小权限：仅申请本地存储权限和 jaccount.sjtu.edu.cn 的站点权限

【隐私优先】
· 所有处理都在你的浏览器内完成，不向任何服务器上传数据
· 保存的账号密码经加密后仅存于本机，可随时一键清除
· 完全开源，代码与隐私政策公开可查

开源地址：https://github.com/tangmubai/SJTU-Login-Addon
```

---

## 三、权限说明（审核时逐条填写）

| 权限 | 说明文案 |
| --- | --- |
| `storage` | 用于在本机保存扩展设置，以及（用户主动开启自动登录时）经 AES-GCM 加密后的账号密码。数据仅存于本地，不上传。 |
| `host_permissions: https://jaccount.sjtu.edu.cn/*` | 扩展仅需在 SJTU jAccount 登录页运行，用于读取验证码图片、回填验证码，以及（可选）自动填充登录凭据。不访问任何其它网站。 |

**关于 `wasm-unsafe-eval`（如被问及）**：内容安全策略中的 `wasm-unsafe-eval`
是运行本地 ONNX 验证码识别模型（WebAssembly）所必需的，属于 Manifest V3
允许的 WASM 例外，不涉及远程代码执行——所有模型与运行时均随扩展本地分发。

---

## 四、数据使用披露（Chrome "Privacy practices" 表单）

Chrome Web Store 提交时会逐项询问，如实勾选如下：

- **收集或使用的数据类型**：仅"网站内容/用户凭据"——即用户主动保存的
  jAccount 账号密码（用于自动登录）。**不收集**位置、健康、财务、个人通信、
  网页浏览记录、用户活动等。
- **是否将数据用于与核心功能无关的用途**：否
- **是否出售数据给第三方**：否
- **是否将数据用于广告/信用评估等**：否
- **是否传输用户数据**：**否**（数据从不离开用户设备）
- 需勾选三项开发者认证：
  - ✅ 不将用户数据出售给第三方
  - ✅ 不将用户数据用于与单一用途无关的目的
  - ✅ 不将用户数据用于确定信用度或放贷
- **隐私政策 URL**：`https://privacy.sj-tu.com/sjtu-autologin/`

### Cloudflare Pages 部署

隐私政策静态页面位于 `privacy-site/`。在 Cloudflare Pages 中连接本仓库，并填写：

- Production branch：`main`
- Framework preset：`None`
- Build command：留空
- Build output directory：`privacy-site`
- Custom domain：`privacy.sj-tu.com`

推荐使用独立子域名 `privacy.sj-tu.com`，避免影响 `sj-tu.com` 上已有的网站和服务。
当前扩展的隐私政策位于子路径 `/sjtu-autologin/`，便于将来在同一 Pages
项目下继续增加其它产品的隐私政策。

> Edge Partner Center 的数据披露问题与上面基本一致，按同样口径填写即可。

---

## 五、提交流程速查

### Chrome Web Store
1. 注册开发者账号（一次性 $5）：<https://chrome.google.com/webstore/devconsole>
2. New Item → 上传 ZIP → 填写上面的文案、截图、隐私政策、权限说明、数据披露
3. 可见性建议先选 **Unlisted**（仅凭链接安装，审核压力更小）
4. 提交审核（首次通常数天至两周，含凭据功能可能被人工复审）

### Edge Add-ons（国内更易访问，建议优先）
1. 注册（免费）：<https://partner.microsoft.com>（Edge program）
2. 新建提交 → 上传同一份 ZIP → 填写文案、截图、隐私政策、数据披露
3. 提交审核（通常数小时至数天）

---

## 六、发布新版本时

1. 提升 `extension/manifest.json` 与 `package.json` 的版本号并合入 main（走 PR）。
2. `npm run package` 生成新的 ZIP。
3. 分别在 Chrome / Edge 开发者后台上传新 ZIP 作为新版本（文案通常无需重填）。
4. 商店审核通过后会自动向已安装用户推送更新。

> GitHub Release（打 `v<version>` 标签触发）与商店发布是**相互独立**的两条渠道，
> 可以只发其中之一，也可以两者都发。
