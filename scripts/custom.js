/**
 * NexT 主题 JavaScript
 *
 * 从 NexT 主题的 source/js/ 提取的核心交互逻辑：
 * - 侧边栏切换
 * - 返回顶部
 * - 菜单切换（移动端）
 * - 代码块复制按钮
 * - 图片懒加载
 */

(function () {
  'use strict';

  // ===== 侧边栏切换 =====
  var sidebarToggle = document.querySelector('.sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar-active');
      sidebarToggle.classList.toggle('sidebar-toggle-active');
    });
  }

  // ===== 返回顶部 =====
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    backToTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      var percent = Math.round((scrollTop / scrollHeight) * 100);
      var span = backToTop.querySelector('span');
      if (span) {
        span.textContent = Math.min(100, percent) + '%';
      }
      if (scrollTop > 100) {
        backToTop.classList.add('back-to-top-on');
      } else {
        backToTop.classList.remove('back-to-top-on');
      }
    });
  }

  // ===== 移动端菜单切换 =====
  var navToggle = document.querySelector('.site-nav-toggle .toggle');
  var siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      siteNav.classList.toggle('site-nav-active');
      navToggle.classList.toggle('toggle-active');
    });
  }

  // ===== 侧边栏 TOC / 概览 切换 =====
  var tocTab = document.querySelector('.sidebar-nav-toc');
  var overviewTab = document.querySelector('.sidebar-nav-overview');
  var sidebarInner = document.querySelector('.sidebar-inner');
  if (tocTab && overviewTab && sidebarInner) {
    tocTab.addEventListener('click', function () {
      sidebarInner.classList.remove('sidebar-overview-active');
      sidebarInner.classList.add('sidebar-nav-active', 'sidebar-toc-active');
    });
    overviewTab.addEventListener('click', function () {
      sidebarInner.classList.remove('sidebar-nav-active', 'sidebar-toc-active');
      sidebarInner.classList.add('sidebar-overview-active');
    });
  }

  // ===== 代码块复制按钮 =====
  var codeBlocks = document.querySelectorAll('figure.highlight, pre code');
  codeBlocks.forEach(function (block) {
    var figure = block.closest('figure.highlight') || block.closest('pre');
    if (!figure) return;

    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = '复制';
    btn.style.cssText = 'position:absolute;top:5px;right:5px;padding:2px 8px;font-size:12px;cursor:pointer;opacity:0;transition:opacity 0.2s;';

    figure.style.position = 'relative';
    figure.appendChild(btn);

    figure.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    figure.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });

    btn.addEventListener('click', function () {
      var code = figure.querySelector('td.code, code');
      if (code) {
        var text = code.textContent;
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          btn.textContent = '已复制';
          setTimeout(function () { btn.textContent = '复制'; }, 2000);
        } catch (e) {}
        document.body.removeChild(textarea);
      }
    });
  });

  // ===== 动画效果（Animate.css 配合）=====
  var animatedElements = document.querySelectorAll('.animated');
  if (animatedElements.length > 0 && typeof IntersectionObserver !== 'undefined') {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('fadeIn');
          observer.unobserve(entry.target);
        }
      });
    });
    animatedElements.forEach(function (el) { observer.observe(el); });
  }

  // ===== 链接外部打开 =====
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    a.setAttribute('rel', 'noopener');
  });

})();
