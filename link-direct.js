// ==UserScript==
// @name         直链跳转·跳过中转页
// @namespace    https://github.com/yourname/link-direct
// @version      1.2
// @description  跳过知乎等网站的中转页，直接访问目标链接
// @author       YourName
// @match        *://www.zhihu.com/*
// @match        *://zhuanlan.zhihu.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const redirectors = [{
        // 只匹配 link.zhihu.com 域名，更精确
        match: /^https?:\/\/link\.zhihu\.com\/\?target=/i,
        extract: url => {
            try {
                const u = new URL(url);
                const target = u.searchParams.get('target');
                if (!target) return null;
                
                // 标准URL解码
                const decoded = decodeURIComponent(target);
                
                // 验证是否为有效URL
                if (/^https?:\/\//i.test(decoded)) {
                    return decoded;
                }
                return null;
            } catch {
                return null;
            }
        }
    }];

    const resolveUrl = href => {
        if (!href || typeof href !== 'string') return null;
        
        // 只处理绝对URL
        if (!/^https?:\/\//i.test(href)) return null;
        
        for (const r of redirectors) {
            if (r.match.test(href)) {
                return r.extract(href);
            }
        }
        return null;
    };

    const fixLinks = () => {
        // 使用更精确的选择器
        const links = document.querySelectorAll('a[href*="link.zhihu.com"]');
        for (const a of links) {
            const direct = resolveUrl(a.href);
            if (direct) {
                a.href = direct;
                // 移除可能干扰的事件监听器
                a.removeAttribute('onclick');
                a.removeAttribute('data-click');
                // 添加属性标记已处理，避免重复
                a.dataset.directFixed = 'true';
            }
        }
    };

    // 防抖处理，避免频繁触发
    let fixTimer = null;
    const debouncedFix = () => {
        if (fixTimer) clearTimeout(fixTimer);
        fixTimer = setTimeout(fixLinks, 100);
    };

    // 初始执行
    fixLinks();

    // 事件委托 - 使用捕获阶段提前处理
    document.addEventListener('mousedown', e => {
        const a = e.target.closest('a[href*="link.zhihu.com"]');
        if (a && !a.dataset.directFixed) {
            const direct = resolveUrl(a.href);
            if (direct) {
                a.href = direct;
                a.dataset.directFixed = 'true';
            }
        }
    }, true);

    // 观察DOM变化
    const observer = new MutationObserver(mutations => {
        // 检查是否有新增的链接
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                debouncedFix();
                break;
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();