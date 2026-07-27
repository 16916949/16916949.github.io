/* ============================================================
 * Sakura Iro · 樱色主题 - 交互脚本
 * 灵感源自 Sakurairo (https://github.com/mirai-mamori/Sakurairo)
 *
 * 职责分工(与 APP 内联脚本错开):
 * - APP 内联脚本(主):代码块复制按钮 / 阅读进度条 / 回到顶部 / 图片放大
 *   已对相关元素打上 data-gridea-inline="1" 标记
 * - custom.js(本文件):TOC 高亮 / 标题锚点 / 当前导航高亮 /
 *   卡片滑入动画 / 入场模糊开关 / 卡片滑入开关 / 滚动头部隐显
 *
 * 编写约束:
 * - 必须 IIFE 包装,不污染全局作用域
 * - 不使用 ES6+ 可选链 / 空值合并(旧 WebView 不支持),用 && / || 替代
 * - 不依赖外部库,不加载 CDN
 * - 不修改 window.__grideaPreviewInjected / 不调用 window.GrideaPreview.*
 * ============================================================ */
(function() {
    'use strict';

    /* === rAF 节流工具 === */
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

    /* === 读取 CSS 变量值 ===
     * 从 :root 读取 --entry-blur / --card-slide-in 的值
     * APP 在渲染时已将 theme.json 的开关值替换进 CSS 占位符
     * 值可能为字符串 "true"/"false" 或裸 true/false
     */
    function readCssVar(name) {
        var root = document.documentElement;
        var v = getComputedStyle(root).getPropertyValue(name);
        return (v || '').trim();
    }

    function isFlagOn(value) {
        if (value === null || value === undefined) return true;
        var s = String(value).toLowerCase().trim();
        return s === 'true' || s === '1' || s === '';
    }

    /* === 1. 特效开关:把布尔值反映到 html 类名 ===
     * CSS 已为 html.no-entry-blur / html.no-card-slide 提供 fallback 样式
     * 这里只在用户配置为 false 时打上关闭类
     */
    function applyEffectToggles() {
        var entryBlur = readCssVar('--entry-blur');
        var cardSlideIn = readCssVar('--card-slide-in');

        // 显式为 "false" 才关闭,空值按默认开启处理
        if (entryBlur && !isFlagOn(entryBlur)) {
            document.documentElement.classList.add('no-entry-blur');
        }
        if (cardSlideIn && !isFlagOn(cardSlideIn)) {
            document.documentElement.classList.add('no-card-slide');
        }
    }

    /* === 2. 卡片滑入动画 ===
     * 使用 IntersectionObserver 监听 .post-card 进入视口
     * 进入后添加 .post-card-show 触发 CSS @keyframes homepage-load-animation
     * 不支持 IntersectionObserver 时降级为直接显示
     */
    function setupCardSlideIn() {
        var cards = document.querySelectorAll('.post-card');
        if (!cards || !cards.length) return;

        // 已通过 html.no-card-slide 关闭:CSS 中已强制 opacity:1
        if (document.documentElement.classList.contains('no-card-slide')) {
            cards.forEach(function(card) {
                card.classList.add('post-card-show');
            });
            return;
        }

        if (!('IntersectionObserver' in window)) {
            // 旧 WebView 降级:延迟 50ms 后逐张显示
            cards.forEach(function(card, i) {
                setTimeout(function() {
                    card.classList.add('post-card-show');
                }, 60 + i * 80);
            });
            return;
        }

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var card = entry.target;
                    // 延迟由 CSS animation-delay 控制,这里只触发显示
                    card.classList.add('post-card-show');
                    observer.unobserve(card);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -10% 0px',  // 提前 10% 触发
            threshold: 0.1
        });

        // 给每张卡片设置不同的 animation-delay 形成瀑布感
        cards.forEach(function(card, i) {
            card.style.animationDelay = (i * 80) + 'ms';
            observer.observe(card);
        });
    }

    /* === 3. 标题锚点 ===
     * 为 .post-content 中的 h1-h4 自动追加 # 锚点链接
     * 跳过没有 id 的标题(避免破坏锚点逻辑)
     * CSS 控制 .header-anchor 默认隐藏,hover 标题时显示
     */
    function addHeaderAnchors() {
        var headers = document.querySelectorAll(
            '.post-content h1[id], .post-content h2[id], .post-content h3[id], .post-content h4[id]'
        );
        if (!headers || !headers.length) return;

        headers.forEach(function(h) {
            if (h.querySelector('.header-anchor')) return;  // 已添加
            var anchor = document.createElement('a');
            anchor.className = 'header-anchor';
            anchor.href = '#' + h.id;
            anchor.textContent = '#';
            anchor.title = '永久链接';
            anchor.setAttribute('aria-label', '永久链接至 ' + (h.textContent || '').trim());
            h.appendChild(anchor);
        });
    }

    /* === 4. TOC 高亮 ===
     * 监听滚动,根据当前可视区域中的标题切换 .post-toc a.active
     * 仅在文章详情页且有 TOC 时生效
     */
    function setupTocHighlight() {
        var tocLinks = document.querySelectorAll('.post-toc a[href^="#"]');
        if (!tocLinks || !tocLinks.length) return;

        var headings = [];
        tocLinks.forEach(function(link) {
            var id = link.getAttribute('href').slice(1);
            if (!id) return;
            var h = document.getElementById(id);
            if (h) headings.push({ element: h, link: link });
        });
        if (!headings.length) return;

        var tocEl = document.querySelector('.post-toc');
        // 内联脚本若已设置 data-gridea-inline 则跳过(防止冲突)
        if (tocEl && tocEl.dataset.grideaInline === '1') return;

        function update() {
            var scrollY = (window.scrollY || document.documentElement.scrollTop) + 140;
            var current = null;
            for (var i = 0; i < headings.length; i++) {
                if (headings[i].element.offsetTop <= scrollY) current = headings[i];
            }
            tocLinks.forEach(function(l) { l.classList.remove('active'); });
            if (current) {
                current.link.classList.add('active');
                // 让当前 TOC 项在 TOC 容器内可见(scrollIntoView nearest)
                try {
                    current.link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                } catch (e) {
                    // 旧 WebView 不支持 scrollIntoView options
                }
            }
        }

        window.addEventListener('scroll', rafThrottle(update), { passive: true });
        window.addEventListener('resize', rafThrottle(update), { passive: true });
        update();
    }

    /* === 5. 当前导航高亮 ===
     * 基于 location.pathname 匹配 .site-nav a 的 href
     * 匹配规则:完全相等 或 当前路径以 nav href 为前缀(去掉尾部斜杠)
     */
    function highlightNav() {
        var path = location.pathname.replace(/\/+$/, '');
        var navLinks = document.querySelectorAll('.site-nav a');
        if (!navLinks || !navLinks.length) return;

        // 首页特殊处理:根路径
        var isHome = path === '' || path === '/';

        navLinks.forEach(function(link) {
            var href = (link.getAttribute('href') || '').replace(/\/+$/, '');
            if (!href) return;

            // 首页 nav(指向 ./ 或根)单独判定
            if (isHome && (href === '' || href === '.' || href === '/')) {
                link.classList.add('active');
                return;
            }

            if (path === href || (href !== '' && path.indexOf(href + '/') === 0)) {
                link.classList.add('active');
            }
        });
    }

    /* === 6. 平滑锚点滚动 ===
     * 拦截 .post-toc a[href^="#"] 和 .header-anchor 的点击
     * 用 scrollIntoView({ behavior: 'smooth' }) 实现平滑滚动
     * 旧 WebView 不支持 options 时降级为原生锚点跳转
     */
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
                e.preventDefault();
                try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (err) {
                    // 降级:原生 hash 跳转
                    location.hash = id;
                }
                // 更新 URL hash(不触发跳转)
                if (history.replaceState) {
                    history.replaceState(null, '', '#' + id);
                }
            });
        });
    }

    /* === 7. 滚动时头部隐显(可选轻交互)===
     * 向下滚动时隐藏 .site-header,向上滚动或回到顶部时显示
     * 受 prefers-reduced-motion 影响:用户偏好减少动效则跳过
     */
    function setupHeaderAutoHide() {
        var reduceMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        var header = document.querySelector('.site-header');
        if (!header) return;
        if (header.dataset.grideaHandled === '1') return;
        header.dataset.grideaHandled = '1';

        var lastY = 0;
        var ticking = false;

        function update() {
            var y = window.scrollY || document.documentElement.scrollTop;
            // 顶部 100px 内始终显示
            if (y < 100) {
                header.style.transform = '';
                lastY = y;
                ticking = false;
                return;
            }
            // 向下滚动:隐藏
            if (y > lastY + 8) {
                header.style.transform = 'translateY(-100%)';
            }
            // 向上滚动:显示
            else if (y < lastY - 8) {
                header.style.transform = '';
            }
            lastY = y;
            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
    }

    /* === 8. 友链卡片悬停时头像轻微旋转(招牌细节)=== */
    function setupFriendLinkHover() {
        var cards = document.querySelectorAll('.friend-link-card');
        if (!cards || !cards.length) return;
        var reduceMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        cards.forEach(function(card) {
            var avatar = card.querySelector('.friend-link-avatar');
            if (!avatar) return;
            card.addEventListener('mouseenter', function() {
                avatar.style.transform = 'rotate(360deg) scale(1.1)';
            });
            card.addEventListener('mouseleave', function() {
                avatar.style.transform = '';
            });
        });
    }

    /* === 9. 回到顶部按钮(备用接管)===
     * 内联脚本仅注入到文章详情页,首页/归档/标签等其他页面需要 custom.js 接管
     * 已被内联脚本接管的元素会带 data-gridea-inline="1" 标记,这里跳过避免重复
     */
    function setupBackToTop() {
        var btn = document.getElementById('back-to-top');
        if (!btn) return;
        if (btn.dataset.grideaInline === '1') return;  // 文章详情页已被内联脚本接管
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

    /* === 10. 阅读进度条(备用接管)===
     * 与 #back-to-top 同理,仅在非文章详情页接管
     * 用 transform: scaleX() 触发 GPU 合成层,避免 width 触发重排
     */
    function setupReadingProgress() {
        var bar = document.getElementById('reading-progress');
        if (!bar) return;
        if (bar.dataset.grideaInline === '1') return;
        if (bar.dataset.grideaHandled === '1') return;
        bar.dataset.grideaHandled = '1';

        var cachedScrollHeight = document.documentElement.scrollHeight;
        var cachedClientHeight = document.documentElement.clientHeight;
        var lastPercent = -1;

        function recalc() {
            cachedScrollHeight = document.documentElement.scrollHeight;
            cachedClientHeight = document.documentElement.clientHeight;
            lastPercent = -1;
        }

        function update() {
            var y = window.scrollY || document.documentElement.scrollTop;
            var range = cachedScrollHeight - cachedClientHeight;
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
            resizeTimer = setTimeout(function() {
                recalc();
                update();
            }, 200);
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
        setupCardSlideIn();
        setupHeaderAutoHide();
        setupFriendLinkHover();
        setupBackToTop();
        setupReadingProgress();
    }

    /* === 用户自定义 JS（Layer 1 注入点） ===
     * 由 theme.json 中 customJs textarea 配置项注入
     * 在 IIFE 内部执行,可访问本主题闭包变量,但不污染全局作用域
     */
    {{customJs}}

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
