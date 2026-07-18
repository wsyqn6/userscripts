// ==UserScript==
// @name         IT之家·优化阅读体验
// @namespace    https://github.com/wsyqn6/userscripts
// @version      2.1
// @description  解锁登录图片，移除广告，热榜集成到侧边栏，信息流全屏展示
// @author       wsyqn6
// @match        *://*.ithome.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const CSS = `
.ithome-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.3s ease}
.ithome-overlay.show{opacity:1;pointer-events:auto}
.ithome-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px}
.ithome-overlay-close{position:absolute;top:20px;right:20px;width:40px;height:40px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center}

.ithome-rank-panel{position:fixed;top:0;right:-340px;width:340px;height:100vh;background:#fff;z-index:9997;box-shadow:-2px 0 12px rgba(0,0,0,0.1);transition:right 0.3s ease;overflow-y:auto;font-family:Microsoft Yahei,PingFang SC,HanHei SC,Arial}
.ithome-rank-panel.show{right:0}
.ithome-rank-panel-header{padding:16px 20px;background:#1a1a1a;border-bottom:3px solid #d22222;display:flex;align-items:center;justify-content:space-between}
.ithome-rank-panel-header h3{margin:0;font-size:16px;font-weight:400;color:#fff}
.ithome-rank-panel-close{width:32px;height:32px;border:none;background:none;font-size:22px;color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color 0.2s}
.ithome-rank-panel-close:hover{color:#d22222;background:none}
.ithome-rank-panel-content{padding:0}
.ithome-rank-tabs{display:flex;margin:0;padding:0;list-style:none;border-bottom:1px solid #f0f0f0;background:#fafafa}
.ithome-rank-tab{flex:1;padding:12px 0;text-align:center;font-size:14px;color:#666;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s}
.ithome-rank-tab.active{color:#d22222;border-bottom-color:#d22222;font-weight:600}
.ithome-rank-lists{margin:0;padding:0}
.ithome-rank-list{display:none;margin:0;padding:6px 0;list-style:none}
.ithome-rank-list.active{display:block}
.ithome-rank-item{padding:10px 20px;display:flex;align-items:flex-start;gap:12px;transition:background 0.15s}
.ithome-rank-item:hover{background:#f8f9fa}
.ithome-rank-num{flex:0 0 24px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#fff;margin-top:2px}
.ithome-rank-num.top1,.ithome-rank-num.top2,.ithome-rank-num.top3{background:#d22222}
.ithome-rank-num.normal{background:#bbb}
.ithome-rank-item a{flex:1;min-width:0;color:#333;text-decoration:none;font-size:14px;line-height:1.6;display:block}
.ithome-rank-item a:hover{color:#d22222}

.ithome-rank-mask{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:9996;opacity:0;pointer-events:none;transition:opacity 0.3s ease}
.ithome-rank-mask.show{opacity:1;pointer-events:auto}

#side_func a.sfa.rank{background:#1a1a1a url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M12 23c-4.4 0-8-3.6-8-8 0-4 4-9 8-11 4 2 8 7 8 11 0 4.4-3.6 8-8 8zm0-3c2.8 0 5-2.2 5-5 0-2.5-2.5-6-5-8-2.5 2-5 5.5-5 8 0 2.8 2.2 5 5 5z'/%3E%3C/svg%3E") no-repeat 15px 6px;background-size:20px;color:#fff;font-size:10px;line-height:76px!important}
#side_func a.sfa.rank:hover{background-color:#d22222!important;color:#fff!important}
body.red #side_func a.sfa.rank{background-color:#d22222}
body.red #side_func a.sfa.rank:hover{background-color:#1a1a1a!important}
`;

    const decodeImageUrl = s => {
        try {
            const normalized = s.replace(/-/g, '+').replace(/_/g, '/');
            const padding = 4 - (normalized.length % 4);
            const padded = normalized + (padding < 4 ? '='.repeat(padding) : '');
            return atob(padded);
        } catch {
            return null;
        }
    };

    const removeAds = () => {
        const down = document.getElementById('down');
        if (down) down.remove();
    };

    const cleanSideFunc = () => {
        const sideFunc = document.getElementById('side_func');
        if (!sideFunc) return;
        const links = sideFunc.querySelectorAll('.sfa');
        links.forEach(link => {
            if (link.classList.contains('app') || link.classList.contains('sideweixin') || link.classList.contains('tougao')) {
                link.remove();
            }
        });
    };

    const expandFeed = () => {
        const style = document.createElement('style');
        style.textContent = `
            #list .fl { width: 100% !important; float: none !important; }
            #list .fr.fx.fix-top { display: none !important; }
            #dt .fl.content { width: 100% !important; float: none !important; }
            #list .bl li { display: flex !important; gap: 20px !important; padding: 20px 0 !important; }
            #list .bl li .img { flex: 0 0 min(280px, 30vw) !important; }
            #list .bl li .img img { width: 100% !important; height: auto !important; border-radius: 6px !important; }
            #list .bl li .c { flex: 1 !important; min-width: 0 !important; margin: 0 !important; }
        `;
        document.head.appendChild(style);
    };

    const initRankPanel = () => {
        const rank = document.getElementById('rank');
        if (!rank) {
            console.log('ithome: rank element not found');
            return;
        }

        console.log('ithome: rank innerHTML:', rank.innerHTML.substring(0, 500));

        const sideFunc = document.getElementById('side_func');
        if (!sideFunc) {
            console.log('ithome: side_func element not found');
            return;
        }

        const rankBtn = document.createElement('a');
        rankBtn.className = 'sfa rank';
        rankBtn.href = 'javascript:;';
        rankBtn.title = '热榜';
        rankBtn.textContent = '热榜';

        const tabs = rank.querySelectorAll('.bar li');
        const lists = rank.querySelectorAll('.bd');
        console.log('ithome: tabs count:', tabs.length, 'lists count:', lists.length);

        if (tabs.length === 0 || lists.length === 0) {
            console.log('ithome: rank content not loaded yet, retrying...');
            setTimeout(initRankPanel, 500);
            return;
        }

        let tabsHtml = '<ul class="ithome-rank-tabs">';
        tabs.forEach((tab, index) => {
            const active = tab.classList.contains('sel') ? ' active' : '';
            tabsHtml += `<li class="ithome-rank-tab${active}" data-index="${index}">${tab.textContent.trim()}</li>`;
        });
        tabsHtml += '</ul>';

        let listsHtml = '<div class="ithome-rank-lists">';
        let totalItems = 0;
        lists.forEach((list, index) => {
            const active = list.classList.contains('sel') ? ' active' : '';
            listsHtml += `<ul class="ithome-rank-list${active}" data-index="${index}">`;
            const items = list.querySelectorAll('li');
                    items.forEach((item, idx) => {
                        const link = item.querySelector('a');
                        if (link) {
                            const rank = idx + 1;
                            let numClass = 'normal';
                            if (rank === 1) numClass = 'top1';
                            else if (rank === 2) numClass = 'top2';
                            else if (rank === 3) numClass = 'top3';
                            listsHtml += `<li class="ithome-rank-item"><span class="ithome-rank-num ${numClass}">${rank}</span><a href="${link.href}" target="${link.target}" title="${link.title}">${link.textContent.trim()}</a></li>`;
                            totalItems++;
                        }
                    });
            listsHtml += '</ul>';
        });
        listsHtml += '</div>';

        console.log('ithome: total items extracted:', totalItems);
        console.log('ithome: tabsHtml length:', tabsHtml.length, 'listsHtml length:', listsHtml.length);

        const panel = document.createElement('div');
        panel.id = 'ithome-rank-panel';
        panel.className = 'ithome-rank-panel';
        panel.innerHTML = `
            <div class="ithome-rank-panel-header">
                <h3>🔥 热榜</h3>
                <button class="ithome-rank-panel-close">&times;</button>
            </div>
            <div class="ithome-rank-panel-content">${tabsHtml}${listsHtml}</div>
        `;

        const mask = document.createElement('div');
        mask.id = 'ithome-rank-mask';
        mask.className = 'ithome-rank-mask';

        const togglePanel = () => {
            panel.classList.toggle('show');
            mask.classList.toggle('show');
        };

        rankBtn.addEventListener('click', togglePanel);
        panel.querySelector('.ithome-rank-panel-close').addEventListener('click', togglePanel);
        mask.addEventListener('click', togglePanel);

        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && panel.classList.contains('show')) {
                togglePanel();
            }
        });

        const rankTabs = panel.querySelectorAll('.ithome-rank-tab');
        const rankLists = panel.querySelectorAll('.ithome-rank-list');
        rankTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const index = parseInt(tab.dataset.index);
                rankTabs.forEach(t => t.classList.remove('active'));
                rankLists.forEach(l => l.classList.remove('active'));
                tab.classList.add('active');
                rankLists[index]?.classList.add('active');
            });
        });

        sideFunc.insertBefore(rankBtn, sideFunc.querySelector('.sfa.comment'));
        document.body.appendChild(panel);
        document.body.appendChild(mask);

        rank.remove();
    };

    const showOverlay = url => {
        let overlay = document.getElementById('ithome-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ithome-overlay';
            overlay.className = 'ithome-overlay';
            overlay.innerHTML = '<button class="ithome-overlay-close">&times;</button><img>';
            overlay.querySelector('button').onclick = () => overlay.classList.remove('show');
            overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('show'); };
            document.body.appendChild(overlay);
        }
        overlay.querySelector('img').src = url;
        overlay.classList.add('show');
    };

    const replacePlaceholders = () => {
        const placeholders = document.querySelectorAll('.img-placeholder:not([data-unlocked])');
        for (const span of placeholders) {
            const encodedUrl = span.getAttribute('data-s');
            if (!encodedUrl) continue;
            
            const imgUrl = decodeImageUrl(encodedUrl);
            if (!imgUrl || !/^https?:\/\//i.test(imgUrl)) continue;
            
            span.setAttribute('data-unlocked', '1');
            
            const img = document.createElement('img');
            img.src = imgUrl;
            img.style.cssText = 'max-height:180px;width:auto;border-radius:8px;margin:8px 0;cursor:zoom-in;display:block;';
            img.onclick = () => showOverlay(imgUrl);
            img.onerror = () => { img.src = ''; img.alt = '图片加载失败'; img.style.display = 'none'; };
            
            const parent = span.parentNode;
            parent.replaceChild(img, span);
            parent.removeAttribute('onclick');
            parent.removeAttribute('onmouseover');
            parent.removeAttribute('onmouseout');
        }
    };

    const hasPlaceholder = node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        if (node.matches('.img-placeholder')) return true;
        return !!node.querySelector('.img-placeholder');
    };

    let debounceTimer = null;
    const debouncedReplace = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(replacePlaceholders, 100);
    };

    const initLayout = () => {
        removeAds();
        cleanSideFunc();
        expandFeed();
        initRankPanel();
    };

    const pollLayout = () => {
        if (document.getElementById('rank') && document.getElementById('side_func')) {
            initLayout();
            return;
        }
        setTimeout(pollLayout, 200);
    };

    const init = () => {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', init);
            return;
        }

        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') document.getElementById('ithome-overlay')?.classList.remove('show');
        });

        pollLayout();

        replacePlaceholders();
        setTimeout(replacePlaceholders, 500);
        setTimeout(replacePlaceholders, 1500);

        new MutationObserver(mutations => {
            for (const m of mutations) {
                if (Array.from(m.addedNodes).some(hasPlaceholder)) {
                    debouncedReplace();
                    break;
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    };

    init();
})();