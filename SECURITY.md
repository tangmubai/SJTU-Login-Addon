# 安全政策 · Security Policy

## 支持的版本

安全修复仅针对最新发布版本。请在报告前先确认问题在
[最新 Release](https://github.com/tangmubai/SJTU-Login-Addon/releases/latest) 上仍可复现。

| 版本 | 是否支持 |
| --- | --- |
| 最新 Release | ✅ |
| 更早版本 | ❌ |

## 报告漏洞

**请勿公开提交安全漏洞的 issue。** 请通过以下私密渠道报告：

- GitHub 私密漏洞报告（推荐）：仓库 **Security → Report a vulnerability**
  （<https://github.com/tangmubai/SJTU-Login-Addon/security/advisories/new>）

报告时请尽量包含：

- 受影响的版本与浏览器（Chrome / Edge 及版本号）
- 复现步骤或概念验证
- 你评估的影响范围

## 响应

我们会尽力在 **7 天内**确认收到报告，并在修复发布后于安全公告中致谢
（除非你希望匿名）。

## 安全设计要点

本扩展的凭据处理遵循以下原则，报告相关问题时可作参考：

- 账号密码经 **AES-GCM 256 位**加密后才写入 `chrome.storage.local`。
- 加密密钥为**不可导出**的 `CryptoKey`，单独存于扩展的 IndexedDB。
- 后台脚本对消息来源做校验：仅扩展自身页面可读写凭据，仅 jAccount
  登录页的内容脚本可取用解密结果。
- 验证码识别在本机通过 WebAssembly 完成，扩展**不发起任何外部网络请求**。
- 构建与测试会校验内置模型 `common.onnx` 的 SHA-256，防止资产被篡改。
