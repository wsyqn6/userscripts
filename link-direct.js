// ==UserScript==
// @name         直链跳转·跳过中转页
// @namespace    https://github.com/yourname/link-direct
// @version      1.3
// @description  跳过知乎、掘金等网站的中转页，直接访问目标链接
// @author       YourName
// @match        *://www.zhihu.com/*
// @match        *://zhuanlan.zhihu.com/*
// @match        *://juejin.cn/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const redirectors = [{
        name: '知乎',
        hosts: ['link.zhihu.com'],
        match: /^https?:\/\/link\.zhihu\.com\//i,
        extract: url => {
            try {
                const target = new URL(url).searchParams.get('target');
                return target && /^https?:\/\//i.test(target) ? target : null;
            } catch {
                return null;
            }
        }
    }, {
        name: '掘金',
        hosts: ['link.juejin.cn'],
        match: /^https?:\/\/link\.juejin\.cn\//i,
        extract: url => {
            try {
                const target = new URL(url).searchParams.get('target');
                return target && /^https?:\/\//i.test(target) ? target : null;
            } catch {
                return null;
            }
        }
    }];

    const allHosts = redirectors.flatMap(r => r.hosts);

    const resolveUrl = href => {
        if (!href || typeof href !== 'string') return null;
        if (!/^https?:\/\//i.test(href)) return null;
        for (const r of redirectors) {
            if (r.match.test(href)) return r.extract(href);
        }
        return null;
    };

    const hostSelector = allHosts.map(h => `a[href*="${h}"]`).join(',');

    const fixLinks = () => {
        const links = document.querySelectorAll(
            allHosts.map(h => `a[href*="${h}"]:not([data-direct-fixed])`).join(',')
        );
        for (const a of links) {
            const direct = resolveUrl(a.href);
            if (direct) {
                a.href = direct;
                a.removeAttribute('onclick');
                a.removeAttribute('data-click');
                a.dataset.directFixed = 'true';
            }
        }
    };

    let fixTimer = null;
    const debouncedFix = () => {
        if (fixTimer) clearTimeout(fixTimer);
        fixTimer = setTimeout(fixLinks, 200);
    };

    const init = () => {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', init);
            return;
        }

        if (!allHosts.some(h => document.querySelector(`a[href*="${h}"]`))) return;

        fixLinks();

        document.addEventListener('mousedown', e => {
            const a = e.target.closest(hostSelector);
            if (a && !a.dataset.directFixed) {
                const direct = resolveUrl(a.href);
                if (direct) {
                    a.href = direct;
                    a.dataset.directFixed = 'true';
                }
            }
        }, true);

        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    debouncedFix();
                    break;
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    };

    init();
})();
