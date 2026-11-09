/* Filosophia — popup "Inaugurazione": lista inviti.
   Compare una volta, 3 secondi dopo l'arrivo o a metà pagina; chi lo chiude
   lo rivede dopo 3 giorni, chi si iscrive non lo rivede più. Si riapre dalla barra in
   alto. Il browser ricorda solo questa scelta (niente cookie); i dati del
   modulo vanno al gestionale e non restano nel browser. */
(function () {
    'use strict';

    var dlg = document.getElementById('invito');
    if (!dlg) return;

    var CHIAVE = 'filo-invito';
    var PAUSA_GIORNI = 3;
    var ENDPOINT = (dlg.dataset.endpoint || '').trim();
    var WHATSAPP = dlg.dataset.whatsapp || '';
    var ERRORI = {
        nome_non_valido: 'Scrivi il tuo nome.',
        cognome_non_valido: 'Scrivi il tuo cognome.',
        email_non_valida: "Controlla l'indirizzo email.",
        telefono_non_valido: 'Controlla il numero di cellulare.',
        recapito_mancante: "Lascia un'email o un numero di cellulare.",
        consenso_mancante: 'Per ricevere l\'invito spunta la casella del consenso.'
    };

    var topInvito = document.querySelector('[data-topbar-invito]');
    var topNormale = document.querySelector('[data-topbar-normale]');

    // ------------------------------------------------------------ campagna finita?
    function oggiRoma() {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
        } catch (e) {
            var d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
    }
    var fino = dlg.dataset.fino || '';
    var supportato = typeof dlg.showModal === 'function';
    if ((fino && oggiRoma() > fino) || !supportato) {
        if (topInvito && topNormale) { topInvito.hidden = true; topNormale.hidden = false; }
        return;
    }

    // ------------------------------------------------------------ memoria del browser
    function leggi() {
        try { return JSON.parse(localStorage.getItem(CHIAVE)) || {}; } catch (e) { return {}; }
    }
    function scrivi(stato) {
        try { localStorage.setItem(CHIAVE, JSON.stringify({ stato: stato, quando: Date.now() })); } catch (e) {}
    }
    var memo = leggi();
    var iscritto = memo.stato === 'iscritto';
    var inPausa = memo.stato === 'chiuso' && (Date.now() - (memo.quando || 0)) < PAUSA_GIORNI * 864e5;

    // ------------------------------------------------------------ apri / chiudi
    var form = dlg.querySelector('form');
    var fatto = dlg.querySelector('[data-fase="fatto"]');
    var errBox = form.querySelector('.form-error');
    var btn = form.querySelector('button[type="submit"]');

    function apri() {
        if (dlg.open) return;
        if (iscritto) { form.hidden = true; fatto.hidden = false; }
        dlg.showModal();
        document.documentElement.classList.add('invito-aperto');
    }
    function chiudi() { if (dlg.open) dlg.close(); }

    dlg.addEventListener('close', function () {
        document.documentElement.classList.remove('invito-aperto');
        if (!iscritto) scrivi('chiuso');
    });
    dlg.addEventListener('click', function (e) {
        if (e.target === dlg || e.target.closest('[data-chiudi]')) chiudi();   // clic fuori dal riquadro
    });

    document.querySelectorAll('[data-apri-invito]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); apri(); });
    });

    // apertura automatica: dopo 3 secondi o a metà pagina, una volta sola
    if (!iscritto && !inPausa && dlg.dataset.auto === 'si') {
        var partito = false;
        var via = function () {
            if (partito) return;
            partito = true;
            window.removeEventListener('scroll', suScroll);
            clearTimeout(timer);
            // non interrompere chi sta scrivendo in un altro modulo o ha il menu aperto
            var a = document.activeElement;
            if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
            if (document.querySelector('.nav-links.open')) return;
            apri();
        };
        var suScroll = function () {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            if (h > 0 && window.scrollY / h >= 0.5) via();
        };
        var timer = setTimeout(via, 3000);
        window.addEventListener('scroll', suScroll, { passive: true });
    }

    // ------------------------------------------------------------ invio
    function errore(t) { errBox.textContent = t; errBox.hidden = false; }
    form.addEventListener('input', function () { errBox.hidden = true; });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errBox.hidden = true;
        var f = form.elements;
        var dati = {
            azione: 'iscrizione',
            nome: f.nome.value.trim(),
            cognome: f.cognome.value.trim(),
            email: f.email.value.trim(),
            telefono: f.telefono.value.trim(),
            consenso: f.consenso.checked,
            versione: dlg.dataset.versione || '',
            pagina: location.pathname,
            sito: f.sito.value
        };

        if (dati.nome.length < 2) { f.nome.focus(); return errore(ERRORI.nome_non_valido); }
        if (dati.cognome.length < 2) { f.cognome.focus(); return errore(ERRORI.cognome_non_valido); }
        if (!dati.email && !dati.telefono) { f.email.focus(); return errore(ERRORI.recapito_mancante); }
        if (dati.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dati.email)) { f.email.focus(); return errore(ERRORI.email_non_valida); }
        if (dati.telefono && dati.telefono.replace(/\D/g, '').length < 6) { f.telefono.focus(); return errore(ERRORI.telefono_non_valido); }
        if (!dati.consenso) { f.consenso.focus(); return errore(ERRORI.consenso_mancante); }

        btn.disabled = true;
        btn.classList.add('is-loading');
        fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(dati) })    // text/plain: niente preflight CORS
            .then(function (r) { return r.json(); })
            .catch(function () { return { ok: false, errore: 'rete' }; })
            .then(function (r) {
                btn.disabled = false;
                btn.classList.remove('is-loading');
                if (r && r.ok) return riuscito(dati);
                if (r && ERRORI[r.errore]) return errore(ERRORI[r.errore]);
                errBox.innerHTML = '';
                errBox.appendChild(document.createTextNode(r && r.errore === 'rete'
                    ? 'Connessione non riuscita. Riprova tra un momento, oppure '
                    : 'Non siamo riusciti a registrarti. Riprova, oppure '));
                var a = document.createElement('a');
                a.href = WHATSAPP + '?text=' + encodeURIComponent('Ciao! Vorrei ricevere l\'invito all\'inaugurazione di Filosophia. ' + dati.nome + ' ' + dati.cognome);
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = 'scrivici su WhatsApp';
                errBox.appendChild(a);
                errBox.appendChild(document.createTextNode('.'));
                errBox.hidden = false;
            });
    });

    function riuscito(dati) {
        iscritto = true;
        scrivi('iscritto');
        fatto.querySelector('.invito-done-nome').textContent = ', ' + dati.nome;
        fatto.querySelector('.invito-done-dove').textContent =
            dati.email && dati.telefono ? 'via email o su WhatsApp'
            : dati.email ? 'a ' + dati.email : 'su WhatsApp, al ' + dati.telefono;
        form.reset();
        form.hidden = true;
        fatto.hidden = false;
        fatto.focus();
    }
})();
