(function() {
    'use strict';

    // ===== Back to Top =====
    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        var toggleBtn = function() {
            if (window.pageYOffset > 400) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        };
        window.addEventListener('scroll', toggleBtn, { passive: true });
        backToTop.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== Reading Progress =====
    var progress = document.getElementById('reading-progress');
    if (progress) {
        var updateProgress = function() {
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var scrolled = window.pageYOffset;
            var percent = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
            progress.style.width = Math.min(percent, 100) + '%';
        };
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress);
        updateProgress();
    }

    // ===== Image Zoom =====
    var zoomOverlay = document.getElementById('image-zoom-overlay');
    var zoomImg = document.getElementById('image-zoom-img');
    if (zoomOverlay && zoomImg) {
        var zoomableSelector = '.post-content img, .post-card-abstract img, .post-feature img';
        document.querySelectorAll(zoomableSelector).forEach(function(img) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function(e) {
                e.preventDefault();
                zoomImg.src = img.src;
                zoomOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });
        var closeZoom = function() {
            zoomOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        zoomOverlay.addEventListener('click', closeZoom);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.keyCode === 27) closeZoom();
        });
    }

    // ===== TOC Highlight =====
    var tocLinks = document.querySelectorAll('.post-toc a');
    var headings = [];
    if (tocLinks.length) {
        tocLinks.forEach(function(link) {
            var anchor = link.getAttribute('href');
            if (anchor && anchor.indexOf('#') === 0) {
                var target = document.getElementById(anchor.slice(1));
                if (target) headings.push({ link: link, target: target });
            }
        });
    }
    if (headings.length) {
        var highlightToc = function() {
            var scrollY = window.pageYOffset;
            var current = null;
            headings.forEach(function(item) {
                if (item.target.offsetTop - 120 <= scrollY) current = item;
            });
            headings.forEach(function(item) {
                item.link.classList.remove('active');
            });
            if (current) current.link.classList.add('active');
        };
        window.addEventListener('scroll', highlightToc, { passive: true });
        highlightToc();
    }

    // ===== Nav Active State =====
    var currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(function(link) {
        var href = link.getAttribute('href');
        if (href && (href === currentPath || (currentPath.indexOf(href) === 0 && href !== '/'))) {
            link.classList.add('active');
        }
    });

    // ===== Smooth Anchor Scroll =====
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = anchor.getAttribute('href');
            if (href.length > 1) {
                var target = document.getElementById(href.slice(1));
                if (target) {
                    e.preventDefault();
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ===== Paper 风格交互: 卡片 hover 立体偏移 (CSS 已实现,此处增强触屏) =====
    if ('ontouchstart' in window) {
        document.querySelectorAll('.post-card, .friend-link-card, .read-more').forEach(function(el) {
            el.addEventListener('touchstart', function() {}, { passive: true });
        });
    }

})();
