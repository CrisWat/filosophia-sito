/* FILOsophia — interazioni di base: menu mobile, header, reveal on scroll. */
(function () {
    'use strict';

    // ---- Menu mobile ------------------------------------------------
    var toggle = document.querySelector('.menu-toggle');
    var links = document.getElementById('site-navigation');

    if (toggle && links) {
        toggle.addEventListener('click', function () {
            var open = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
            document.body.style.overflow = open ? 'hidden' : '';
        });

        links.addEventListener('click', function (e) {
            if (e.target.tagName === 'A' && links.classList.contains('open')) {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && links.classList.contains('open')) {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                toggle.focus();
            }
        });
    }

    // ---- Bordo dell'header allo scroll ------------------------------
    var header = document.getElementById('site-header');
    if (header) {
        var onScroll = function () {
            header.classList.toggle('scrolled', window.scrollY > 8);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ---- Reveal on scroll -------------------------------------------
    var revealables = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
        revealables.forEach(function (el) { el.classList.add('visible'); });
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry, i) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var delay = parseFloat(el.dataset.delay || 0) + i * 0.06;
            el.style.transitionDelay = delay + 's';
            el.classList.add('visible');
            observer.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealables.forEach(function (el) { observer.observe(el); });
})();
