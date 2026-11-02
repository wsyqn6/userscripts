# 自用油猴脚本

[![License: MIT](https://badgen.net/badge/License/MIT/yellow)](LICENSE)
![Tampermonkey](https://badgen.net/badge/Tampermonkey/compatible/brightgreen)
![GitHub last commit](https://badgen.net/github/last-commit/wsyqn6/userscripts)

## 知乎净化 · zhihu-clean.js

知乎阅读增强：宽屏布局、护眼配色、内容净化三者合一。

- **布局** 宽屏显示、液态玻璃顶栏（下滑自动隐藏）、正文排版可读性优化
- **主题** 7 种护眼配色（晨曦白/薄荷绿/羊皮纸/深空黑等），右下角切换并记忆
- **净化** 屏蔽官方广告位与带货商品卡；折叠回答图片、首页文章可按需关闭
- **阅读** 回到顶部按钮；`←` `→` 在当前回答内逐张浏览图片；回答未展开也显示发布/编辑时间
- **性能** 离屏卡片跳过布局与绘制，长期滚动不累积卡顿

功能开关集中在右下角主题菜单内，状态本地保存。

## IT之家解锁 · ithome-unlock.js

绕过 IT 之家的登录墙与信息流限制。

- 解锁仅登录可见的正文图片
- 移除页面广告
- 热榜集成进侧边栏
- 信息流全宽展示
- 回到顶部悬浮按钮

## 链接直达 · link-direct.js

去掉站点中转页，链接点开即目标页。

- 跳过知乎 `link.zhihu.com`、掘金等站点的跳转中间页
- 保留原有的新标签页打开行为

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）
2. 打开对应脚本的 raw 地址，油猴会弹出安装页：

```
https://raw.githubusercontent.com/wsyqn6/userscripts/main/zhihu-clean.js
https://raw.githubusercontent.com/wsyqn6/userscripts/main/ithome-unlock.js
https://raw.githubusercontent.com/wsyqn6/userscripts/main/link-direct.js
```

## 开发调试

`dev/cdp.js` 用系统 Edge/Chrome 的调试端口直接注入脚本，无需安装油猴（依赖 [bun](https://bun.sh)）：

```bash
bun dev/cdp.js up https://www.zhihu.com/          # 启动带调试端口的浏览器
bun dev/cdp.js inject zhihu-clean.js --url zhihu.com  # 注入脚本并重载，回显 console
bun dev/cdp.js eval "document.title" --url zhihu.com  # 在页面里求值
bun dev/cdp.js key j --times 3                    # 真实按键（合成事件触发不了站点快捷键）
bun dev/cdp.js click 506 478                      # 真实点击；move 对应 hover
bun dev/cdp.js shot out.png                       # 截图
bun dev/cdp.js send Page.bringToFront             # 直连任意 CDP 命令
```

多标签页时用 `--target <targetId 前缀>` 精确定位，`tabs` 可列出。

## License

[MIT](LICENSE) © 2026 wsyqn6
