/* ============================================================
 * Next · 复刻主题交互脚本
 *
 * 职责分工(与 APP 内联脚本错开):
 * - APP 内联脚本(主):代码块复制 / 阅读进度 / 回到顶部 / 图片放大
 * - custom.js(本文件):TOC 高亮 / 标题锚点 / 导航高亮 / 卡片淡入 /
 *   Post-eof 视觉(纯 CSS 实现,JS 不参与)
 *
 * Next 原版交互风格:
 * - TOC 展开/折叠(.expanded/.closed)
 * - 文章标题 hover 下划线 scaleX(纯 CSS)
 * - 卡片入场 opacity 0→1(无位移,Next 原版风格)
 * - nav-active 切换
 * ============================================================ */
(function() {
    'use strict';

    function rafThrottle(fn) {
        var ticking = false;
        return function() {
            var ctx = this;
            var args = arguments;
            if (!ticking) {
                requestAnimationFrame(function() {
                    fn.apply(ctx, args);
                    ticking = false;
                });
                ticking = true;
            }
        };
    }

    function readCssVar(name) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name);
        return (v || '').trim();
    }

    function isFlagOn(value) {
        if (value === null || value === undefined) return true;
        var s = String(value).toLowerCase().trim();
        return s === 'true' || s === '1' || s === '';
    }

    /* === 1. 特效开关:entryBlur / cardSlideIn 关闭时移除动画类 === */
    function applyEffectToggles() {
        var entryBlur = readCssVar('--entry-blur');
        var cardSlideIn = readCssVar('--card-slide-in');
        if (entryBlur && !isFlagOn(entryBlur)) {
            document.documentElement.classList.add('no-entry-blur');
        }
        if (cardSlideIn && !isFlagOn(cardSlideIn)) {
            document.documentElement.classList.add('no-card-slide');
        }
    }

    /* === 2. 卡片淡入(Next 原版风格:opacity 0→1,无位移)===
     * Next 原版 .post { opacity: 0 } 后由 JS 触发显示
     * 这里用 IntersectionObserver,不支持时降级 setTimeout
     */
    function setupCardFadeIn() {
        var cards = document.querySelectorAll('.post-card');
        if (!cards || !cards.length) return;

        if (document.documentElement.classList.contains('no-card-slide')) {
            cards.forEach(function(card) { card.classList.add('post-card-show'); });
            return;
        }

        if (!('IntersectionObserver' in window)) {
            cards.forEach(function(card, i) {
                setTimeout(function() {
                    card.classList.add('post-card-show');
                }, 80 + i * 60);
            });
            return;
        }

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('post-card-show');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        });

        cards.forEach(function(card, i) {
            card.style.animationDelay = (i * 80) + 'ms';
            observer.observe(card);
        });
    }

    /* === 3. 标题锚点 ===
     * 为 .post-content 中的 h1-h4 追加 # 永久链接
     * Next 原版无此功能,作为增强
     */
    function addHeaderAnchors() {
        var headers = document.querySelectorAll(
            '.post-content h1[id], .post-content h2[id], .post-content h3[id], .post-content h4[id]'
        );
        if (!headers || !headers.length) return;

        headers.forEach(function(h) {
            if (h.querySelector('.header-anchor')) return;
            var anchor = document.createElement('a');
            anchor.className = 'header-anchor';
            anchor.href = '#' + h.id;
            anchor.textContent = '#';
            anchor.title = '永久链接';
            anchor.setAttribute('aria-label', '永久链接至 ' + (h.textContent || '').trim());
            // Next 风格:锚点默认隐藏,hover 标题时显示
            anchor.style.cssText = 'opacity:0;margin-left:8px;color:var(--muted);text-decoration:none;border-bottom:none;transition:opacity 0.2s;';
            h.appendChild(anchor);
            h.addEventListener('mouseenter', function() { anchor.style.opacity = '1'; });
            h.addEventListener('mouseleave', function() { anchor.style.opacity = '0'; });
        });
    }

    /* === 4. TOC 高亮 + 展开/折叠(Next 风格)===
     * Next 原版 TOC 有 .expanded / .closed 状态,点击可折叠
     * 这里实现:点击父级 li 切换展开;滚动时高亮当前
     */
    function setupTocHighlight() {
        var toc = document.querySelector('.post-toc');
        if (!toc) return;
        if (toc.dataset.grideaInline === '1') return;

        var links = toc.querySelectorAll('a[href^="#"]');
        if (!links.length) return;

        var headings = [];
        links.forEach(function(link) {
            var id = link.getAttribute('href').slice(1);
            if (!id) return;
            var h = document.getElementById(id);
            if (h) headings.push({ element: h, link: link });
        });
        if (!headings.length) return;

        // Next 风格:点击 TOC 项切换子 ul 显示
        links.forEach(function(link) {
            var li = link.parentElement;
            var subUl = li.querySelector('ul');
            if (subUl) {
                li.classList.add('expanded');
                link.addEventListener('click', function(e) {
                    // 让默认锚点跳转生效,但同时切换展开状态
                    if (li.classList.contains('expanded')) {
                        li.classList.remove('expanded');
                        li.classList.add('closed');
                    } else {
                        li.classList.remove('closed');
                        li.classList.add('expanded');
                    }
                });
            }
        });

        // 滚动高亮
        function update() {
            var scrollY = (window.scrollY || document.documentElement.scrollTop) + 140;
            var current = null;
            for (var i = 0; i < headings.length; i++) {
                if (headings[i].element.offsetTop <= scrollY) current = headings[i];
            }
            links.forEach(function(l) { l.classList.remove('active'); });
            if (current) {
                current.link.classList.add('active');
                // 展开父级链路
                var parent = current.link.parentElement;
                while (parent && parent !== toc) {
                    if (parent.tagName === 'LI') {
                        parent.classList.remove('closed');
                        parent.classList.add('expanded');
                    }
                    parent = parent.parentElement;
                }
                try {
                    current.link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                } catch (e) {}
            }
        }
        window.addEventListener('scroll', rafThrottle(update), { passive: true });
        update();
    }

    /* === 5. 当前导航高亮 === */
    function highlightNav() {
        var path = location.pathname.replace(/\/+$/, '');
        var navLinks = document.querySelectorAll('.site-nav a');
        if (!navLinks || !navLinks.length) return;
        var isHome = path === '' || path === '/';

        navLinks.forEach(function(link) {
            var href = (link.getAttribute('href') || '').replace(/\/+$/, '');
            if (!href) return;
            if (isHome && (href === '' || href === '.' || href === '/')) {
                link.classList.add('active');
                return;
            }
            if (path === href || (href !== '' && path.indexOf(href + '/') === 0)) {
                link.classList.add('active');
            }
        });
    }

    /* === 6. 平滑锚点滚动 === */
    function setupSmoothAnchor() {
        var anchorLinks = document.querySelectorAll(
            '.post-toc a[href^="#"], .header-anchor'
        );
        if (!anchorLinks || !anchorLinks.length) return;

        anchorLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                var href = link.getAttribute('href') || '';
                if (!href || href === '#' || href.length < 2) return;
                var id = href.slice(1);
                var target = document.getElementById(id);
                if (!target) return;
                // TOC 链接的折叠逻辑由 setupTocHighlight 处理,这里只负责滚动
                if (!link.closest('.post-toc')) {
                    e.preventDefault();
                }
                try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (err) {
                    location.hash = id;
                }
                if (history.replaceState) {
                    history.replaceState(null, '', '#' + id);
                }
            });
        });
    }

    /* === 7. 回到顶部 + 阅读进度条(备用接管)===
     * 内联脚本只在文章详情页生效,其他页面由 custom.js 接管
     */
    function setupBackToTop() {
        var btn = document.getElementById('back-to-top');
        if (!btn) return;
        if (btn.dataset.grideaInline === '1') return;
        if (btn.dataset.grideaHandled === '1') return;
        btn.dataset.grideaHandled = '1';

        var onScroll = rafThrottle(function() {
            var y = window.scrollY || document.documentElement.scrollTop;
            if (y > 300) btn.classList.add('visible');
            else btn.classList.remove('visible');
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        btn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        onScroll();
    }

    function setupReadingProgress() {
        var bar = document.getElementById('reading-progress');
        if (!bar) return;
        if (bar.dataset.grideaInline === '1') return;
        if (bar.dataset.grideaHandled === '1') return;
        bar.dataset.grideaHandled = '1';

        var cachedH = document.documentElement.scrollHeight;
        var cachedC = document.documentElement.clientHeight;
        var lastPercent = -1;

        function recalc() {
            cachedH = document.documentElement.scrollHeight;
            cachedC = document.documentElement.clientHeight;
            lastPercent = -1;
        }
        function update() {
            var y = window.scrollY || document.documentElement.scrollTop;
            var range = cachedH - cachedC;
            var percent = range > 0 ? (y / range) : 0;
            var quantized = Math.round(percent * 200) / 200;
            if (quantized !== lastPercent) {
                lastPercent = quantized;
                bar.style.transform = 'scaleX(' + quantized + ')';
            }
        }
        window.addEventListener('scroll', rafThrottle(update), { passive: true });
        var resizeTimer = null;
        window.addEventListener('resize', function() {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() { recalc(); update(); }, 200);
        }, { passive: true });
        update();
    }

    /* === 主入口 === */
    function init() {
        applyEffectToggles();
        addHeaderAnchors();
        setupTocHighlight();
        highlightNav();
        setupSmoothAnchor();
        setupCardFadeIn();
        setupBackToTop();
        setupReadingProgress();
    }

    /* === 用户自定义 JS（Layer 1 注入点） ===
     * 由 theme.json 中 customJs textarea 配置项注入
     * 在 IIFE 内部执行,可访问本主题闭包变量,但不污染全局作用域
     */
    

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
