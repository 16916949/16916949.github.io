/* Fly Theme — skin switching + nav toggle + analytics + social links */
(function () {
  // Apply skin class based on config value
  var skin = "white";
  document.body.classList.add("skin-" + skin);

  // Google Analytics injection
  var gaId = '';
  if (gaId && gaId.indexOf('{{') === -1 && gaId.trim() !== '') {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
    document.head.appendChild(gaScript);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', gaId);
  }

  // Custom CSS injection
  var customCss = '';
  if (customCss && customCss.indexOf('{{') === -1 && customCss.trim() !== '') {
    var style = document.createElement('style');
    style.textContent = customCss;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Navigation toggle
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        toggle.classList.toggle("active");
        links.classList.toggle("open");
      });
    }

    // Social links rendering
    var socials = {
      github: '', twitter: '', weibo: '',
      zhihu: '', facebook: ''
    };
    var socialContainer = document.createElement('div');
    socialContainer.className = 'social-links';
    var hasAny = false;
    for (var key in socials) {
      var url = socials[key];
      if (url && url.indexOf('{{') === -1 && url.trim() !== '') {
        hasAny = true;
        var a = document.createElement('a');
        a.href = url;
        a.className = 'social-link social-' + key;
        a.target = '_blank';
        a.title = key;
        a.textContent = key;
        socialContainer.appendChild(a);
      }
    }
    if (hasAny) {
      var brand = document.querySelector('.site-brand') || document.querySelector('.site-header .container');
      if (brand) brand.appendChild(socialContainer);
    }
  });
})();
