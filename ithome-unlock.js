// ==UserScript==
// @name         IT之家解锁
// @namespace    https://github.com/wsyqn6/userscripts
// @version      2.4
// @description  解锁登录可见图片、移除广告、热榜集成到侧边栏、信息流全宽展示
// @author       wsyqn6
// @match        *://*.ithome.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const CSS = `
.ithome-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}
.ithome-overlay.show{opacity:1;pointer-events:auto}
.ithome-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px}
.ithome-overlay-close{position:absolute;top:80px;right:20px;width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:1}
/* 面板与遮罩从固定顶栏下方展开，避免头部和关闭按钮被顶栏盖住 */
.ithome-rank-panel{position:fixed;top:var(--ithome-top,0px);right:-340px;width:340px;height:calc(100vh - var(--ithome-top,0px));background:#fff;z-index:9997;box-shadow:-2px 0 12px rgba(0,0,0,.1);transition:right .3s;overflow-y:auto;font-family:Microsoft Yahei,PingFang SC,HanHei SC,Arial}
.ithome-rank-panel.show{right:0}
.ithome-rank-panel-header{padding:16px 20px;background:#1a1a1a;border-bottom:3px solid #d22222;display:flex;align-items:center;justify-content:space-between}
.ithome-rank-panel-header h3{margin:0;font-size:16px;font-weight:400;color:#fff}
.ithome-rank-panel-close{width:32px;height:32px;border:none;background:none;font-size:22px;color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .2s}
.ithome-rank-panel-close:hover{color:#d22222}
.ithome-rank-tabs{display:flex;margin:0;padding:0;list-style:none;border-bottom:1px solid #f0f0f0;background:#fafafa}
.ithome-rank-tab{flex:1;padding:12px 0;text-align:center;font-size:14px;color:#666;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.ithome-rank-tab.active{color:#d22222;border-bottom-color:#d22222;font-weight:600}
.ithome-rank-lists{margin:0;padding:0}
.ithome-rank-list{display:none;margin:0;padding:6px 0;list-style:none}
.ithome-rank-list.active{display:block}
.ithome-rank-item{padding:10px 20px;display:flex;align-items:flex-start;gap:12px;transition:background .15s}
.ithome-rank-item:hover{background:#f8f9fa}
.ithome-rank-num{flex:0 0 24px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;margin-top:2px;background:#bbb}
.ithome-rank-num.top1,.ithome-rank-num.top2,.ithome-rank-num.top3{background:#d22222}
.ithome-rank-item a{flex:1;min-width:0;color:#333;text-decoration:none;font-size:14px;line-height:1.6;display:block}
.ithome-rank-item a:hover{color:#d22222}
.ithome-rank-mask{position:fixed;top:var(--ithome-top,0px);left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9996;opacity:0;pointer-events:none;transition:opacity .3s}
.ithome-rank-mask.show{opacity:1;pointer-events:auto}
#side_func a.sfa.rank{background:#1a1a1a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M12 23c-4.4 0-8-3.6-8-8 0-4 4-9 8-11 4 2 8 7 8 11 0 4.4-3.6 8-8 8zm0-3c2.8 0 5-2.2 5-5 0-2.5-2.5-6-5-8-2.5 2-5 5.5-5 8 0 2.8 2.2 5 5 5z'/%3E%3C/svg%3E") no-repeat 15px 6px;background-size:20px;color:#fff;font-size:10px;line-height:76px!important}
#side_func a.sfa.rank:hover{background-color:#d22222!important;color:#fff!important}
body.red #side_func a.sfa.rank{background-color:#d22222}
body.red #side_func a.sfa.rank:hover{background-color:#1a1a1a!important}
#list .fl,#dt .fl.content{width:100%!important;float:none!important}
#list .fr.fx.fix-top,.fr.fx.no-bottom.fix-top{display:none!important}
#list .bl li{display:flex!important;gap:20px!important;padding:20px 0!important}
#list .bl li .img{flex:0 0 min(280px,30vw)!important}
#list .bl li .img img{width:100%!important;height:auto!important;border-radius:6px!important}
#list .bl li .c{flex:1!important;min-width:0!important;margin:0!important}
#top.hide-bg{background:rgba(0,0,0,.1)!important}
`;

    const S = {
        rank: '#rank', sideFunc: '#side_func', comment: '.sfa.comment',
        ads: '#down, .down_app, #login-guide-box',
        // 已知登录浮层类名，命中即删，最便宜的判定
        login: '[class*="login-guide" i], [class*="loginguide" i], [class*="login-pop" i], [class*="loginpop" i], [class*="login-modal" i], [class*="login-mask" i], [class*="login-layer" i], [class*="loginbox" i]'
    };

    const decodeImgUrl = s => {
        try { return atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - s.length % 4) % 4)); }
        catch { return null; }
    };

    // 条件就绪即回调，超时走 onTimeout，两者只触发其一
    const waitFor = (pred, cb, ttl, onTimeout) => {
        let done = false;
        const run = () => { if (!done) { done = true; cb(); } };
        if (pred()) return run();
        const obs = new MutationObserver(() => { if (pred()) { obs.disconnect(); run(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); if (!done && onTimeout) { done = true; onTimeout(); } }, ttl);
    };

    // ---------- 清理 ----------
    const removeAds = () => document.querySelectorAll(S.ads).forEach(el => el.remove());

    const cleanSidebar = () => document.querySelectorAll('#side_func .sfa').forEach(el => {
        if (['app', 'sideweixin', 'tougao'].some(c => el.classList.contains(c))) el.remove();
    });

    const killBySelector = root => {
        if (root.nodeType !== 1) return;
        if (root.matches(S.login)) return void root.remove();
        root.querySelectorAll?.(S.login).forEach(el => el.remove());
    };

    // 几何兜底：只认浮层定位 + 右上角小尺寸，且文案含登录
    const killByGeometry = el => {
        if (el.nodeType !== 1 || !el.isConnected) return;
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') return;
        const r = el.getBoundingClientRect();
        if (!r.width || r.top > 160 || r.right < innerWidth - 220 || r.width > 360 || r.height > 360) return;
        if (/登录|注册|快捷登录|立即登录/.test(el.textContent)) el.remove();
    };

    // ---------- 登录图片解锁 ----------
    let overlay = null;
    const getOverlay = () => {
        if (overlay) return overlay;
        overlay = Object.assign(document.createElement('div'), { id: 'ithome-overlay', className: 'ithome-overlay' });
        overlay.innerHTML = '<button class="ithome-overlay-close">&times;</button><img>';
        overlay.querySelector('button').onclick = () => overlay.classList.remove('show');
        overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('show'); };
        document.body.appendChild(overlay);
        return overlay;
    };

    const replacePlaceholders = root => {
        if (root.nodeType !== 1) return;
        const spans = root.matches('.img-placeholder') ? [root] : [...root.querySelectorAll('.img-placeholder')];
        for (const span of spans) {
            const url = decodeImgUrl(span.getAttribute('data-s'));
            if (!url || !/^https?:\/\//i.test(url)) continue;
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'max-height:180px;width:auto;border-radius:8px;margin:8px 0;cursor:zoom-in;display:block';
            img.onclick = () => { const o = getOverlay(); o.querySelector('img').src = url; o.classList.add('show'); };
            img.onerror = () => img.remove();
            span.parentNode.replaceChild(img, span);
        }
    };

    // ---------- 热榜面板 ----------
    const initRankPanel = () => {
        const rank = document.getElementById('rank');
        const sideFunc = document.getElementById('side_func');
        if (!rank || !sideFunc) return;

        const labels = [...rank.querySelectorAll('.bar li')].map(el => el.textContent.trim());
        const lists = [...rank.querySelectorAll('.bd')].map(bd =>
            [...bd.querySelectorAll('li')].map(li => li.querySelector('a')).filter(Boolean).map((a, i) => ({
                href: a.href, text: a.textContent.trim(), rank: i + 1
            }))
        );

        const btn = Object.assign(document.createElement('a'), { className: 'sfa rank', href: 'javascript:;', title: '热榜', textContent: '热榜' });

        const panel = Object.assign(document.createElement('div'), { id: 'ithome-rank-panel', className: 'ithome-rank-panel' });
        panel.innerHTML = `
<div class="ithome-rank-panel-header"><h3>🔥 热榜</h3><button class="ithome-rank-panel-close">&times;</button></div>
<ul class="ithome-rank-tabs">${labels.map((t, i) => `<li class="ithome-rank-tab${i ? '' : ' active'}" data-i="${i}">${t}</li>`).join('')}</ul>
<div class="ithome-rank-lists">${lists.map((items, ti) => `
<ul class="ithome-rank-list${ti ? '' : ' active'}" data-i="${ti}">${items.map(a => `
<li class="ithome-rank-item"><span class="ithome-rank-num ${a.rank <= 3 ? 'top' + a.rank : 'normal'}">${a.rank}</span><a href="${a.href}" target="_blank" rel="noopener noreferrer">${a.text}</a></li>`).join('')}
</ul>`).join('')}</div>`;

        const mask = Object.assign(document.createElement('div'), { id: 'ithome-rank-mask', className: 'ithome-rank-mask' });
        const toggle = () => { panel.classList.toggle('show'); mask.classList.toggle('show'); };

        btn.addEventListener('click', toggle);
        panel.querySelector('.ithome-rank-panel-close').addEventListener('click', toggle);
        mask.addEventListener('click', toggle);
        panel.addEventListener('click', e => {
            const tab = e.target.closest('.ithome-rank-tab');
            if (!tab) return;
            panel.querySelectorAll('.ithome-rank-tab').forEach(t => t.classList.toggle('active', t === tab));
            panel.querySelectorAll('.ithome-rank-list').forEach(l => l.classList.toggle('active', l.dataset.i === tab.dataset.i));
        });

        sideFunc.insertBefore(btn, sideFunc.querySelector(S.comment));
        document.body.append(panel, mask);
        rank.remove();
    };

    // ---------- 初始化 ----------
    const init = () => {
        if (!document.body) { window.addEventListener('DOMContentLoaded', init, { once: true }); return; }

        document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

        // 顶栏高度写入变量，供面板与遮罩避开顶栏
        const syncTopOffset = () => {
            const h = document.getElementById('top')?.getBoundingClientRect().height || 0;
            document.documentElement.style.setProperty('--ithome-top', h + 'px');
        };
        syncTopOffset();

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') document.getElementById('ithome-overlay')?.classList.remove('show');
        });

        // 顶栏滚动变色：rAF 节流，节点引用缓存
        let ticking = false, topEl = document.getElementById('top');
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                topEl = topEl?.isConnected ? topEl : document.getElementById('top');
                topEl?.classList.toggle('hide-bg', window.scrollY > 0);
                ticking = false;
            });
        }, { passive: true });

        // 首屏：解锁图片、清登录浮层（几何检查只做这一次全量）
        replacePlaceholders(document);
        killBySelector(document.body);
        document.querySelectorAll('body *').forEach(killByGeometry);

        // 新增节点合并处理；用定时器而非 rAF——后台标签页 rAF 不触发，处理会一直挂起
        let queue = [], timer = 0;
        const flush = () => {
            timer = 0;
            const nodes = queue; queue = [];
            for (const n of nodes) {
                if (!n.isConnected) continue;
                killBySelector(n);
                replacePlaceholders(n);
            }
            // 几何兜底只看新增节点及其直接子元素，限量避免批量插入时强制布局堆积
            for (const n of nodes.slice(0, 60)) {
                if (!n.isConnected) continue;
                killByGeometry(n);
                for (const c of n.children) killByGeometry(c);
            }
        };
        new MutationObserver(muts => {
            for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) queue.push(n);
            if (queue.length && !timer) timer = setTimeout(flush, 16);
        }).observe(document.body, { childList: true, subtree: true });

        waitFor(
            () => document.querySelector(S.rank) && document.querySelector(S.sideFunc),
            () => {
                removeAds();
                cleanSidebar();
                syncTopOffset();
                // 热榜内容可能晚于容器就绪，超时就按已拿到的部分渲染
                waitFor(
                    () => {
                        const bds = document.getElementById('rank')?.querySelectorAll('.bd');
                        return !!bds?.length && [...bds].every(bd => bd.querySelectorAll('li').length > 0);
                    },
                    initRankPanel,
                    15000,
                    () => { if (document.querySelector('#rank .bd li')) initRankPanel(); }
                );
            },
            10000
        );
    };

    init();
})();
