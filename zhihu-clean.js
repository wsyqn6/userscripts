// ==UserScript==
// @name         知乎净化
// @namespace    https://github.com/wsyqn6/userscripts
// @version      3.14
// @description  宽屏布局与玻璃顶栏、7 种护眼主题、广告与商品卡屏蔽、导航精简、回到顶部、大图查看器左右键/按钮翻图、未展开显示回答时间、长列表性能优化、图片屏蔽（定宽占位胶囊，折叠与评论区同一套）、标签页标题低调化
// @author       wsyqn6
// @match        *://www.zhihu.com/*
// @match        *://zhuanlan.zhihu.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
'use strict';

// ==================== 配置常量 ====================
const C = {
    MAX_CACHE: 100, HEADER_HIDE: 100, HEADER_SHOW: 160, THROTTLE: 100,
    TOP_SHOW: 600, MAX_BATCH: 120,
    URL_DELAY: 500, SCROLL_DELAY: 800, INIT_DELAY: 1000, HOME_DELAY: 1500,
    S: {
        time: '.ContentItem-time',
        // 官方广告位：旧版 feed 广告、右侧栏、商业内容卡（pc-article-answer 文字卡/大图卡）
        ads: '[class*="advertCard"], [class*="Pc-feedAd"], [class*="Pc-word"], .PinItem, .Pc-Business-Card-PcTopFeedBanner, [data-za-detail-view-path-module="RightSideBar"], .GlobalSideBar, [class~="pc-article-answer"], [class~="pc-article-answer-big-img"]'
    },
    // g 为主题分组：light 浅色 / eye 护眼 / dark 暗色
    THEMES: {
        light:    { n:'晨曦白',   g:'light', bg:'#f7f5f0', tx:'#2e2924', ti:'#1a1712', ac:'#8a7660', bd:'#ddd6cc', cd:'#fefdfa', hd:'rgba(247,245,240,0.72)', lk:'#5b7a9a', hl:'rgba(91,122,154,0.1)' },
        rose:     { n:'豆沙粉',   g:'light', bg:'#f8efee', tx:'#3a2f2d', ti:'#241a18', ac:'#a1837c', bd:'#e5d3d0', cd:'#fdf9f8', hd:'rgba(248,239,238,0.72)', lk:'#9e5f54', hl:'rgba(158,95,84,0.1)' },
        amber:    { n:'琥珀黄昏', g:'light', bg:'#f5e9d2', tx:'#3f3220', ti:'#261c0e', ac:'#b08844', bd:'#e0cfb4', cd:'#fcf4e6', hd:'rgba(245,233,210,0.72)', lk:'#b07a28', hl:'rgba(176,122,40,0.1)' },
        green:    { n:'薄荷绿',   g:'eye',   bg:'#e4ede4', tx:'#283228', ti:'#182418', ac:'#527a52', bd:'#c4d4c4', cd:'#f0f6f0', hd:'rgba(228,237,228,0.72)', lk:'#36805a', hl:'rgba(54,128,90,0.1)' },
        blue:     { n:'雾霾蓝',   g:'eye',   bg:'#e3e9f0', tx:'#1c2838', ti:'#0e1826', ac:'#4d6b8a', bd:'#c2cedc', cd:'#f0f4f8', hd:'rgba(227,233,240,0.72)', lk:'#4a72ad', hl:'rgba(74,114,173,0.12)' },
        lilac:    { n:'丁香紫',   g:'eye',   bg:'#edeaf3', tx:'#2e2b38', ti:'#1c1a26', ac:'#7e7691', bd:'#d7d2e0', cd:'#f6f4fa', hd:'rgba(237,234,243,0.72)', lk:'#6a5c92', hl:'rgba(106,92,146,0.12)' },
        gray:     { n:'暮色灰',   g:'dark',  bg:'#323438', tx:'#c2c5cd', ti:'#ced1d8', ac:'#a0a5b0', bd:'#4a4d55', cd:'#3d3f45', hd:'rgba(50,52,56,0.85)', lk:'#84aac2', hl:'rgba(132,170,194,0.15)' },
        dark:     { n:'午夜黑',   g:'dark',  bg:'#131313', tx:'#b3b7be', ti:'#c0c4ca', ac:'#8d929b', bd:'#2a2a2e', cd:'#1a1a1a', hd:'rgba(19,19,19,0.85)', lk:'#7895ad', hl:'rgba(120,149,173,0.15)' },
        darkBlue: { n:'深海蓝',   g:'dark',  bg:'#0e1118', tx:'#afb4bf', ti:'#bcc2cc', ac:'#8a909f', bd:'#282e3c', cd:'#161a24', hd:'rgba(14,17,24,0.85)', lk:'#7a9ebd', hl:'rgba(122,158,189,0.15)' }
    },
    THEME_GROUPS: [
        { k:'light', n:'浅色' },
        { k:'eye',   n:'护眼' },
        { k:'dark',  n:'暗色' }
    ]
};

let currentTheme = 'light';

// 图片屏蔽的作用域与排除项：CSS 隐藏/占位与 JS 打标共用同一份来源。
// 作用域只取正文（折叠与展开同结构）和评论区；头像、表情、评论贴纸都是 img 自身带类
// （不是后代），另兜底旧式 .Avatar 容器
const IMG_SCOPE = '.RichContent,.RichContent-inner,.Post-RichText,.AnswerCard,.QuestionRichText,.CommentItemV2,.CommentContent,.RichText';
const IMG_UI_PARTS = ['[class*="Avatar" i]', '[class*="Emoji" i]', '[class*="sticker" i]', '.Avatar img'];
const IMG_UI = IMG_UI_PARTS.map(s => `:not(${s})`).join('');
const IMG_UI_SEL = IMG_UI_PARTS.join(',');

// ==================== CSS 样式 ====================
const CSS = `
/* 主列宽屏 */
.Topstory-mainColumn,.Question-mainColumn,.SearchMain,.ContentLayout-mainColumn,.Profile-mainColumn,.CollectionsDetailPage-mainColumn{width:calc(100% - 40px)!important;max-width:1400px!important;margin:0 auto!important;float:none!important}
/* 隐藏侧边栏及广告区域 */
.Topstory-sideColumn,.Question-sideColumn,.ContentLayout-sideColumn,.Profile-sideColumn,.Search-sideColumn,.KanshanCornerButton,.CornerButton,.GlobalSideBar,[data-za-detail-view-path-module="RightSideBar"],.Card.QuestionHeaderTopicMeta,.Post-Row-Content-right,.Pc-Business-Card-PcTopFeedBanner,.WriteArea,.TopstoryItem-isRecommend:empty,.Search-container > div:not(.SearchMain){display:none!important}
/* 防止未隐藏宽元素导致水平滚动条 */
body{overflow-x:hidden!important}
/* 容器宽屏 */
.Topstory-container,.Question-main,.Search-container,.ContentLayout,.CollectionsDetailPage,.Post-Row-Content-left{width:100%!important;max-width:1400px!important;margin:0 auto!important}
.Post-Row-Content-left{max-width:1000px!important}
/* 回答项宽屏：保留底间距，避免相邻卡片压住下边框与阅读全文按钮 */
.List-item,.AnswerItem{width:100%!important;max-width:none!important;margin:0 0 10px!important;box-sizing:border-box!important}
/* 列表容器及头部对齐修复 */
.ListShortcut .List{width:100%!important;box-sizing:border-box!important}
.List-header{width:calc(100% - 40px)!important;margin:0 20px!important;box-sizing:border-box!important}
.List-headerOptions{margin-right:0!important;padding-right:0!important;right:auto!important;position:relative!important}
/* 问题页回答列表容器溢出修复 */
.ListShortcut .List>div{width:100%!important}
.ListShortcut .List>div>div[role="list"]{width:100%!important;max-width:none!important;padding:0!important;box-sizing:border-box!important}
/* 玻璃顶栏 */
.AppHeader{position:fixed!important;top:0!important;left:0!important;right:0!important;background:var(--h)!important;box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;border-bottom:1px solid var(--bd)!important;transition:transform 0.35s cubic-bezier(0.4,0,0.2,1)!important;z-index:1000!important}
html[data-theme="dark"] .AppHeader{box-shadow:0 1px 3px rgba(0,0,0,0.25)!important}
.AppHeader.header--hidden{transform:translate3d(0,-100%,0)!important}
/* 页面基础样式 */
body{padding-top:52px!important;background-color:var(--bg)!important;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.Post-content{margin-top:0!important}
/* 内容可读性优化 */
.RichContent-inner{color:var(--tx)!important;line-height:1.75!important}
div.CommentContent,.CommentItemV2 .UserLink-link{color:var(--tx)!important}
.CommentItemV2-meta{color:var(--ac)!important}
.RichContent-inner h1,.RichContent-inner h2,.RichContent-inner h3,.RichContent-inner h4{color:var(--ti)!important;line-height:1.5!important}
.RichContent-inner strong{color:var(--ti)!important}
.RichContent-inner a{color:var(--lk)!important;border-bottom:1px solid transparent!important;transition:border-color 0.2s ease!important}
.RichContent-inner a:hover{border-bottom-color:var(--lk)!important}
::selection{background:var(--hl)!important}
.Post-Title,.QuestionTitle{color:var(--ti)!important}
/* 卡片样式 */
.Card,.List-item,.AnswerItem,.ContentItem{background-color:var(--cd)!important;border-color:var(--bd)!important;transition:background-color 0.3s ease,border-color 0.3s ease!important}
/* 取消回答展开后赞同栏底部固定 */
.ContentItem-actions,[class*="ContentItem-actions"],.AnswerItem-toolbar{position:static!important;bottom:auto!important;z-index:auto!important}
/* 回答选中状态下边框修复 */
.AnswerItem.is-selected{border-bottom-width:2px!important;border-bottom-style:solid!important;border-bottom-color:var(--ac)!important}
/* 自定义发布时间 */
.custom-publish-time{font-size:13px;color:var(--ac)!important;margin-top:4px;margin-bottom:8px;padding:4px 0;border-bottom:1px solid var(--bd)!important;display:block;clear:both}
/* 文章标签 */
.article-tag{display:inline-block;margin-left:8px;padding:1px 6px;font-size:11px;font-weight:500;color:var(--lk)!important;background:var(--hl)!important;border-radius:3px;vertical-align:middle}
/* 主题切换器 */
.theme-switcher{position:fixed!important;right:20px!important;bottom:100px!important;z-index:9999!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important}
.theme-switcher-btn{width:48px!important;height:48px!important;border-radius:50%!important;background:var(--cd)!important;border:2px solid var(--bd)!important;box-shadow:0 4px 16px rgba(0,0,0,0.12)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important;color:var(--tx)!important}
.theme-switcher-btn:hover{transform:scale(1.08) rotate(15deg)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important}
.theme-switcher-btn:active{transform:scale(1.02)!important}
/* 菜单定宽定高模型：主题走 4 列色块网格，开关走紧凑单行，整块约 360px 高，
   不再随功能增加而线性变长（旧的逐行列表 7 主题 + 5 开关已有 682px） */
.theme-switcher-menu{position:absolute!important;right:0!important;bottom:58px!important;width:252px!important;background:var(--cd)!important;border:1px solid var(--bd)!important;border-radius:14px!important;padding:8px 0 6px!important;max-height:calc(100vh - 160px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;box-shadow:0 10px 30px rgba(0,0,0,0.15)!important;opacity:0!important;visibility:hidden!important;transform:translateY(10px) scale(0.95)!important;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important}
.theme-switcher-menu.show{opacity:1!important;visibility:visible!important;transform:translateY(0) scale(1)!important}
.theme-tabs{display:flex!important;gap:2px!important;margin:0 8px 6px!important;padding:2px!important;border-radius:9px!important;background:rgba(128,128,128,0.14)!important}
.theme-tab{flex:1!important;padding:5px 0!important;text-align:center!important;font-size:12px!important;border-radius:7px!important;cursor:pointer!important;color:var(--ac)!important;transition:background 0.15s ease,color 0.15s ease!important}
.theme-tab:hover{color:var(--tx)!important}
.theme-tab.active{background:var(--cd)!important;color:var(--lk)!important;font-weight:600!important;box-shadow:0 1px 3px rgba(0,0,0,0.12)!important}
.theme-grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:2px!important;padding:0 8px 4px!important}
.theme-grid:not(.show){display:none!important}
.theme-chip{display:flex!important;flex-direction:column!important;align-items:center!important;gap:5px!important;padding:7px 0 8px!important;border-radius:10px!important;cursor:pointer!important;font-size:11px!important;line-height:1!important;color:var(--tx)!important;transition:background 0.15s ease,color 0.15s ease!important}
.theme-chip:hover{background:rgba(0,0,0,0.05)!important}
.theme-chip.active{background:var(--hl)!important;color:var(--lk)!important;font-weight:600!important}
.theme-preview{width:26px!important;height:26px!important;border-radius:9px!important;border:2px solid rgba(0,0,0,0.08)!important;flex-shrink:0!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important}
.theme-chip:hover .theme-preview{transform:scale(1.1)!important}
.theme-chip.active .theme-preview{box-shadow:0 0 0 2px var(--lk)!important}
/* 菜单内分组与开关 */
.theme-group-title{font-size:11px!important;font-weight:600!important;letter-spacing:0.08em!important;color:var(--ac)!important;padding:6px 16px!important}
.theme-switcher-divider{height:1px!important;margin:7px 12px!important;background:var(--bd)!important}
.theme-toggle{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:7px 16px!important;cursor:pointer!important;font-size:13px!important;color:var(--tx)!important;transition:background 0.15s ease!important}
.theme-toggle:hover{background:rgba(0,0,0,0.04)!important}
.theme-toggle-switch{position:relative!important;width:30px!important;height:18px!important;border-radius:9px!important;background:var(--bd)!important;flex-shrink:0!important;transition:background 0.2s ease!important}
.theme-toggle-switch::after{content:''!important;position:absolute!important;top:2px!important;left:2px!important;width:14px!important;height:14px!important;border-radius:50%!important;background:var(--cd)!important;box-shadow:0 1px 3px rgba(0,0,0,0.2)!important;transition:transform 0.2s ease!important}
.theme-toggle[aria-checked="true"] .theme-toggle-switch{background:var(--lk)!important}
.theme-toggle[aria-checked="true"] .theme-toggle-switch::after{transform:translateX(12px)!important}
/* 回到顶部（与主题按钮同列同风格） */
.back-to-top{position:fixed!important;right:20px!important;bottom:160px!important;width:48px!important;height:48px!important;padding:0!important;border-radius:50%!important;background:var(--cd)!important;border:2px solid var(--bd)!important;box-shadow:0 4px 16px rgba(0,0,0,0.12)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:var(--tx)!important;z-index:9998!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(8px) scale(0.9)!important;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important}
.back-to-top.show{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:translateY(0) scale(1)!important}
.back-to-top:hover{transform:translateY(-2px) scale(1.08)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important;color:var(--lk)!important}
.back-to-top:active{transform:scale(0.96)!important}
.back-to-top svg{width:22px!important;height:22px!important;display:block!important;fill:currentColor!important}
/* 长列表渲染优化：离屏卡片跳过布局与绘制。只用于首页 feed（高度稳定），
   问题页回答高度从 500 到上万 px 不等，按估算高度跳过会让整页高度失真；
   :focus 时退出跳过，否则 paint containment 会裁掉选中光圈 */
.TopstoryItem{content-visibility:auto!important;contain-intrinsic-size:auto 200px!important}
.TopstoryItem:focus{content-visibility:visible!important}
/* 图片样式 */
.RichContent-inner img,.Post-RichText img,.AnswerCard img{max-width:70%!important;height:auto!important;border-radius:8px!important}
/* 大图查看器：站点那层留在 DOM 里当「打开」信号，我们只盖一层 UI。
   容器不吃指针事件，黑底点击与 Esc 都透给站点遮罩由它自己关闭；只有按钮接管点击，
   所以视觉和交互都只有一层，不存在双层状态同步 */
.zhihu-img-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;background:#111!important;display:none!important;align-items:center!important;justify-content:center!important;pointer-events:none!important}
.zhihu-img-overlay.show{display:flex!important}
.zhihu-img-stage{max-width:96vw!important;max-height:92vh!important;width:auto!important;height:auto!important;object-fit:contain!important;user-select:none!important;pointer-events:auto!important}
/* 左右翻页 + 关闭：主流 lightbox 的圆形半透明按钮 */
.zhihu-img-nav,.zhihu-img-close{position:absolute!important;z-index:1!important;pointer-events:auto!important;box-sizing:border-box!important;padding:0!important;border:1px solid rgba(255,255,255,0.22)!important;border-radius:50%!important;background-color:rgba(255,255,255,0.10)!important;cursor:pointer!important;transition:background-color .15s ease!important;background-repeat:no-repeat!important;background-position:center!important}
.zhihu-img-nav{top:50%!important;transform:translateY(-50%)!important;width:44px!important;height:44px!important;background-size:22px 22px!important}
.zhihu-img-nav.prev{left:24px!important}
.zhihu-img-nav.next{right:24px!important}
.zhihu-img-close{top:20px!important;right:20px!important;width:36px!important;height:36px!important;background-size:16px 16px!important}
.zhihu-img-nav:hover,.zhihu-img-close:hover{background-color:rgba(255,255,255,0.24)!important}
.zhihu-img-nav:focus-visible,.zhihu-img-close:focus-visible{outline:2px solid #fff!important;outline-offset:2px!important}
.zhihu-img-nav.prev{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 5l-7 7 7 7'/%3E%3C/svg%3E")!important}
.zhihu-img-nav.next{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 5l7 7-7 7'/%3E%3C/svg%3E")!important}
.zhihu-img-close{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 6l12 12M18 6L6 18'/%3E%3C/svg%3E")!important}
/* 页码常驻 */
.zhihu-img-counter{position:absolute!important;left:50%!important;bottom:24px!important;transform:translateX(-50%)!important;z-index:1!important;padding:5px 12px!important;border-radius:14px!important;background:rgba(0,0,0,0.62)!important;color:#fff!important;font-size:12px!important;line-height:1.4!important;letter-spacing:0.04em!important;pointer-events:none!important}
/* 屏蔽内容图片（可开关），折叠/展开/评论区共用，头像与表情由 IMG_UI 排除。
   占位画在 img 自身：img 是替换元素没有伪元素，但 content 能换掉内容，换成 1x1 透明图后
   background 就露出来。定宽胶囊 88x26：宽度不再跟原图走，多图时排成整齐一列，
   去掉斜纹与描边，只留淡底和一个 14px 线描图符。窄容器（评论区）由 max-width 兜底 */
html[data-hide-img] :is(${IMG_SCOPE}) img${IMG_UI}[data-zhihu-ph]{
    content:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E")!important;
    box-sizing:border-box!important;
    width:88px!important;
    max-width:100%!important;
    height:26px!important;
    aspect-ratio:auto!important;
    border-radius:6px!important;
    vertical-align:middle!important;
    background-color:rgba(128,128,128,0.08)!important;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b8b8b' stroke-width='1.6'%3E%3Crect x='3' y='5' width='18' height='14' rx='2.5'/%3E%3Ccircle cx='8.6' cy='10.2' r='1.4'/%3E%3Cpath d='M21 16.2l-5.2-5.2-6.1 6.1'/%3E%3C/svg%3E")!important;
    background-repeat:no-repeat!important;
    background-position:center!important;
    background-size:14px 14px!important
}
/* 折叠卡缩略图的外壳：知乎把封面图塞进 .RichContent-cover（原图尺寸 190x105，
   自带 ::after 2% 黑蒙层）。占位条只有 88x26，外壳却仍按原图尺寸撑开，
   于是变成「占位条 + 一大块灰底」两层。这里把外壳收到占位条尺寸并去掉蒙层。
   用 :has 限定只处理装占位图的外壳，视频封面等不受影响 */
html[data-hide-img] .RichContent-cover:has(img[data-zhihu-ph]){
    width:88px!important;
    height:26px!important;
    margin-right:12px!important;
    border-radius:6px!important
}
html[data-hide-img] .RichContent-cover:has(img[data-zhihu-ph])::after{display:none!important}
/* 内层与图片都带知乎原来的居中招数：inner 是 top:50% + translateY(-50%)，
   img 是 absolute + 四向 inset + translate(-50%,-50%)。只改 position 不改
   transform，translateY(-50%) 会照旧把 88x26 的胶囊往上提 13px，再被 cover 的
   overflow:hidden 裁掉一半，看起来就是「偏上 + 变形」。这里把两者的定位与
   transform 一起清掉，让占位条正好填满外壳 */
html[data-hide-img] .RichContent-cover-inner:has(img[data-zhihu-ph]){
    position:static!important;
    inset:auto!important;
    transform:none!important;
    width:100%!important;
    height:100%!important
}
html[data-hide-img] .RichContent-cover:has(img[data-zhihu-ph]) img[data-zhihu-ph]{
    position:static!important;
    inset:auto!important;
    transform:none!important;
    display:block!important;
    margin:0!important
}
/* 折叠卡缩略图保持知乎原来的左右布局（封面 float:left，摘要绕排）。封面按
   两行摘要的高度来做：摘要行高 25px 两行 50px，占位块给到 140x62，上下各留
   约 8px，视觉上正好把两行夹住，也不用再做垂直居中。
   操作栏 clear:both，避免比摘要高的封面把「赞同/评论」挤到右边 */
html[data-hide-img] .RichContent.is-collapsed .RichContent-cover:has(img[data-zhihu-ph]){
    width:140px!important;
    height:62px!important
}
html[data-hide-img] .RichContent.is-collapsed .RichContent-cover:has(img[data-zhihu-ph]) .RichContent-cover-inner img[data-zhihu-ph]{
    width:100%!important;
    height:100%!important;
    background-size:20px 20px!important
}
html[data-hide-img] .RichContent.is-collapsed:has(> .RichContent-cover img[data-zhihu-ph]) > .ContentItem-actions{
    clear:both!important
}
/* 评论区的图片壳子同理：占位条外面可能还包着一层按原图尺寸定宽定高、
   带淡底或蒙层的容器。只处理「直接子节点就是占位图」的壳子，
   把它收回内容尺寸并去掉底色/蒙层，避免评论里出现双层灰块 */
html[data-hide-img] :is(.CommentItemV2,.CommentContent) :is(a,figure,div):has(> img[data-zhihu-ph]){
    width:auto!important;
    height:auto!important;
    aspect-ratio:auto!important;
    padding:0!important;
    background:none!important;
    box-shadow:none!important
}
html[data-hide-img] :is(.CommentItemV2,.CommentContent) :has(> img[data-zhihu-ph])::before,
html[data-hide-img] :is(.CommentItemV2,.CommentContent) :has(> img[data-zhihu-ph])::after{display:none!important}
/* 首页文章卡屏蔽（可开关） */
html[data-zhihu-home][data-hide-article] [data-zhihu-article]{display:none!important}
/* 带货商品卡屏蔽（可开关）：知乎好物推荐/商业化组件，正常回答不会出现 */
html[data-hide-ecommerce] .RichText-Ecommerce,
html[data-hide-ecommerce] [class*="ecommerce-ad"]{display:none!important}
/* 整张卡就是一个商品块时连外壳一起隐藏——只藏内部块会留下卡片自带的
   border-bottom 与 padding，形成一根横线和一截空白，还会成为 j/k 的死步 */
html[data-hide-ecommerce] [data-zhihu-empty]{display:none!important}
/* 内容被剥空的外壳（广告已删、图已藏、空推荐位）：与开关无关，一律隐藏 */
[data-zhihu-blank]{display:none!important}
/* 问题页宽屏修复：清除 hash 容器宽度限制 */
.App-main{width:100%!important;max-width:none!important}
.QuestionPage{width:100%!important;max-width:1400px!important;margin:0 auto!important}
.QuestionPage>div:not(.AnswerFormPortalContainer){width:100%!important;max-width:100%!important}
.QuestionPage>div:not(.AnswerFormPortalContainer)>div:first-child{width:100%!important}
.Question-mainColumn{width:100%!important;max-width:none!important}
/* 精简导航（可开关）：知乎顶栏类名是 CSS-in-JS 哈希，改按 href 白名单保留
   关注 / 推荐 / 热榜 / 消息，其余入口（专栏、圈子、AI Works、故事、直答、私信、
   创作中心）与多余分隔块全部隐藏 */
html[data-hide-nav] .AppHeader nav > a:not([href$="/follow"]):not([href$="/hot"]):not([href$="zhihu.com/"]),
html[data-hide-nav] .AppHeader nav > :not(a),
html[data-hide-nav] .AppHeader a[href*="zhida.zhihu.com"],
html[data-hide-nav] .AppHeader [href$="/messages"],
html[data-hide-nav] .AppHeader a[href$="/creator"]:not(.AppHeader-profileMenu a){display:none!important}
/* 问题头宽屏 */
.QuestionHeader-content{width:100%!important;max-width:none!important;padding:16px 0!important}
.QuestionHeader-main{flex:1!important;min-width:0!important}
.QuestionHeader-title,.QuestionRichText{width:100%!important;max-width:none!important}
.QuestionHeader-footer{width:100%!important}
`;

const STORAGE_KEY = 'zhihu-theme';
// 功能开关配置：新增开关只加一条，菜单与状态持久化自动生效
const TOGGLES = [
    { label: '屏蔽所有图片', attr: 'data-hide-img', key: 'zhihu-hide-img', def: true, legacy: 'zhihu-hide-fold-img' },
    { label: '屏蔽首页文章', attr: 'data-hide-article', key: 'zhihu-hide-article', def: false },
    { label: '屏蔽商品卡', attr: 'data-hide-ecommerce', key: 'zhihu-hide-ecommerce', def: true },
    { label: '未展开也显示时间', attr: 'data-time-api', key: 'zhihu-time-api', def: true },
    { label: '精简导航栏', attr: 'data-hide-nav', key: 'zhihu-hide-nav', def: true },
    { label: '标题低调化', attr: 'data-hide-title', key: 'zhihu-hide-title', def: true }
];
const readToggle = t => {
    const v = localStorage.getItem(t.key);
    if (v !== null) return v === '1';
    // 旧开关（折叠回答图片）迁移：沿用用户原有偏好
    if (t.legacy) {
        const lv = localStorage.getItem(t.legacy);
        if (lv !== null) return lv === '1';
    }
    return t.def;
};

// ==================== 页面判定 ====================
// 「屏蔽首页文章」只在首页信息流生效，用 html 上的标记限定作用范围
const HOME_ATTR = 'data-zhihu-home';
const onHome = () => location.pathname === '/' || location.pathname === '';
const isQuestionPage = () => location.pathname.includes('/question/');

const syncHomeFlag = () => document.documentElement.toggleAttribute(HOME_ATTR, onHome());

// ==================== 工具函数 ====================
const timeCache = new Map();

const p2 = n => String(n).padStart(2, '0');

const formatTime = t => {
    if (!t) return '';
    const hit = timeCache.get(t);
    if (hit) return hit;
    const d = new Date(/^\d+$/.test(t) ? Number(t) * 1000 : t);
    const r = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    if (timeCache.size >= C.MAX_CACHE) timeCache.delete(timeCache.keys().next().value);
    timeCache.set(t, r);
    return r;
};

const throttle = (fn, delay) => {
    let last = 0, timer = null;
    return function(...args) {
        const now = Date.now();
        const remaining = delay - (now - last);
        if (remaining <= 0) {
            if (timer) { clearTimeout(timer); timer = null; }
            last = now;
            fn.apply(this, args);
        } else if (!timer) {
            timer = setTimeout(() => {
                last = Date.now();
                timer = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
};

// ==================== 主题切换 ====================
// 分组只切换可见性，不改变当前主题；选中主题时自动跳到它所在的分组
const showThemeGroup = (g, root = document) => {
    root.querySelectorAll('.theme-tab').forEach(el => el.classList.toggle('active', el.dataset.g === g));
    root.querySelectorAll('.theme-grid').forEach(el => el.classList.toggle('show', el.dataset.g === g));
};

const setTheme = k => {
    if (!C.THEMES[k]) return;
    currentTheme = k;
    const t = C.THEMES[k], r = document.documentElement;
    for (const key in t) {
        if (key === 'n' || key === 'g') continue;          // n=名称 g=分组，不是颜色变量
        r.style.setProperty(`--${key === 'hd' ? 'h' : key}`, t[key]);
    }
    t.g === 'dark' ? r.setAttribute('data-theme', 'dark') : r.removeAttribute('data-theme');
    localStorage.setItem(STORAGE_KEY, k);
    document.querySelectorAll('.theme-chip').forEach(i => i.classList.toggle('active', i.dataset.theme === k));
    showThemeGroup(t.g);
};

const createThemeMenu = () => {
    const container = document.createElement('div');
    container.className = 'theme-switcher';
    
    const btn = document.createElement('button');
    btn.className = 'theme-switcher-btn';
    btn.textContent = '🎨';
    btn.setAttribute('aria-label', '切换主题');
    
    const menu = document.createElement('div');
    menu.className = 'theme-switcher-menu';

    const groupTitle = text => {
        const el = document.createElement('div');
        el.className = 'theme-group-title';
        el.textContent = text;
        return el;
    };

    menu.appendChild(groupTitle('主题'));

    // 分组标签 + 每组一个网格，一次只显示一组
    const tabs = document.createElement('div');
    tabs.className = 'theme-tabs';
    C.THEME_GROUPS.forEach(g => {
        const tab = document.createElement('div');
        tab.className = 'theme-tab';
        tab.dataset.g = g.k;
        tab.textContent = g.n;
        tab.onclick = () => showThemeGroup(g.k, menu);
        tabs.appendChild(tab);
    });
    menu.appendChild(tabs);

    const grids = {};
    C.THEME_GROUPS.forEach(g => {
        const grid = document.createElement('div');
        grid.className = 'theme-grid';
        grid.dataset.g = g.k;
        grids[g.k] = grid;
        menu.appendChild(grid);
    });
    Object.keys(C.THEMES).forEach(k => {
        const t = C.THEMES[k];
        const chip = document.createElement('div');
        chip.className = `theme-chip ${k === currentTheme ? 'active' : ''}`;
        chip.dataset.theme = k;
        chip.title = t.n;
        chip.innerHTML = `<span class="theme-preview" style="background:${t.bg};border-color:${t.bd}"></span><span>${t.n}</span>`;
        chip.onclick = () => setTheme(k);
        grids[t.g].appendChild(chip);
    });
    // 此时菜单还没插进文档，只能在菜单内部查询
    showThemeGroup(C.THEMES[currentTheme].g, menu);

    // 功能开关分组
    const divider = document.createElement('div');
    divider.className = 'theme-switcher-divider';
    menu.appendChild(divider);
    menu.appendChild(groupTitle('功能'));

    TOGGLES.forEach(t => {
        const on = readToggle(t);
        const row = document.createElement('div');
        row.className = 'theme-toggle';
        row.dataset.toggle = t.key;
        row.setAttribute('role', 'switch');
        row.setAttribute('aria-checked', on ? 'true' : 'false');
        row.innerHTML = `<span>${t.label}</span><span class="theme-toggle-switch"></span>`;
        row.onclick = e => { e.stopPropagation(); setToggle(t, !readToggle(t)); };
        t.el = row;     // 记住行节点，切开关时不必再全文查询
        menu.appendChild(row);
    });

    container.appendChild(menu);
    container.appendChild(btn);
    document.body.appendChild(container);
    
    btn.onclick = () => menu.classList.toggle('show');
    document.addEventListener('click', e => { if (!container.contains(e.target)) menu.classList.remove('show'); });
};

// ==================== 功能开关 ====================
const setToggle = (t, on) => {
    localStorage.setItem(t.key, on ? '1' : '0');
    document.documentElement.toggleAttribute(t.attr, on);
    if (t.el) t.el.setAttribute('aria-checked', on ? 'true' : 'false');
    // 时间补全 / 图片屏蔽打开时，已渲染的卡片还没处理过，补一遍
    if (on && (t.attr === 'data-time-api' || t.attr === 'data-hide-img')) scanCards();
    // 标题开关：开→立刻整理当前标题，关→还原原标题
    if (t.attr === TITLE_ATTR) {
        if (on) tidyTitle();
        else if (rawTitle) document.title = rawTitle;
    }
};

const applyToggles = () => TOGGLES.forEach(t => document.documentElement.toggleAttribute(t.attr, readToggle(t)));

// ==================== 标签页标题低调化 ====================
// 去掉标题里的站点标识，首页换成中性词，标签页不再一眼看出是知乎。
// 知乎是 SPA，路由切换会重写 title，用 MutationObserver 跟着改；
// tidy 结果对自身幂等（处理过的标题不会再次变化），所以不会自激循环。
const TITLE_ATTR = 'data-hide-title', TITLE_NEUTRAL = '首页';
const TITLE_SUFFIX = /\s*[-_|]\s*知乎(?:专栏|圆桌|书店)?\s*$/;
const TITLE_PURE = /^知乎(?:\s*[-_|]\s*有问题，就会有答案)?$/;
// 「(9 封私信) 」这类未读提示属于知乎状态栏，与页面内容无关，一并摘掉
const TITLE_NOISE = /^[(（]\s*\d+\s*(?:封私信|条未读|条消息)\s*[)）]\s*/;
let rawTitle = '';

const tidyTitle = () => {
    if (!document.documentElement.hasAttribute(TITLE_ATTR)) return;
    const raw = document.title;
    // 页面还没给出标题（加载早期为空白）时不动，等它写入后观察器会再触发
    if (!raw) return;
    let t = raw.replace(TITLE_NOISE, '').replace(TITLE_SUFFIX, '').trim();
    if (!t || TITLE_PURE.test(t)) t = TITLE_NEUTRAL;
    if (t === raw) return;
    if (raw !== TITLE_NEUTRAL) rawTitle = raw;   // 记下原标题，关开关时还原
    document.title = t;
};

const initTitleTidy = () => {
    tidyTitle();
    if (!window.MutationObserver) return;
    // 观察 head 而不是 title 元素：脚本可能在 title 解析出来之前执行，
    // 站点也可能整个替换 title 节点，盯 head 两种情况都能覆盖
    let pending = false;
    const schedule = () => {
        if (pending) return;
        pending = true;
        setTimeout(() => { pending = false; tidyTitle(); }, 50);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.head || document.documentElement, { childList: true, subtree: true, characterData: true });
    observers.push(mo);     // 和其它观察器一起在 cleanup 里断开
};

// ==================== 滚动联动：顶栏隐藏 + 回到顶部 ====================
let backTopBtn = null;

const createBackToTop = () => {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', '回到顶部');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5 4.5 13l1.6 1.6L11 9.7V20h2V9.7l4.9 4.9 1.6-1.6z"/></svg>';
    btn.onclick = () => {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    };
    document.body.appendChild(btn);
    return btn;
};

const initScrollEffects = () => {
    const header = document.querySelector('.AppHeader');
    backTopBtn = createBackToTop();
    let lastY = window.scrollY, hidden = false, upDist = 0, shownTop = false;

    const update = throttle(() => {
        const cy = window.scrollY, delta = lastY - cy;

        // 回到顶部按钮：单向阈值，避免滚动中反复切换
        const shouldShowTop = cy > C.TOP_SHOW;
        if (shouldShowTop !== shownTop) { shownTop = shouldShowTop; backTopBtn.classList.toggle('show', shownTop); }

        if (!header) { lastY = cy; return; }
        // 向下滚动且超过阈值时隐藏顶栏
        if (cy > lastY && cy > C.HEADER_HIDE && !hidden) { header.classList.add('header--hidden'); hidden = true; upDist = 0; }
        // 向上滚动累计达到阈值时显示顶栏
        else if (delta > 0 && hidden) { upDist += delta; if (upDist >= C.HEADER_SHOW) { header.classList.remove('header--hidden'); hidden = false; upDist = 0; } }
        // 继续向下滚动时重置向上距离
        else if (delta <= 0 && hidden) upDist = 0;
        lastY = cy;
    }, C.THROTTLE);

    window.addEventListener('scroll', update, { passive: true });
    // 首屏可能已在下方（刷新后恢复位置）
    if (window.scrollY > C.TOP_SHOW) { shownTop = true; backTopBtn.classList.add('show'); }
};

// ==================== 大图查看器翻图 ====================
// 知乎点开正文图后是「全屏遮罩 + 一张 absolute 定位的大图（z-index 999）」，
// 自带缩放却没有上一张/下一张。这里只在查看器打开时接管 ←/→，
// 切同一回答内的正文图；页面上的方向键完全不碰，也不需要开关。
const IMG_MIN = 200;   // 正文图最小边长，用来滤掉头像、图标、表情
const CARD_SEL = '.AnswerItem,.ArticleItem,.Post-RichText,.TopstoryItem,.ContentItem';
const VIEWER_SCORE = 0.3;   // 查看器大图至少占视口 30% 宽高

// 查看器大图直接挂 body，只能按结构认：body 的直接子 img、z-index 高且占大半屏
const viewerImg = () => {
    for (const el of document.body.children) {
        if (el.tagName !== 'IMG' || Number(getComputedStyle(el).zIndex) < 100) continue;
        const r = el.getBoundingClientRect();
        if (r.width > innerWidth * VIEWER_SCORE && r.height > innerHeight * VIEWER_SCORE) return el;
    }
    return null;
};

// 知乎把原图地址放在 data-original 上（src 是缩略图或占位 svg）
const pickUrl = m => m.getAttribute('data-original') || m.currentSrc || m.src;

// 卡片内的正文图（文档序）。不做视口过滤：查看器里能看到整张图，
// 图在页面上是否被收起态裁切、是否滚到屏外都不影响翻图
const cardImages = card => [...card.querySelectorAll('img')].filter(m => {
    if (m.matches(IMG_UI_SEL) || m.closest('.Avatar,.RichContent-emoji,.RichText-emoji')) return false;
    if (getComputedStyle(m).display === 'none') return false;
    // 懒加载未完成的图 naturalWidth 为 0，退到知乎写在标签上的原图尺寸
    const w = Math.max(m.naturalWidth, Number(m.getAttribute('data-rawwidth')) || 0);
    const h = Math.max(m.naturalHeight, Number(m.getAttribute('data-rawheight')) || 0);
    return w >= IMG_MIN || h >= IMG_MIN;
});

// 当前查看器对应哪组图：点开某张图时记下它所在的卡片与序号
const viewerState = { list: [], idx: 0 };

const rememberViewerSource = e => {
    const m = e.target.closest?.('img');
    if (!m || !m.closest(IMG_SCOPE)) return;
    // 头像/表情/图标的查看器不属于正文图，不接管
    if (m.matches(IMG_UI_SEL)) return;
    const card = m.closest(CARD_SEL) || m.closest('.RichContent,.RichText,.Post-RichText') || document.body;
    const list = cardImages(card);
    const idx = list.indexOf(m);
    viewerState.idx = idx < 0 ? 0 : idx;
    viewerState.list = idx < 0 || list.length < 2 ? [] : list.map(pickUrl);
};

// 翻图不改站点的 img：它把打开时那张图的尺寸写死在内联样式里，换 src 会被拉变形。
// 我们只盖一层 UI；站点那层留着当「查看器是否打开」的信号，容器不吃指针事件，
// 黑底点击与 Esc 都透给它自己关闭，MutationObserver 再收掉我们的层
let overlayEl = null, stageEl = null, counterEl = null;

const ensureOverlay = () => {
    if (overlayEl?.isConnected) return;
    overlayEl = document.createElement('div');
    overlayEl.className = 'zhihu-img-overlay';
    overlayEl.innerHTML =
        '<img class="zhihu-img-stage" alt="">' +
        '<button class="zhihu-img-nav prev" type="button" aria-label="上一张"></button>' +
        '<button class="zhihu-img-nav next" type="button" aria-label="下一张"></button>' +
        '<button class="zhihu-img-close" type="button" aria-label="关闭"></button>' +
        '<div class="zhihu-img-counter"></div>';
    document.body.appendChild(overlayEl);
    stageEl = overlayEl.querySelector('.zhihu-img-stage');
    counterEl = overlayEl.querySelector('.zhihu-img-counter');
    // 只有按钮接管点击；图片与黑底都不拦，交给站点遮罩
    overlayEl.addEventListener('click', e => {
        const btn = e.target.closest?.('button');
        if (!btn) return;
        if (btn.classList.contains('prev')) navViewer(-1);
        else if (btn.classList.contains('next')) navViewer(1);
        else closeViewer();
    });
};

const showCounter = () => {
    counterEl.textContent = `${viewerState.idx + 1} / ${viewerState.list.length}`;
};

const showOverlay = url => {
    ensureOverlay();
    stageEl.src = url;
    overlayEl.classList.add('show');
    showCounter();
};

const hideOverlay = () => overlayEl?.classList.remove('show');

// X / 窗口失焦时主动收层，并补一次站点关闭事件（正常路径下黑底点击与 Esc 会自己穿透过去）
const closeViewer = () => {
    if (!overlayEl?.classList.contains('show')) return;
    hideOverlay();
    for (const el of document.body.children) {
        if (el === overlayEl || el.tagName === 'IMG') continue;
        const cs = getComputedStyle(el);
        if (Number(cs.zIndex) < 100) continue;
        const r = el.getBoundingClientRect();
        if (r.width < innerWidth * 0.8 || r.height < innerHeight * 0.8) continue;
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        break;
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
};

const onWindowBlur = () => closeViewer();

const navViewer = dir => {
    const v = viewerImg();
    const n = viewerState.list.length;
    if (!v || n < 2) return false;
    viewerState.idx = (viewerState.idx + dir + n) % n;
    showOverlay(viewerState.list[viewerState.idx]);
    return true;
};

const initImageKeys = () => {
    document.addEventListener('click', rememberViewerSource, true);
    document.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.target.closest?.('input,textarea,[contenteditable="true"]')) return;
        if (navViewer(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
    }, true);
    // 站点查看器一关（Esc / 点遮罩），叠在上面的 UI 也跟着收掉
    const mo = new MutationObserver(() => { if (!viewerImg()) hideOverlay(); });
    mo.observe(document.body, { childList: true });
    observers.push(mo);
    window.addEventListener('blur', onWindowBlur);
    // 调试钩子：localStorage 里 zhihu-debug=1 才暴露
    if (localStorage.getItem('zhihu-debug') === '1') window.__zhihuViewer = { viewerState, viewerImg, navViewer, cardImages };
};

// ==================== 发布时间 ====================
// 知乎收起回答时会把 .ContentItem-time 整个移除，折叠态 DOM 里再无任何时间文本。
// 因此：展开态照旧读 DOM（零请求）；读不到时按 item 的 name 属性（回答 id）
// 走 /api/v4/answers/{id} 补一次，结果按 id 缓存并持久化，之后不再请求。
const TIME_KEY = 'zhihu-time-cache';
const TIME_KEEP = 800;          // 本地缓存上限，超出丢最早的
const TIME_CONCURRENCY = 2;

const timeStore = new Map();     // `answer:${id}` -> { c: 发布秒, u: 更新秒 }
const timePending = new Set();   // 已在队列/请求中
const timeDead = new Set();      // 接口明确失败，本次页面生命周期内不再重试
const timeQueue = [];
const timeWatched = new WeakSet();

let timeActive = 0, timeSaveTimer = 0, timeIO = null;

// 秒或时间字符串统一成秒；拿不到返回 0
const toSec = t => {
    if (!t) return 0;
    if (typeof t === 'number') return t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
    if (/^\d+$/.test(t)) return Math.floor(Number(t));
    const d = new Date(t.replace(/-/g, '/'));
    return isNaN(d) ? 0 : Math.floor(d.getTime() / 1000);
};

try {
    const saved = JSON.parse(localStorage.getItem(TIME_KEY) || '{}');
    for (const k in saved) {
        const v = saved[k];
        if (Array.isArray(v) && v[0]) timeStore.set(k, { c: v[0], u: v[1] || 0 });
    }
} catch {}

const saveTimeCache = () => {
    if (timeSaveTimer) return;
    timeSaveTimer = setTimeout(() => {
        timeSaveTimer = 0;
        const out = {};
        for (const [k, v] of [...timeStore].slice(-TIME_KEEP)) out[k] = [v.c, v.u];
        try { localStorage.setItem(TIME_KEY, JSON.stringify(out)); } catch {}
    }, 2000);
};

// 回答卡上的 name 属性就是回答 id，折叠态也在
const answerId = item => {
    const id = item.getAttribute('name');
    return id && /^\d+$/.test(id) ? id : null;
};

// 渲染态的真实文案；展开态 DOM 才有
const renderTime = (item, c, u) => {
    let str = '';
    if (c) str = `发布于 ${formatTime(c)}`;
    if (u && (!c || u - c > 60)) str += `${c ? ' · ' : ''}编辑于 ${formatTime(u)}`;
    if (!str) return;
    let div = item.querySelector('.custom-publish-time');
    if (!div) {
        div = document.createElement('div');
        div.className = 'custom-publish-time';
        item.prepend(div);
    }
    if (div.textContent !== str) div.textContent = str;
};

// 展开态直接从 DOM 取，取到就进缓存，收起后可以照着重绘
const readDomTime = item => {
    const link = item.querySelector(C.S.time + ' a');
    if (!link) return null;
    const tip = link.getAttribute('data-tooltip') || link.getAttribute('aria-label') || '';
    const c = toSec((tip.match(/发布于(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/) || [])[1]);
    const u = toSec((link.textContent.match(/编辑于(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/) || [])[1]);
    return c || u ? { c, u } : null;
};

const paintTimeById = id => {
    document.querySelectorAll(`[name="${id}"]`).forEach(el => processTimeInfo(el));
};

const pumpTimeQueue = () => {
    while (timeActive < TIME_CONCURRENCY && timeQueue.length) {
        const job = timeQueue.shift();
        timeActive++;
        fetch(`/api/v4/answers/${job.id}?include=created_time,updated_time`, {
            headers: { 'x-requested-with': 'fetch' }, credentials: 'include'
        })
            .then(r => (r.ok ? r.json() : null))
            .then(j => {
                const c = j && toSec(j.created_time);
                if (!c) { timeDead.add(job.key); return; }
                timeStore.set(job.key, { c, u: toSec(j.updated_time) });
                saveTimeCache();
                paintTimeById(job.id);
            })
            .catch(() => timeDead.add(job.key))
            .finally(() => { timeActive--; timePending.delete(job.key); pumpTimeQueue(); });
    }
};

const requestTime = id => {
    const key = 'answer:' + id;
    if (timeStore.has(key) || timePending.has(key) || timeDead.has(key)) return;
    timePending.add(key);
    timeQueue.push({ id, key });
    pumpTimeQueue();
};

// 只有快进入视口的卡片才发请求，避免一次性为上百张卡刷接口
const onTimeIntersect = entries => {
    for (const en of entries) {
        if (!en.isIntersecting) continue;
        timeIO.unobserve(en.target);
        const id = answerId(en.target);
        if (id) requestTime(id);
    }
};

const probeTime = item => {
    if (!document.documentElement.hasAttribute('data-time-api')) return;
    if (timeWatched.has(item)) return;
    const id = answerId(item);
    if (!id) return;
    timeWatched.add(item);
    if (!('IntersectionObserver' in window)) return requestTime(id);
    if (!timeIO) timeIO = new IntersectionObserver(onTimeIntersect, { rootMargin: '600px 0px' });
    timeIO.observe(item);
};

const processTimeInfo = item => {
    // 问题详情页 .List-item 包着 .AnswerItem，只在最内层处理
    if (item.classList.contains('List-item') && item.querySelector('.AnswerItem')) return;

    const dom = readDomTime(item);
    const id = answerId(item);
    if (dom) {
        if (id) { timeStore.set('answer:' + id, dom); saveTimeCache(); }
        renderTime(item, dom.c, dom.u);
        return;
    }
    const hit = id && timeStore.get('answer:' + id);
    if (hit) return renderTime(item, hit.c, hit.u);
    probeTime(item);
};

// 调试钩子：localStorage 里 zhihu-debug=1 才暴露。后台标签页 IO 不回调，
// 靠它手动驱动补全链路（正常浏览下不会存在）
if (localStorage.getItem('zhihu-debug') === '1') window.__zhihuTime = { requestTime, paintTimeById, timeStore, processTimeInfo };

// ==================== 文章标签 ====================
const addArticleTag = item => {
    if (!item.classList.contains('ArticleItem')) return;
    const title = item.querySelector('.ContentItem-title, .Post-Title');
    if (!title || title.querySelector('.article-tag')) return;
    const tag = document.createElement('span');
    tag.className = 'article-tag';
    tag.textContent = '文章';
    title.appendChild(tag);
};

// ==================== 收起回答 ====================
const collapseItem = item => {
    const btn = item.querySelector('.ContentItem-rightButton');
    if (!btn) return;
    const text = btn.querySelector('.RichContent-collapsedText');
    if (text && text.textContent.includes('收起')) btn.click();
};

const collapseAnswers = () => {
    // 收起会让知乎删掉时间节点，先把展开态读到的时间存进缓存，收起后照着重绘
    scanCards();
    document.querySelectorAll('.AnswerItem').forEach(collapseItem);
    setTimeout(() => scanCards(), 600);
};

// ==================== 卡片管线 ====================
// 首页/问题页的卡片判定都走 scanCards：外壳（带 border）判商品/空壳/文章，
// 内容项（带时间）判发布时间/文章标签。新增节点与全量维护共用同一条路径。
const SHELL_SEL = '.TopstoryItem, .List-item';
const ITEM_SEL = '.AnswerItem, .List-item, .ArticleItem, .SearchResultItem';
const SCAN_SEL = SHELL_SEL + ', .AnswerItem, .ArticleItem, .SearchResultItem';

// 卡片外壳自带 border-bottom，只藏内部内容会留下一根横线加一截空白。
// 两类外壳都要整卡隐藏：
//   data-zhihu-empty 整卡就是一个商品块（受「屏蔽商品卡」开关控制）
//   data-zhihu-blank 内容被剥空（广告已删、图片已藏、空推荐位），无论开关都该消失
const ECOMMERCE = '.RichText-Ecommerce, [class*="ecommerce-ad"]';
const ARTICLE_ATTR = 'data-zhihu-article';
const EMPTY_ATTR = 'data-zhihu-empty';
const BLANK_ATTR = 'data-zhihu-blank';
const EMPTY_KEEP = 40;          // 去掉商品块后剩余正文字符数下限
const BLANK_KEEP = 8;           // 少于这么多字且无正文结构，判定为外壳
const CARD_CONTENT = '.RichContent-inner,.RichContent,.ContentItem-title,.Post-Title,.AuthorInfo,img,video,iframe,.RichText';
// 骨架屏/占位卡片此刻没内容，但内容在路上；隐藏后不会再进入视口触发加载，不能藏
const CARD_SKELETON = '[class*="Skeleton"],[class*="Placeholder"],[class*="Loading"]';

const setFlag = (el, attr, on) => {
    if (on === el.hasAttribute(attr)) return;
    on ? el.setAttribute(attr, '1') : el.removeAttribute(attr);
};

const markCommerce = card => {
    const ecom = card.querySelectorAll(ECOMMERCE);

    // 有商品块：块内文本占绝大多数、块外只剩几个字，才算整卡商品卡。
    // 用比例而不是绝对字数，避免正文偏短的回答被误杀
    if (ecom.length) {
        let ecomLen = 0;
        for (const el of ecom) ecomLen += el.textContent.length;
        const rest = card.textContent.length - ecomLen;
        setFlag(card, EMPTY_ATTR, rest < EMPTY_KEEP && rest * 2 < ecomLen);
        return setFlag(card, BLANK_ATTR, false);
    }

    // 内容是否还在：正文结构、图片视频，或者一小段文字（"还有 N 个动态被收起"这类
    // 功能性卡片只有文字，不能当空壳）。有正文结构时不做 textContent 统计
    const blank = !card.querySelector(CARD_CONTENT) && !card.querySelector(CARD_SKELETON)
        && card.textContent.trim().length < BLANK_KEEP;
    setFlag(card, BLANK_ATTR, blank);
};

// 外壳判定：商品/空壳 → 文章卡
const markShell = card => {
    markCommerce(card);
    // 文章卡只打标供 CSS 屏蔽
    if (card.matches('.ArticleItem') || card.querySelector('.ArticleItem')) {
        return card.setAttribute(ARTICLE_ATTR, '1');
    }
};

// 内容项判定：时间 + 文章标签。问题页 .List-item 包着 .AnswerItem，只在最内层做
const markItem = item => {
    if (item.classList.contains('List-item') && item.querySelector('.AnswerItem')) return;
    processTimeInfo(item);
    addArticleTag(item);
};

// ==================== 图片占位 ====================
// 记下原图宽高：方向键切图靠它做尺寸过滤（占位态 naturalWidth 是那张 1x1 替换图的尺寸，
// 不可用）。占位条本身定宽，不再读原图宽度，所以扫描当场就能判定，不必等图下载完。
// 尺寸优先取知乎写在标签上的 data-rawwidth/rawheight，其次 width 属性，最后 naturalWidth；
// 全都拿不到时挂一次性 load 兜底（自终止，不会循环）。开关关闭时整段跳过
const PH_ATTR = 'data-zhihu-ph';
const PH_MIN = 60;      // 小于这个边长的多半是追踪像素/装饰小图，不参与屏蔽

const markImg = img => {
    if (img.hasAttribute(PH_ATTR) || img.matches(IMG_UI_SEL)) return;
    const w = Number(img.getAttribute('data-rawwidth')) || Number(img.getAttribute('width')) || img.naturalWidth;
    const h = Number(img.getAttribute('data-rawheight')) || Number(img.getAttribute('height')) || img.naturalHeight;
    if (!w || !h) { img.addEventListener('load', () => markImg(img), { once: true }); return; }
    if (w < PH_MIN || h < PH_MIN) return;
    img.setAttribute('data-ph-w', w);
    img.setAttribute('data-ph-h', h);
    img.setAttribute(PH_ATTR, '1');
};

const markImages = root => {
    if (!document.documentElement.hasAttribute('data-hide-img')) return;
    if (root.matches?.('img')) markImg(root);
    for (const img of root.querySelectorAll?.('img') || []) markImg(img);
};

const scanNode = node => {
    if (node.matches(SHELL_SEL)) markShell(node);
    if (node.matches(ITEM_SEL)) markItem(node);
};

const scanCards = (root = document) => {
    if (root.nodeType === 1) scanNode(root);
    for (const node of root.querySelectorAll(SCAN_SEL)) scanNode(node);
    // 图片放在遍历之后统一处理：卡片是嵌套的（.List-item 包着 .AnswerItem），
    // 逐个 scanNode 会把同一棵子树里的 img 扫两遍
    markImages(root);
};

// 广告与空推荐位直接删节点（display:none 会留下卡片外壳，站点导航也仍会走到它）
// 推荐位只在没有文字时才删：有文字的推荐卡是正常内容
const RECOMMEND = '.TopstoryItem-isRecommend';
const isAd = el => el.matches(C.S.ads) || (el.matches(RECOMMEND) && !el.textContent.trim());

const removeAds = (root = document) => {
    if (root.nodeType === 1 && isAd(root)) return root.remove();
    for (const el of root.querySelectorAll(`${C.S.ads}, ${RECOMMEND}`)) {
        if (isAd(el)) el.remove();
    }
};

// ==================== 节点处理 ====================
// 观察器回调只做入队：DOM 读写合并到下一轮，每轮限量处理，避免一次性长任务。
// 用定时器而非 rAF——后台标签页 rAF 不触发，处理会一直挂起
let pendingNodes = new Set(), flushHandle = 0;

const scheduleFlush = () => { flushHandle = setTimeout(flushNodes, 16); };

// 取出本帧要处理的节点；父子同批时只保留最外层，避免同一子树被反复扫描
const takeBatch = () => {
    const batch = [];
    for (const n of pendingNodes) {
        if (batch.length >= C.MAX_BATCH) break;
        pendingNodes.delete(n);
        if (n.isConnected) batch.push(n);
    }
    if (batch.length < 2) return batch;
    const set = new Set(batch);
    return batch.filter(n => {
        for (let p = n.parentElement; p; p = p.parentElement) if (set.has(p)) return false;
        return true;
    });
};

const flushNodes = () => {
    flushHandle = 0;
    const nodes = takeBatch();
    if (!nodes.length) return;

    for (const n of nodes) {
        if (!n.isConnected) continue;
        removeAds(n);
        if (!n.isConnected) continue;
        scanCards(n);
        // 内容插进已有卡片（懒加载、骨架屏补内容）时也要重新判定，避免外壳被判空后
        // 一直隐藏：从新增节点往上找最近的卡片
        const owner = n.parentElement?.closest(SCAN_SEL);
        if (owner) scanCards(owner);
    }

    // 还有积压就留到下一轮，保持单次工作量可控
    if (pendingNodes.size && !flushHandle) scheduleFlush();
};

const enqueueNodes = mutations => {
    for (const m of mutations) {
        for (const n of m.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) pendingNodes.add(n);
    }
    if (!flushHandle) scheduleFlush();
};

// 空闲时段执行全量维护，避免与知乎自身的首屏渲染抢主线程
const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 0));

const maintain = () => idle(() => {
    removeAds();
    scanCards();
});

// ==================== 观察者 ====================
let observers = [], _pushState, _replaceState;

const createObservers = () => {
    let urlTimeout;
    _pushState = history.pushState;
    _replaceState = history.replaceState;
    
    const onUrlChange = () => {
        clearTimeout(urlTimeout);
        syncHomeFlag();
        urlTimeout = setTimeout(() => { 
            maintain();
            if (isQuestionPage()) setTimeout(collapseAnswers, C.SCROLL_DELAY);
        }, C.URL_DELAY);
    };
    
    history.pushState = (...args) => { _pushState.apply(history, args); onUrlChange(); };
    history.replaceState = (...args) => { _replaceState.apply(history, args); onUrlChange(); };
    window.addEventListener('popstate', onUrlChange);
    
    // 挂在 document.body，不挂主列：首屏主列是 SSR 出来的节点，React 水合会整段替换，
    // 观察器留在被丢弃的旧节点上就再也不会回调（新卡片完全不被处理）
    const contentObserver = new MutationObserver(enqueueNodes);
    contentObserver.observe(document.body, { childList: true, subtree: true });
    observers.push(contentObserver);
};

// ==================== 清理 ====================
const cleanup = () => {
    observers.forEach(o => o.disconnect());
    observers = [];
    if (flushHandle) { clearTimeout(flushHandle); flushHandle = 0; }
    pendingNodes.clear();
    if (timeIO) { timeIO.disconnect(); timeIO = null; }
    if (timeSaveTimer) { clearTimeout(timeSaveTimer); timeSaveTimer = 0; }
    timeQueue.length = 0;
    timeStore.clear();
    timeCache.clear();
    document.querySelector('.theme-switcher')?.remove();
    backTopBtn?.remove();
    backTopBtn = null;
    overlayEl?.remove();
    overlayEl = null;
    stageEl = null;
    counterEl = null;
    window.removeEventListener('blur', onWindowBlur);
    if (_pushState) history.pushState = _pushState;
    if (_replaceState) history.replaceState = _replaceState;
};

// ==================== 初始化 ====================
const init = () => {
    // 注入 CSS 样式
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    
    // 还原主题；无记录时也走一遍 setTheme，确保 CSS 变量就位
    const saved = localStorage.getItem(STORAGE_KEY);
    setTheme(C.THEMES[saved] ? saved : 'light');

    // 功能开关（含屏蔽所有图片）
    syncHomeFlag();
    applyToggles();
    // 首屏图片先记下宽高比，避免占位块在扫描前被当成正方形
    markImages(document);
    // 标题低调化（含路由切换后的重写监听）
    initTitleTidy();

    // 创建主题菜单与滚动联动（顶栏隐藏 + 回到顶部）
    createThemeMenu();
    initScrollEffects();
    initImageKeys();

    // 页面加载完成后再扫一遍，补上首屏之后才渲染的卡片
    window.addEventListener('load', () => scanCards());

    // 延迟处理页面内容（等待知乎数据加载）
    setTimeout(() => {
        maintain();
        // 问题详情页自动收起回答
        if (isQuestionPage()) setTimeout(collapseAnswers, C.SCROLL_DELAY);
    }, onHome() ? C.HOME_DELAY : C.INIT_DELAY);
    
    // 创建各种观察者
    createObservers();
};


// 页面卸载时清理资源（进入 bfcache 时不清理，便于返回后继续生效）
window.addEventListener('pagehide', e => { if (!e.persisted) cleanup(); });
// DOM 就绪后初始化
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();