# 自用油猴脚本

[![License: MIT](https://badgen.net/badge/License/MIT/yellow)](LICENSE)
![Tampermonkey](https://badgen.net/badge/Tampermonkey/compatible/brightgreen)
![GitHub last commit](https://badgen.net/github/last-commit/wsyqn6/userscripts)

## 脚本列表

### zhihu.js
知乎极简宽屏 · 液态玻璃顶栏 · 7 种护眼主题 · 广告位与带货商品卡屏蔽 · 折叠回答图片/首页文章/商品卡三个开关 · 回到顶部 · 长列表滚动与渲染优化

### link-direct.js
跳过知乎等网站的中转页，直接访问目标链接

### ithome.js
绕过 IT 之家登录限制，直接显示需要登录才能查看的图片

## 开发调试

`dev/cdp.js` 用系统 Edge/Chrome 的调试端口直接注入脚本，无需安装油猴（依赖 [bun](https://bun.sh)）：

```bash
bun dev/cdp.js up https://www.zhihu.com/          # 启动带调试端口的浏览器
bun dev/cdp.js inject zhihu.js --url zhihu.com    # 注入脚本并重载，回显 console
bun dev/cdp.js eval "document.title" --url zhihu.com
bun dev/cdp.js key j --times 3                    # 真实按键（合成事件触发不了站点快捷键）
bun dev/cdp.js click 506 478                      # 真实点击；move 对应 hover
bun dev/cdp.js shot out.png                       # 截图
```

多标签页时用 `--target <targetId 前缀>` 精确定位，`tabs` 可列出。

## License

[MIT](LICENSE) © 2026 wsyqn6
