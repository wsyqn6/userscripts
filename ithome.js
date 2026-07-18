// ==UserScript==
// @name         IT之家·优化阅读体验
// @namespace    https://github.com/wsyqn6/userscripts
// @version      2.2
// @description  解锁登录图片，移除广告，热榜集成到侧边栏，信息流全屏展示
// @author       wsyqn6
// @match        *://*.ithome.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const CSS = `
.ithome-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}
.ithome-overlay.show{opacity:1;pointer-events:auto}
.ithome-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px}
.ithome-overlay-close{position:absolute;top:20px;right:20px;width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.ithome-rank-panel{position:fixed;top:0;right:-340px;width:340px;height:100vh;background:#fff;z-index:9997;box-shadow:-2px 0 12px rgba(0,0,0,.1);transition:right .3s;overflow-y:auto;font-family:Microsoft Yahei,PingFang SC,HanHei SC,Arial}
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
.ithome-rank-num{flex:0 0 24px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;margin-top:2px}
.ithome-rank-num.top1,.ithome-rank-num.top2,.ithome-rank-num.top3{background:#d22222}
.ithome-rank-num.normal{background:#bbb}
.ithome-rank-item a{flex:1;min-width:0;color:#333;text-decoration:none;font-size:14px;line-height:1.6;display:block}
.ithome-rank-item a:hover{color:#d22222}
.ithome-rank-mask{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9996;opacity:0;pointer-events:none;transition:opacity .3s}
.ithome-rank-mask.show{opacity:1;pointer-events:auto}
#side_func a.sfa.rank{background:#1a1a1a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M12 23c-4.4 0-8-3.6-8-8 0-4 4-9 8-11 4 2 8 7 8 11 0 4.4-3.6 8-8 8zm0-3c2.8 0 5-2.2 5-5 0-2.5-2.5-6-5-8-2.5 2-5 5.5-5 8 0 2.8 2.2 5 5 5z'/%3E%3C/svg%3E") no-repeat 15px 6px;background-size:20px;color:#fff;font-size:10px;line-height:76px!important}
#side_func a.sfa.rank:hover{background-color:#d22222!important;color:#fff!important}
body.red #side_func a.sfa.rank{background-color:#d22222}
body.red #side_func a.sfa.rank:hover{background-color:#1a1a1a!important}
#list .fl{width:100%!important;float:none!important}
#list .fr.fx.fix-top{display:none!important}
#dt .fl.content{width:100%!important;float:none!important}
#list .bl li{display:flex!important;gap:20px!important;padding:20px 0!important}
#list .bl li .img{flex:0 0 min(280px,30vw)!important}
#list .bl li .img img{width:100%!important;height:auto!important;border-radius:6px!important}
#list .bl li .c{flex:1!important;min-width:0!important;margin:0!important}
`;

    const S = {
        rank: '#rank',
        sideFunc: '#side_func',
        commentBtn: '.sfa.comment',
        ads: '#down, .down_app, #login-guide-box',
    };

    const decodeImgUrl = s => {
        try { return atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - s.length % 4) % 4)); }
        catch { return null; }
    };

    const waitForAll = (sels, cb, ttl) => {
        const check = () => sels.every(s => document.querySelector(s));
        if (check()) return void cb();
        const obs = new MutationObserver(() => { if (check()) { obs.disconnect(); cb(); } });
        obs.observe(document.body, { childList: true, subtree: true });
        if (ttl) setTimeout(() => obs.disconnect(), ttl);
    };

    const removeAds = () => document.querySelectorAll(S.ads).forEach(el => el.remove());

    const cleanSidebar = () => {
        document.querySelectorAll('#side_func .sfa').forEach(el => {
            if (['app', 'sideweixin', 'tougao'].some(c => el.classList.contains(c))) el.remove();
        });
    };

    const initRankPanel = () => {
        const rank = document.getElementById('rank');
        const sideFunc = document.getElementById('side_func');
        if (!rank || !sideFunc) return;

        const tabLabels = [...rank.querySelectorAll('.bar li')].map(el => el.textContent.trim());
        const tabLists = [...rank.querySelectorAll('.bd')].map(list =>
            [...list.querySelectorAll('li')].map(li => li.querySelector('a')).filter(Boolean).map((a, i) => ({
                href: a.href, text: a.textContent.trim(), rank: i + 1
            }))
        );

        const btn = document.createElement('a');
        btn.className = 'sfa rank'; btn.href = 'javascript:;'; btn.title = '热榜'; btn.textContent = '热榜';

        const panel = Object.assign(document.createElement('div'), { id: 'ithome-rank-panel', className: 'ithome-rank-panel' });
        panel.innerHTML = `
<div class="ithome-rank-panel-header"><h3>🔥 热榜</h3><button class="ithome-rank-panel-close">&times;</button></div>
<div class="ithome-rank-panel-content">
<ul class="ithome-rank-tabs">${tabLabels.map((t, i) => `<li class="ithome-rank-tab${i ? '' : ' active'}" data-i="${i}">${t}</li>`).join('')}</ul>
<div class="ithome-rank-lists">${tabLists.map((items, ti) => `
<ul class="ithome-rank-list${ti ? '' : ' active'}" data-i="${ti}">${items.map(a => {
    const nc = a.rank <= 3 ? 'top' + a.rank : 'normal';
    return `<li class="ithome-rank-item"><span class="ithome-rank-num ${nc}">${a.rank}</span><a href="${a.href}">${a.text}</a></li>`;
}).join('')}</ul>`).join('')}</div></div>`;

        const mask = Object.assign(document.createElement('div'), { id: 'ithome-rank-mask', className: 'ithome-rank-mask' });

        const toggle = () => { panel.classList.toggle('show'); mask.classList.toggle('show'); };
        btn.addEventListener('click', toggle);
        panel.querySelector('.ithome-rank-panel-close').addEventListener('click', toggle);
        mask.addEventListener('click', toggle);

        panel.addEventListener('click', e => {
            const tab = e.target.closest('.ithome-rank-tab');
            if (!tab) return;
            const i = tab.dataset.i;
            panel.querySelectorAll('.ithome-rank-tab').forEach(t => t.classList.remove('active'));
            panel.querySelectorAll('.ithome-rank-list').forEach(l => l.classList.remove('active'));
            tab.classList.add('active');
            panel.querySelector(`.ithome-rank-list[data-i="${i}"]`)?.classList.add('active');
        });

        sideFunc.insertBefore(btn, sideFunc.querySelector(S.commentBtn));
        document.body.append(panel, mask);
        rank.remove();
    };

    let overlay = null;
    const getOverlay = () => {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ithome-overlay';
            overlay.className = 'ithome-overlay';
            overlay.innerHTML = '<button class="ithome-overlay-close">&times;</button><img>';
            overlay.querySelector('button').onclick = () => overlay.classList.remove('show');
            overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('show'); };
            document.body.appendChild(overlay);
        }
        return overlay;
    };

    const replacePlaceholders = () => {
        document.querySelectorAll('.img-placeholder:not([data-unlocked])').forEach(span => {
            const url = decodeImgUrl(span.getAttribute('data-s'));
            if (!url || !/^https?:\/\//i.test(url)) return;
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = 'max-height:180px;width:auto;border-radius:8px;margin:8px 0;cursor:zoom-in;display:block';
            img.onclick = () => { const o = getOverlay(); o.querySelector('img').src = url; o.classList.add('show'); };
            img.onerror = function() { this.remove(); };
            span.parentNode.replaceChild(img, span);
        });
    };

    const init = () => {
        if (!document.body) { window.addEventListener('DOMContentLoaded', init); return; }

        document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') document.getElementById('ithome-overlay')?.classList.remove('show');
        });

        replacePlaceholders();
        new MutationObserver(muts => {
            for (const m of muts) {
                if ([...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.('.img-placeholder') || n.querySelector?.('.img-placeholder')))) {
                    replacePlaceholders(); break;
                }
            }
        }).observe(document.body, { childList: true, subtree: true });

        waitForAll([S.rank, S.sideFunc], () => { removeAds(); cleanSidebar(); initRankPanel(); }, 10000);
    };

    init();
})();
