/* ============================================================
 * 墨韵 · 主题交互脚本
 *
 * 与 TemplateEngine 内联脚本的分工：
 * - 内联脚本（[FALLBACK] 标记）：阅读进度条 / 回到顶部（性能优化的 rAF + transform 方案）
 * - custom.js（本文件）：图片放大 / 代码块复制 / TOC 高亮 / 标题锚点 / 导航高亮
 *
 * 优先级：内联脚本已处理的功能，custom.js 不重复绑定，避免进度条抖动。
 * 标记约定：custom.js 处理元素时会在元素上打上 data-gridea-handled 标记；
 *          内联脚本已处理的元素会被标记为 "inline"，custom.js 检测到后跳过。
 * ============================================================ */
(function() {
    'use strict';

    // ===== 工具：节流（每帧最多触发一次）=====
    function rafThrottle(fn) {
        var ticking = false;
        return function() {
            var args = arguments, ctx = this;
            if (!ticking) {
                requestAnimationFrame(function() { fn.apply(ctx, args); ticking = false; });
                ticking = true;
            }
        };
    }

    // ===== 1. 阅读进度条（备用）=====
    // 仅当 TemplateEngine 内联脚本未注入时执行
    (function readingProgress() {
        var bar = document.getElementById('reading-progress');
        if (!bar) return;
        // 已被内联脚本接管（用了 transform 方案）
        if (bar.dataset.grideaInline === '1') return;
        // 自行接管
        bar.dataset.grideaHandled = '1';

        var onScroll = rafThrottle(function() {
            var doc = document.documentElement;
            var scrollTop = window.scrollY || doc.scrollTop || document.body.scrollTop;
            var scrollHeight = doc.scrollHeight - doc.clientHeight;
            var percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            bar.style.width = Math.max(0, Math.min(100, percent)) + '%';
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();
    })();

    // ===== 2. 回到顶部（备用）=====
    (function backToTop() {
        var btn = document.getElementById('back-to-top');
        if (!btn) return;
        if (btn.dataset.grideaInline === '1') return;
        btn.dataset.grideaHandled = '1';

        var onScroll = rafThrottle(function() {
            if (window.scrollY > 400) btn.classList.add('visible');
            else btn.classList.remove('visible');
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        btn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    })();

    // ===== 3. 图片放大（点击 post-content / post-feature 中图片）=====
    (function imageZoom() {
        var overlay = document.getElementById('image-zoom-overlay');
        var zoomImg = document.getElementById('image-zoom-img');
        if (!overlay || !zoomImg) return;
        if (overlay.dataset.grideaInline === '1') return;  // 内联脚本已接管
        overlay.dataset.grideaHandled = '1';

        function open(src, alt) {
            zoomImg.src = src;
            zoomImg.alt = alt || '';
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
        function close() {
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
            zoomImg.src = '';
            document.body.style.overflow = '';
        }

        document.querySelectorAll('.post-content img, .post-feature img').forEach(function(img) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                open(img.src, img.alt);
            });
        });
        overlay.addEventListener('click', close);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) close();
        });
    })();

    // ===== 4. 代码块复制按钮 =====
    (function codeCopy() {
        document.querySelectorAll('.post-content pre').forEach(function(pre) {
            if (pre.querySelector('.code-copy-btn')) return;  // 内联脚本已添加
            var btn = document.createElement('button');
            btn.className = 'code-copy-btn';
            btn.type = 'button';
            btn.textContent = '复制';
            btn.setAttribute('aria-label', '复制代码');
            pre.appendChild(btn);

            btn.addEventListener('click', function() {
                var code = pre.querySelector('code');
                var text = code ? code.innerText : pre.innerText;
                var done = function() {
                    btn.textContent = '已复制';
                    btn.classList.add('copied');
                    setTimeout(function() {
                        btn.textContent = '复制';
                        btn.classList.remove('copied');
                    }, 2000);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function() { fallback(text); done(); });
                } else {
                    fallback(text); done();
                }
            });
        });

        function fallback(text) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
        }
    })();

    // ===== 5. TOC 高亮（当前阅读章节高亮）=====
    (function tocHighlight() {
        var tocLinks = document.querySelectorAll('.post-toc a[href^="#"]');
        if (tocLinks.length === 0) return;

        var headingMap = {};
        tocLinks.forEach(function(link) {
            var id = decodeURIComponent(link.getAttribute('href').replace('#', ''));
            var target = document.getElementById(id);
            if (target) headingMap[id] = link;
        });

        var headings = Object.keys(headingMap).map(function(id) { return document.getElementById(id); }).filter(Boolean);
        if (headings.length === 0) return;

        var activeId = null;
        var onScroll = rafThrottle(function() {
            var scrollY = window.scrollY + 120;
            var current = headings[0].id;
            for (var i = 0; i < headings.length; i++) {
                if (headings[i].offsetTop <= scrollY) current = headings[i].id;
                else break;
            }
            if (current !== activeId) {
                if (activeId && headingMap[activeId]) headingMap[activeId].classList.remove('active');
                if (current && headingMap[current]) {
                    headingMap[current].classList.add('active');
                    try { headingMap[current].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
                }
                activeId = current;
            }
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    })();

    // ===== 6. 标题锚点（hover 标题显示 # 锚点）=====
    (function headerAnchors() {
        document.querySelectorAll('.post-content h1, .post-content h2, .post-content h3, .post-content h4').forEach(function(h) {
            if (!h.id) return;
            if (h.querySelector('.header-anchor')) return;
            var a = document.createElement('a');
            a.className = 'header-anchor';
            a.href = '#' + h.id;
            a.textContent = '#';
            a.setAttribute('aria-label', '链接到本节');
            h.appendChild(a);
        });
    })();

    // ===== 7. 当前导航高亮（基于 location.pathname）=====
    (function navHighlight() {
        var navLinks = document.querySelectorAll('.site-nav a');
        if (navLinks.length === 0) return;
        var current = window.location.pathname.replace(/\/index\.html$/i, '/').toLowerCase();
        navLinks.forEach(function(link) {
            try {
                var href = link.getAttribute('href');
                if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
                var url = new URL(href, window.location.origin);
                var linkPath = url.pathname.replace(/\/index\.html$/i, '/').toLowerCase();
                if (linkPath === current || (linkPath !== '/' && current.indexOf(linkPath) === 0)) {
                    link.classList.add('active');
                }
            } catch (e) {}
        });
    })();
})();
