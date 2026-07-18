// ==UserScript==
// @name         IT之家·解锁登录图片
// @namespace    https://github.com/wsyqn6/userscripts
// @version      1.5
// @description  绕过登录限制，缩略图显示，点击放大预览
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