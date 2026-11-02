/* FILOsophia — "il filo": nastro animato disegnato nell'hero.
   Discreto per scelta: è una firma, non un effetto speciale. */
(function () {
    'use strict';

    var canvas = document.getElementById('filo');
    if (!canvas) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    // Su telefono il canvas si sposta dentro .hero-visual: i fili passano
    // solo dietro la foto ad arco e non attraversano testo e pulsanti.
    var casa = canvas.parentNode, dopo = canvas.nextSibling;
    var visual = document.querySelector('.hero .hero-visual');
    var mobile = window.matchMedia ? window.matchMedia('(max-width: 860px)') : { matches: false };
    function colloca() {
        if (mobile.matches && visual) {
            if (canvas.parentNode !== visual) visual.insertBefore(canvas, visual.firstChild);
        } else if (canvas.parentNode !== casa) {
            casa.insertBefore(canvas, dopo);
        }
    }
    colloca();

    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1;
    var t = 0;
    var raf = null;

    // Ogni filo ha una propria ampiezza, frequenza e velocità.
    var threads = [
        { y: 0.30, amp: 0.085, freq: 1.5, speed: 0.00042, width: 1.1, alpha: 0.55 },
        { y: 0.46, amp: 0.115, freq: 1.1, speed: 0.00031, width: 1.5, alpha: 0.75 },
        { y: 0.63, amp: 0.070, freq: 1.9, speed: 0.00052, width: 0.9, alpha: 0.40 }
    ];

    function resize() {
        var rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = rect.width;
        h = rect.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawThread(cfg, time) {
        var steps = 90;
        var baseY = h * cfg.y;
        var amp = h * cfg.amp;
        var phase = time * cfg.speed;

        ctx.beginPath();
        for (var i = 0; i <= steps; i++) {
            var p = i / steps;
            var x = p * w;
            // Attenuazione ai bordi: il filo "nasce" e "svanisce".
            // Su telefono il filo si vede solo ai lati della cupola:
            // lì deve ondeggiare ancora, quindi l'attenuazione è più morbida.
            var envelope = mobile.matches ? 0.45 + 0.55 * Math.sin(Math.PI * p) : Math.sin(Math.PI * p);
            var y = baseY
                + Math.sin(p * Math.PI * 2 * cfg.freq + phase) * amp * envelope
                + Math.sin(p * Math.PI * 2 * cfg.freq * 2.3 + phase * 1.7) * amp * 0.18 * envelope;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }

        var grad = ctx.createLinearGradient(0, 0, w, 0);
        if (mobile.matches) {
            grad.addColorStop(0.00, 'rgba(169, 129, 74, ' + cfg.alpha * 0.3 + ')');
            grad.addColorStop(0.18, 'rgba(169, 129, 74, ' + cfg.alpha + ')');
            grad.addColorStop(0.82, 'rgba(107, 42, 39, ' + cfg.alpha * 0.8 + ')');
            grad.addColorStop(1.00, 'rgba(107, 42, 39, ' + cfg.alpha * 0.3 + ')');
        } else {
            grad.addColorStop(0.00, 'rgba(216, 191, 148, 0)');
            grad.addColorStop(0.25, 'rgba(169, 129, 74, ' + cfg.alpha + ')');
            grad.addColorStop(0.60, 'rgba(107, 42, 39, ' + cfg.alpha * 0.75 + ')');
            grad.addColorStop(1.00, 'rgba(110, 115, 80, 0)');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = mobile.matches ? cfg.width * 0.8 : cfg.width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function frame(now) {
        t = now || 0;
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < threads.length; i++) {
            drawThread(threads[i], t);
        }
        raf = requestAnimationFrame(frame);
    }

    function start() {
        colloca();
        resize();
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(start, 180);
    });

    // Sospende l'animazione quando l'hero non è più visibile.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    if (!raf) raf = requestAnimationFrame(frame);
                } else if (raf) {
                    cancelAnimationFrame(raf);
                    raf = null;
                }
            });
        }, { threshold: 0 }).observe(canvas);
    }

    start();
})();
