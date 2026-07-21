// ==UserScript==
// @name         知乎极简宽屏·液态玻璃顶栏·主题切换
// @namespace    https://github.com/wsyqn6/userscripts
// @version      1.2
// @description  宽屏布局、玻璃顶栏、7种护眼主题、优化可读性
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
    URL_DELAY: 500, SCROLL_DELAY: 800, INIT_DELAY: 1000, HOME_DELAY: 1500,
    S: {
        mainCol: '.Topstory-mainColumn,.Question-mainColumn,.ContentLayout-mainColumn',
        items: '.AnswerItem, .List-item, .ArticleItem',
        time: '.ContentItem-time',
        ads: '[class*="advertCard"], [class*="Pc-feedAd"], [class*="Pc-word"], .PinItem, .Pc-Business-Card-PcTopFeedBanner, [data-za-detail-view-path-module="RightSideBar"], .GlobalSideBar'
    },
    THEMES: {
        light:    { n:'晨曦白',   bg:'#f7f5f0', tx:'#2e2924', ti:'#1a1712', ac:'#8a7660', bd:'#ddd6cc', cd:'#fefdfa', hd:'rgba(247,245,240,0.72)', lk:'#5b7a9a', hl:'rgba(91,122,154,0.1)' },
        green:    { n:'薄荷绿',   bg:'#e4ede4', tx:'#283228', ti:'#182418', ac:'#527a52', bd:'#c4d4c4', cd:'#f0f6f0', hd:'rgba(228,237,228,0.72)', lk:'#36805a', hl:'rgba(54,128,90,0.1)' },
        blue:     { n:'雾霾蓝',   bg:'#e3e9f0', tx:'#1c2838', ti:'#0e1826', ac:'#4d6b8a', bd:'#c2cedc', cd:'#f0f4f8', hd:'rgba(227,233,240,0.72)', lk:'#4a72ad', hl:'rgba(74,114,173,0.12)' },
        amber:    { n:'琥珀黄昏', bg:'#f5e9d2', tx:'#3f3220', ti:'#261c0e', ac:'#b08844', bd:'#e0cfb4', cd:'#fcf4e6', hd:'rgba(245,233,210,0.72)', lk:'#b07a28', hl:'rgba(176,122,40,0.1)' },
        gray:     { n:'暮色灰',   bg:'#2a2c32', tx:'#babec6', ti:'#c6cad0', ac:'#989da8', bd:'#43454d', cd:'#35373d', hd:'rgba(42,44,50,0.85)', lk:'#7a9eb5', hl:'rgba(122,158,181,0.15)' },
        dark:     { n:'午夜黑',   bg:'#131313', tx:'#b3b7be', ti:'#c0c4ca', ac:'#8d929b', bd:'#2a2a2e', cd:'#1a1a1a', hd:'rgba(19,19,19,0.85)', lk:'#7895ad', hl:'rgba(120,149,173,0.15)' },
        darkBlue: { n:'深海蓝',   bg:'#0e1118', tx:'#afb4bf', ti:'#bcc2cc', ac:'#8a909f', bd:'#282e3c', cd:'#161a24', hd:'rgba(14,17,24,0.85)', lk:'#7a9ebd', hl:'rgba(122,158,189,0.15)' }
    }
};

let currentTheme = 'light';

// ==================== CSS 样式 ====================
const CSS = `
/* 主列宽屏 */
.Topstory-mainColumn,.Question-mainColumn,.SearchMain,.ContentLayout-mainColumn,.Profile-mainColumn,.CollectionsDetailPage-mainColumn{width:calc(100% - 40px)!important;max-width:1400px!important;margin:0 auto!important;float:none!important}
/* 隐藏侧边栏及广告区域 */
.Topstory-sideColumn,.Question-sideColumn,.ContentLayout-sideColumn,.Profile-sideColumn,.GlobalSideBar,[data-za-detail-view-path-module="RightSideBar"],.Card.QuestionHeaderTopicMeta,.Post-Row-Content-right,.Pc-Business-Card-PcTopFeedBanner,.WriteArea,.TopstoryItem-isRecommend:empty{display:none!important}
/* 容器宽屏 */
.Topstory-container,.Question-main,.Search-container,.ContentLayout,.CollectionsDetailPage,.Post-Row-Content-left{width:100%!important;max-width:1400px!important;margin:0 auto!important}
.Post-Row-Content-left{max-width:1000px!important}
/* 回答项宽屏 */
.List-item,.AnswerItem{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}
/* 列表容器及头部对齐修复 */
.ListShortcut .List,.List-header{width:100%!important;box-sizing:border-box!important}
.List-headerOptions{margin-right:0!important;padding-right:0!important;right:auto!important}
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
.RichContent-inner,.CommentItem .ContentItem-content,.CommentItem .RichText,.CommentItem-content .RichText{color:var(--tx)!important;line-height:1.75!important}
.RichContent-inner h1,.RichContent-inner h2,.RichContent-inner h3,.RichContent-inner h4{color:var(--ti)!important;line-height:1.5!important}
.RichContent-inner strong{color:var(--ti)!important}
.RichContent-inner a{color:var(--lk)!important;border-bottom:1px solid transparent!important;transition:border-color 0.2s ease!important}
.RichContent-inner a:hover{border-bottom-color:var(--lk)!important}
::selection{background:var(--hl)!important}
.Post-Title,.QuestionTitle{color:var(--ti)!important}
/* 卡片样式 */
.Card,.List-item,.AnswerItem,.ContentItem{background-color:var(--cd)!important;border-color:var(--bd)!important;transition:background-color 0.3s ease,border-color 0.3s ease!important}
/* 自定义发布时间 */
.custom-publish-time{font-size:13px;color:var(--ac)!important;margin-top:4px;margin-bottom:8px;padding:4px 0;border-bottom:1px solid var(--bd)!important;display:block;clear:both}
/* 文章标签 */
.article-tag{display:inline-block;margin-left:8px;padding:1px 6px;font-size:11px;font-weight:500;color:var(--lk)!important;background:var(--hl)!important;border-radius:3px;vertical-align:middle}
/* 主题切换器 */
.theme-switcher{position:fixed!important;right:20px!important;bottom:100px!important;z-index:9999!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important}
.theme-switcher-btn{width:48px!important;height:48px!important;border-radius:50%!important;background:var(--cd)!important;border:2px solid var(--bd)!important;box-shadow:0 4px 16px rgba(0,0,0,0.12)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important;color:var(--tx)!important}
.theme-switcher-btn:hover{transform:scale(1.08) rotate(15deg)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important}
.theme-switcher-btn:active{transform:scale(1.02)!important}
.theme-switcher-menu{position:absolute!important;right:0!important;bottom:58px!important;background:var(--cd)!important;border:1px solid var(--bd)!important;border-radius:16px!important;padding:12px 0!important;min-width:160px!important;box-shadow:0 10px 30px rgba(0,0,0,0.15)!important;opacity:0!important;visibility:hidden!important;transform:translateY(10px) scale(0.95)!important;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)!important}
.theme-switcher-menu.show{opacity:1!important;visibility:visible!important;transform:translateY(0) scale(1)!important}
.theme-switcher-item{display:flex!important;align-items:center!important;padding:12px 20px!important;cursor:pointer!important;transition:all 0.2s ease!important;color:var(--tx)!important;font-size:14px!important;position:relative!important}
.theme-switcher-item:first-child{border-radius:16px 16px 0 0!important}
.theme-switcher-item:last-child{border-radius:0 0 16px 16px!important}
.theme-switcher-item:hover{background:rgba(0,0,0,0.04)!important;padding-left:24px!important}
.theme-switcher-item.active{background:var(--hl)!important;color:var(--lk)!important;font-weight:600!important}
.theme-switcher-item.active::after{content:''!important;position:absolute!important;right:16px!important;width:6px!important;height:6px!important;border-radius:50%!important;background:var(--lk)!important}
.theme-preview{width:20px!important;height:20px!important;border-radius:6px!important;margin-right:12px!important;border:2px solid rgba(0,0,0,0.08)!important;flex-shrink:0!important;transition:transform 0.2s ease!important}
.theme-switcher-item:hover .theme-preview{transform:scale(1.15)!important}
.theme-switcher-menu::after{content:''!important;position:absolute!important;right:18px!important;bottom:-7px!important;width:12px!important;height:12px!important;background:var(--cd)!important;border-right:1px solid var(--bd)!important;border-bottom:1px solid var(--bd)!important;transform:rotate(45deg)!important;box-shadow:2px 2px 4px rgba(0,0,0,0.05)!important}
/* 图片样式 */
.RichContent-inner img,.Post-RichText img,.AnswerCard img{max-width:70%!important;height:auto!important;border-radius:8px!important}
/* 问题页宽屏修复：清除 hash 容器宽度限制 */
.App-main{width:100%!important;max-width:none!important}
.QuestionPage{width:100%!important;max-width:1400px!important;margin:0 auto!important}
.QuestionPage>div:not(.AnswerFormPortalContainer){width:100%!important;max-width:100%!important}
.QuestionPage>div:not(.AnswerFormPortalContainer)>div:first-child{width:100%!important}
.Question-mainColumn{width:100%!important;max-width:none!important}
/* 问题头宽屏 */
.QuestionHeader-content{width:100%!important;max-width:none!important;padding:16px 0!important}
.QuestionHeader-main{flex:1!important;min-width:0!important}
.QuestionHeader-title,.QuestionRichText{width:100%!important;max-width:none!important}
.QuestionHeader-footer{width:100%!important}
`;

const STORAGE_KEY = 'zhihu-theme';
const THEME_MENU_CLASS = 'theme-switcher';

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
const setTheme = k => {
    if (!C.THEMES[k]) return;
    currentTheme = k;
    const t = C.THEMES[k], r = document.documentElement;
    const cssKey = { hd: 'h' };
    for (const key in t) {
        if (key === 'n') continue;
        r.style.setProperty(`--${cssKey[key] || key}`, t[key]);
    }
    k === 'gray' || k.startsWith('dark') ? r.setAttribute('data-theme', 'dark') : r.removeAttribute('data-theme');
    localStorage.setItem(STORAGE_KEY, k);
    document.querySelectorAll('.' + THEME_MENU_CLASS + '-item').forEach(i => i.classList.toggle('active', i.dataset.theme === k));
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
    
    Object.keys(C.THEMES).forEach(k => {
        const t = C.THEMES[k];
        const item = document.createElement('div');
        item.className = `theme-switcher-item ${k === currentTheme ? 'active' : ''}`;
        item.dataset.theme = k;
        item.innerHTML = `<div class="theme-preview" style="background:${t.bg};border-color:${t.bd}"></div><span>${t.n}</span>`;
        item.onclick = () => { setTheme(k); menu.classList.remove('show'); };
        menu.appendChild(item);
    });
    
    container.appendChild(menu);
    container.appendChild(btn);
    document.body.appendChild(container);
    
    btn.onclick = () => menu.classList.toggle('show');
    document.addEventListener('click', e => { if (!container.contains(e.target)) menu.classList.remove('show'); });
};

// ==================== 顶栏滚动隐藏 ====================
const initHeaderScrollHide = () => {
    const header = document.querySelector('.AppHeader');
    if (!header) return;
    let lastY = window.scrollY, isHidden = false, upDist = 0;
    const update = throttle(() => {
        const cy = window.scrollY, delta = lastY - cy;
        // 向下滚动且超过阈值时隐藏顶栏
        if (cy > lastY && cy > C.HEADER_HIDE && !isHidden) { header.classList.add('header--hidden'); isHidden = true; upDist = 0; }
        // 向上滚动累计达到阈值时显示顶栏
        else if (delta > 0 && isHidden) { upDist += delta; if (upDist >= C.HEADER_SHOW) { header.classList.remove('header--hidden'); isHidden = false; upDist = 0; } }
        // 继续向下滚动时重置向上距离
        else if (delta <= 0 && isHidden) upDist = 0;
        lastY = cy;
    }, C.THROTTLE);
    window.addEventListener('scroll', update, { passive: true });
};

// ==================== 发布时间 ====================
const processTimeInfo = item => {
    // 跳过已处理的项目
    if (item.querySelector('.custom-publish-time')) return;
    // 关键修复：问题详情页中 .List-item 包含 .AnswerItem，避免重复添加时间
    if (item.classList.contains('List-item') && item.querySelector('.AnswerItem')) return;
    
    const timeEl = item.querySelector(C.S.time);
    if (!timeEl) return;
    const link = timeEl.querySelector('a');
    if (!link) return;

    // 从 tooltip 或 aria-label 获取发布时间，从文本获取编辑时间
    const tooltip = link.getAttribute('data-tooltip') || link.getAttribute('aria-label') || '';
    const text = link.textContent.trim();
    const pm = tooltip.match(/发布于(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
    const em = text.match(/编辑于(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);

    let str = '';
    if (pm) str += `发布于 ${formatTime(pm[1])}`;
    if (em) str += ` · 编辑于 ${formatTime(em[1])}`;
    if (!str.trim()) return;

    // 创建自定义时间元素并插入
    const div = document.createElement('div');
    div.className = 'custom-publish-time';
    div.textContent = str.replace(/^ · /, '');
    item.prepend(div);
};

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

const addPublishTime = () => document.querySelectorAll(C.S.items).forEach(item => { processTimeInfo(item); addArticleTag(item); });

// ==================== 收起回答 ====================
const collapseItem = item => {
    const btn = item.querySelector('.ContentItem-rightButton');
    if (!btn) return;
    const text = btn.querySelector('.RichContent-collapsedText');
    if (text && text.textContent.includes('收起')) btn.click();
};

const collapseAnswers = () => {
    document.querySelectorAll('.AnswerItem').forEach(collapseItem);
};

// ==================== 节点处理 ====================
const processAddedNodes = mutations => {
    mutations.forEach(m => {
        m.addedNodes.forEach(n => {
            if (n.nodeType !== Node.ELEMENT_NODE) return;
            
            // 广告拦截
            if (n.matches(C.S.ads)) { n.remove(); return; }
            const ads = n.querySelectorAll(C.S.ads);
            for (const ad of ads) ad.remove();
            for (const c of n.querySelectorAll('.TopstoryItem-isRecommend')) { if (!c.textContent.trim()) c.remove(); }
            if (n.matches('.TopstoryItem-isRecommend') && !n.textContent.trim()) { n.remove(); return; }
            
            const items = n.matches(C.S.items) ? [n] : [...n.querySelectorAll(C.S.items)];
            if (!items.length) {
                const p = n.closest(C.S.items);
                if (p) items.push(p);
            }
            if (!items.length) return;
            items.forEach(item => {
                processTimeInfo(item);
                addArticleTag(item);
                if (location.href.includes('/question/') && item.classList.contains('AnswerItem')) collapseItem(item);
            });
        });
    });
};

// ==================== 广告拦截 ====================
const blockAds = () => {
    document.querySelectorAll(C.S.ads).forEach(ad => ad.remove());
    document.querySelectorAll('.TopstoryItem-isRecommend').forEach(card => {
        if (!card.textContent.trim()) card.remove();
    });
};

// ==================== 观察者 ====================
let observers = [], _pushState, _replaceState;

const createObservers = () => {
    let urlTimeout;
    _pushState = history.pushState;
    _replaceState = history.replaceState;
    
    const onUrlChange = () => {
        clearTimeout(urlTimeout);
        urlTimeout = setTimeout(() => { 
            addPublishTime(); 
            blockAds();
            if (location.href.includes('/question/')) setTimeout(collapseAnswers, C.SCROLL_DELAY);
        }, C.URL_DELAY);
    };
    
    history.pushState = (...args) => { _pushState.apply(history, args); onUrlChange(); };
    history.replaceState = (...args) => { _replaceState.apply(history, args); onUrlChange(); };
    window.addEventListener('popstate', onUrlChange);
    
    const contentObserver = new MutationObserver(processAddedNodes);
    const mainCol = document.querySelector(C.S.mainCol);
    contentObserver.observe(mainCol || document.body, { childList: true, subtree: true });
    observers.push(contentObserver);
};

// ==================== 清理 ====================
const cleanup = () => {
    observers.forEach(o => o.disconnect());
    observers = [];
    timeCache.clear();
    document.querySelector('.theme-switcher')?.remove();
    if (_pushState) history.pushState = _pushState;
    if (_replaceState) history.replaceState = _replaceState;
};

// ==================== 初始化 ====================
const init = () => {
    // 注入 CSS 样式
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    
    // 恢复保存的主题
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && C.THEMES[saved]) setTheme(saved);
    
    // 创建主题菜单和顶栏滚动隐藏
    createThemeMenu();
    initHeaderScrollHide();
    
    // 延迟处理页面内容（等待知乎数据加载）
    const isHome = location.href === 'https://www.zhihu.com/' || location.href === 'https://www.zhihu.com';
    setTimeout(() => {
        addPublishTime();
        blockAds();
        // 问题详情页自动收起回答
        if (location.href.includes('/question/')) setTimeout(collapseAnswers, C.SCROLL_DELAY);
    }, isHome ? C.HOME_DELAY : C.INIT_DELAY);
    
    // 创建各种观察者
    createObservers();
};

// 页面卸载时清理资源
window.addEventListener('unload', cleanup);
// DOM 就绪后初始化
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();