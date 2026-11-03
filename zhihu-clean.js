// ==UserScript==
// @name         知乎净化
// @namespace    https://github.com/wsyqn6/userscripts
// @version      3.0
// @description  宽屏布局与玻璃顶栏、7 种护眼主题、广告与商品卡屏蔽、导航精简、回到顶部、方向键切图、未展开显示回答时间、长列表性能优化
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
/* 长列表渲染优化：离屏卡片跳过布局与绘制，长期浏览后仍保持滚动流畅
   只用于首页 feed 卡片——高度稳定（实测中位 144px），估算误差小；
   问题页回答高度从 500 到上万 px 不等，按估算高度跳过会让整页高度失真 */
.TopstoryItem{content-visibility:auto!important;contain-intrinsic-size:auto 200px!important}
/* content-visibility 自带 paint containment，会裁掉卡片溢出的选中光圈；
   当前键盘选中的卡片退出 content-visibility，只影响一张卡，无性能代价 */
.TopstoryItem:focus{content-visibility:visible!important}
/* 图片样式 */
.RichContent-inner img,.Post-RichText img,.AnswerCard img{max-width:70%!important;height:auto!important;border-radius:8px!important}
/* 方向键切图的高亮：内描边不会像 outline 那样被 content-visibility 的 paint containment 裁掉 */
.zhihu-img-focus{box-shadow:inset 0 0 0 3px var(--lk)!important;border-radius:8px!important}
/* 首页折叠回答内图片隐藏（展开后自动恢复，可开关） */
html[data-zhihu-home][data-hide-fold-img] .RichContent.is-collapsed img,
html[data-zhihu-home][data-hide-fold-img] .RichContent-inner.is-collapsed img,
html[data-zhihu-home][data-hide-fold-img] .ContentItem.is-collapsed img,
html[data-zhihu-home][data-hide-fold-img] [data-zhihu-folded] .RichContent img,
html[data-zhihu-home][data-hide-fold-img] [data-zhihu-folded] .RichContent figure,
html[data-zhihu-home][data-hide-fold-img] [data-zhihu-folded] .RichContent .RichText-figure,
html[data-zhihu-home][data-hide-fold-img] [data-zhihu-folded] .RichContent .RichText-figure-wrapper{display:none!important}
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
    { label: '折叠回答图片', attr: 'data-hide-fold-img', key: 'zhihu-hide-fold-img', def: true },
    { label: '屏蔽首页文章', attr: 'data-hide-article', key: 'zhihu-hide-article', def: false },
    { label: '屏蔽商品卡', attr: 'data-hide-ecommerce', key: 'zhihu-hide-ecommerce', def: true },
    { label: '方向键切图', attr: 'data-key-img', key: 'zhihu-key-img', def: true },
    { label: '未展开也显示时间', attr: 'data-time-api', key: 'zhihu-time-api', def: true },
    { label: '精简导航栏', attr: 'data-hide-nav', key: 'zhihu-hide-nav', def: true }
];
const readToggle = t => { const v = localStorage.getItem(t.key); return v === null ? t.def : v === '1'; };

// ==================== 工具函数 ====================
const timeCache = new Map();

const formatTime = t => {
    if (!t) return '';
    if (timeCache.has(t)) return timeCache.get(t);
    const d = new Date(/^\d+$/.test(t) ? parseInt(t) * 1000 : t);
    const r = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (timeCache.size >= C.MAX_CACHE) {
        const oldest = timeCache.keys().next().value;
        timeCache.delete(oldest);
    }
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
    const row = document.querySelector(`.theme-toggle[data-toggle="${t.key}"]`);
    if (row) row.setAttribute('aria-checked', on ? 'true' : 'false');
    // 时间补全开关打开时，已渲染的卡片还没发起过探测，补一遍
    if (t.attr === 'data-time-api' && on) scanCards();
};

const applyToggles = () => TOGGLES.forEach(t => document.documentElement.toggleAttribute(t.attr, readToggle(t)));

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

// ==================== 方向键切图 ====================
// ←/→ 在「当前回答」内逐张跳图：不实现查看器，只做定位 + 内描边高亮
const IMG_MIN = 200;   // 正文图最小边长，用来滤掉头像、图标、表情
const IMG_HL = 'zhihu-img-focus';
const CARD_SEL = '.AnswerItem,.ArticleItem,.Post-RichText,.TopstoryItem,.ContentItem';

let imgHlTimer = 0;

// 卡片内可跳转的正文图（文档序）：排除头像/图标、被脚本隐藏的折叠图，
// 以及折叠回答裁切容器里的图（滚过去也看不见，只会滚内部容器）
const cardImages = card => [...card.querySelectorAll('img')].filter(m => {
    if (m.closest('.Avatar,.RichContent-emoji,.RichText-emoji')) return false;
    if (getComputedStyle(m).display === 'none') return false;
    if (m.naturalWidth < IMG_MIN && m.getBoundingClientRect().width < IMG_MIN) return false;
    for (let n = m.parentElement; n && n !== card; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if ((cs.overflowY === 'hidden' || cs.overflowY === 'auto') && n.scrollHeight > n.clientHeight + 8) return false;
    }
    return true;
});

// 当前回答：键盘选中优先（j/k 会真实 focus 卡片），否则取视口中线命中的卡片
const currentCard = () => {
    const focused = document.activeElement?.closest?.(CARD_SEL);
    if (focused) return focused;
    for (const el of document.elementsFromPoint(innerWidth / 2, innerHeight / 2)) {
        const card = el.closest?.(CARD_SEL);
        if (card) return card;
    }
    return null;
};

// 全屏浮层（评论弹窗、图片查看器）打开时，方向键交回页面处理
const overlayOpen = () => {
    for (const el of document.body.children) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' && cs.pointerEvents !== 'none' && el.getBoundingClientRect().height > innerHeight * 0.5) return true;
    }
    return false;
};

const jumpImage = dir => {
    const card = currentCard();
    if (!card) return false;
    const imgs = cardImages(card);
    if (imgs.length < 2) return false;

    // 无状态定位：离视口中心最近的一张即「当前图」，手动滚动后也能接着走。
    // 用视口坐标而不是文档坐标——滚动可能发生在内部容器上，scrollY 并不可靠
    const mid = innerHeight / 2;
    let cur = 0, best = Infinity;
    imgs.forEach((m, i) => {
        const r = m.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < best) { best = d; cur = i; }
    });

    const next = imgs[cur + dir];
    if (!next) return false;

    // 卡片处于 content-visibility 跳过态时 rect 是估算值，先让它真实渲染再定位
    const revealed = [];
    for (let n = next.parentElement; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).contentVisibility !== 'auto') continue;
        n.style.setProperty('content-visibility', 'visible', 'important');
        revealed.push(n);
    }
    if (revealed.length) next.getBoundingClientRect();   // 强制布局，拿到真实坐标

    next.scrollIntoView({ block: 'center' });
    if (revealed.length) setTimeout(() => revealed.forEach(n => n.style.removeProperty('content-visibility')), 600);
    clearTimeout(imgHlTimer);
    document.querySelectorAll('.' + IMG_HL).forEach(el => el.classList.remove(IMG_HL));
    next.classList.add(IMG_HL);
    imgHlTimer = setTimeout(() => next.classList.remove(IMG_HL), 1200);
    return true;
};

const initImageKeys = () => {
    document.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (!document.documentElement.hasAttribute('data-key-img')) return;
        // 输入框、视频与轮播组件内的方向键保持站点原生行为
        if (e.target.closest?.('input,textarea,[contenteditable="true"],video,[class*="Video"],[class*="ZVideo"]')) return;
        if (overlayOpen()) return;
        if (jumpImage(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
    }, true);
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

// ==================== 首页折叠回答图片屏蔽 ====================
const HOME_ATTR = 'data-zhihu-home';
const FOLDED_ATTR = 'data-zhihu-folded';
const SHELL_SEL = '.TopstoryItem, .List-item';

const syncHomeFlag = () => {
    const r = document.documentElement;
    if (location.pathname === '/') r.setAttribute(HOME_ATTR, '1');
    else r.removeAttribute(HOME_ATTR);
};

const hasReadMore = item => {
    for (const el of item.querySelectorAll('.ContentItem-more, .RichContent-collapsedText')) {
        if (el.textContent.includes('阅读全文')) return true;
    }
    return false;
};

// 折叠判定：类名优先短路，再查"阅读全文"文案（每张卡最多各一次查询）
const isFolded = item =>
    item.querySelector('.RichContent.is-collapsed,.RichContent-inner.is-collapsed,.ContentItem.is-collapsed') ? true : hasReadMore(item);

// 几何兜底：正文被容器裁切即为折叠。读布局会强制重排，只在卡片可见时调用
const isClipped = item => {
    const inner = item.querySelector('.RichContent-inner, .RichContent');
    if (!inner) return false;
    return getComputedStyle(inner).overflowY !== 'visible' && inner.scrollHeight > inner.clientHeight + 8;
};

const applyFold = (item, geometry) => {
    let folded;
    if (isFolded(item)) folded = true;
    else if (geometry) folded = isClipped(item);
    else folded = item.hasAttribute(FOLDED_ATTR); // 几何未知时保持现状，避免误判闪烁
    if (folded) item.setAttribute(FOLDED_ATTR, '1');
    else item.removeAttribute(FOLDED_ATTR);
};

// 几何检测会强制重排，且离屏卡片尺寸不可靠，改为进入视口后再测一次
let foldIO = null;
const watchedItems = new WeakSet();

const onFoldIntersect = entries => {
    for (const en of entries) {
        if (!en.isIntersecting) continue;
        const item = en.target;
        foldIO.unobserve(item);
        // 等这一帧完成布局再读尺寸
        requestAnimationFrame(() => { if (item.isConnected) applyFold(item, true); });
    }
};

const probeWhenVisible = item => {
    if (watchedItems.has(item)) return;
    watchedItems.add(item);
    if (!('IntersectionObserver' in window)) { applyFold(item, true); return; }
    if (!foldIO) foldIO = new IntersectionObserver(onFoldIntersect, { rootMargin: '200px 0px' });
    foldIO.observe(item);
};

// 展开/收起后重新判定（文案或类名变化不一定触发子节点观察）
const initFoldWatcher = () => {
    document.addEventListener('click', e => {
        if (!document.documentElement.hasAttribute(HOME_ATTR)) return;
        const btn = e.target.closest?.('.ContentItem-more, .ContentItem-rightButton, .RichContent-collapsedText');
        if (!btn) return;
        const card = btn.closest(SHELL_SEL);
        if (card) setTimeout(() => scanCards(card, true), 300);
    }, true);
    window.addEventListener('load', () => scanCards());
};

// ==================== 卡片管线 ====================
// 首页/问题页的卡片要做的判定全在这里，入口只有 scanCards 一个：
//   外壳（带 border 的那层）：整卡商品、空壳、文章标记、折叠
//   内容项（带时间的那层）：发布/编辑时间、文章标签
// 单次遍历同时处理两类节点，新增节点与全量维护共用同一条路径。
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

// 外壳判定：商品/空壳 → 文章卡 → 折叠
const markShell = (card, geometry) => {
    markCommerce(card);
    // 文章卡只打标供 CSS 屏蔽，无需折叠判定
    if (card.matches('.ArticleItem') || card.querySelector('.ArticleItem')) {
        return card.setAttribute(ARTICLE_ATTR, '1');
    }
    if (!document.documentElement.hasAttribute(HOME_ATTR)) return;
    applyFold(card, geometry);
    probeWhenVisible(card);
};

// 内容项判定：时间 + 文章标签。问题页 .List-item 包着 .AnswerItem，只在最内层做
const markItem = item => {
    if (item.classList.contains('List-item') && item.querySelector('.AnswerItem')) return;
    processTimeInfo(item);
    addArticleTag(item);
};

const scanNode = (node, geometry) => {
    if (node.matches(SHELL_SEL)) markShell(node, geometry);
    if (node.matches(ITEM_SEL)) markItem(node);
};

const scanCards = (root = document, geometry = false) => {
    if (root.nodeType === 1) scanNode(root, geometry);
    for (const node of root.querySelectorAll(SCAN_SEL)) scanNode(node, geometry);
};

// 广告与空推荐位直接删节点（display:none 会留下卡片外壳，站点导航也仍会走到它）
const removeAds = (root = document) => {
    if (root.nodeType === 1) {
        if (root.matches(C.S.ads)) return root.remove();
        if (root.matches('.TopstoryItem-isRecommend') && !root.textContent.trim()) return root.remove();
    }
    for (const ad of root.querySelectorAll(C.S.ads)) ad.remove();
    for (const card of root.querySelectorAll('.TopstoryItem-isRecommend')) {
        if (!card.textContent.trim()) card.remove();
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
        if (owner) scanNode(owner, false);
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
            if (location.href.includes('/question/')) setTimeout(collapseAnswers, C.SCROLL_DELAY);
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
    if (foldIO) { foldIO.disconnect(); foldIO = null; }
    if (timeIO) { timeIO.disconnect(); timeIO = null; }
    if (timeSaveTimer) { clearTimeout(timeSaveTimer); timeSaveTimer = 0; }
    timeQueue.length = 0;
    timeStore.clear();
    timeCache.clear();
    document.querySelector('.theme-switcher')?.remove();
    backTopBtn?.remove();
    backTopBtn = null;
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

    // 首页折叠回答图片屏蔽 + 功能开关
    syncHomeFlag();
    applyToggles();
    initFoldWatcher();
    
    // 创建主题菜单与滚动联动（顶栏隐藏 + 回到顶部）
    createThemeMenu();
    initScrollEffects();
    initImageKeys();
    
    // 延迟处理页面内容（等待知乎数据加载）
    const isHome = location.pathname === '/' || location.pathname === '';
    setTimeout(() => {
        maintain();
        // 问题详情页自动收起回答
        if (location.href.includes('/question/')) setTimeout(collapseAnswers, C.SCROLL_DELAY);
    }, isHome ? C.HOME_DELAY : C.INIT_DELAY);
    
    // 创建各种观察者
    createObservers();
};


// 页面卸载时清理资源（进入 bfcache 时不清理，便于返回后继续生效）
window.addEventListener('pagehide', e => { if (!e.persisted) cleanup(); });
// DOM 就绪后初始化
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();