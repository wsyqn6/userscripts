# AGENT.md

改用户脚本时的调试约定。工具不入库，全部放在 `temp/`（已 gitignore）。

## 调试通道

`temp/cdp/cdp.mjs` 是零依赖 CDP 客户端（bun 自带 WebSocket/spawn），配合隔离 profile 做后台静默调试：

```bash
bun temp/cdp/cdp.mjs launch <url> [--headful]   # 起实例，默认无头
bun temp/cdp/cdp.mjs go <url>                   # 导航
bun temp/cdp/cdp.mjs eval "<expr>"              # 求值，支持 await
bun temp/cdp/cdp.mjs eval-file <file>           # 注入整个用户脚本
bun temp/cdp/cdp.mjs shot <out.png>             # 视口截图
bun temp/cdp/cdp.mjs close
```

## 红线

- 不要把 `--user-data-dir` 指向用户真实的 Edge profile。
- 不要用 junction/符号链接去绕「默认 profile 禁用调试端口」，也不要复制 profile：路径一变 Chrome 就重建 ABE 密钥，旧 cookie 解不开并被清空。这事已经发生过一次，Profile 1 的登录态没了。
- 登录态放在 `temp/cdp/profile`，需要新账号时用 `--headful` 让用户扫一次码，之后全部无头复用。

## 知乎风控

- UA 含 `HeadlessChrome` 会被识别，启动时用 `--user-agent` 覆盖成正常 Edge UA。
- 同一 URL 反复整页 `go` 是最容易触发 `40362` 的动作，优先在页面内点击做 SPA 跳转。
- 操作间隔留 3～5 秒；滚动用 `Input.dispatchMouseEvent` 的 mouseWheel，`scrollIntoView` 在知乎页面常常无效。
- 被限流时页面只剩一百多字节的 JSON，脚本什么都扫不到，等 5～30 分钟自解。改 UA 通常无效，标记挂在 IP + 指纹上。

## 验证

真实页面：注入 `zhihu-clean.js` 后读 `img[data-zhihu-ph]`（打标数、`aspect-ratio`）、`[data-zhihu-blank]`、`document.title`，再截图核对。

被风控时用本地复刻页：造 `.TopstoryItem` / `.List-item` > `.AnswerItem` / `.CommentContent` 结构，图片用指定宽高的 data URI SVG，`file://` 打开后注入真实脚本，断言打标、头像可见、广告与空推荐位被删。

## 提交

conventional commits，英文单行，冒号后小写，例：

```
perf(zhihu): drop forced reflow and duplicate subtree scans
```
