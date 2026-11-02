/* Filosophia — prenotazione online della consulenza viso.
   Chiede gli orari liberi allo script Google (Sheet + Calendar) e gli
   invia la prenotazione. Nessun dato resta nel browser. */
(function () {
    'use strict';

    var root = document.getElementById('booking');
    if (!root) return;

    var ENDPOINT = (root.dataset.endpoint || '').trim();
    var SERVIZIO = root.dataset.servizio || 'Consulenza viso';
    var BRAND = root.dataset.brand || 'Filosophia';
    var INDIRIZZO = root.dataset.indirizzo || '';
    var TZ = 'Europe/Rome';

    var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
                'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    var ERRORI = {
        orario_non_disponibile: 'Nel frattempo qualcuno ha prenotato questo orario. Scegline un altro: la lista è aggiornata.',
        gia_prenotato: 'Risulta già una consulenza prenotata con questo numero. Per cambiarla scrivi su WhatsApp.',
        nome_non_valido: 'Scrivi nome e cognome.',
        telefono_non_valido: 'Controlla il numero di telefono.',
        email_non_valida: "Controlla l'indirizzo email (oppure lascialo vuoto).",
        privacy_mancante: "Per prenotare conferma di aver letto l'informativa privacy.",
        rete: 'Connessione non riuscita. Riprova tra un momento.',
        non_attive: 'Le prenotazioni online sono sospese in questo momento: scrivi su WhatsApp.',
        errore_interno: 'Qualcosa non ha funzionato. Riprova, oppure scrivi su WhatsApp.'
    };

    var $ = function (sel, el) { return (el || root).querySelector(sel); };
    var steps = {};
    root.querySelectorAll('[data-step]').forEach(function (s) { steps[s.dataset.step] = s; });

    var stato = { giorni: {}, mese: null, giorno: null, ora: null, durata: 30 };

    // ------------------------------------------------------------ utilità

    function parseData(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function iso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function ora(hhmm) { return hhmm.replace(':', '.'); }
    function dataLunga(s) {
        var d = parseData(s);
        return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
    }
    function maiuscola(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function mostra(nomi) {
        Object.keys(steps).forEach(function (k) { steps[k].hidden = nomi.indexOf(k) === -1; });
    }

    function fallback(testo) {
        if (testo) $('.booking-fallback-text').textContent = testo;
        mostra(['fallback']);
    }

    // ------------------------------------------------------------ caricamento

    function carica() {
        var status = $('.booking-status', steps.giorno);
        status.hidden = false;
        $('.cal').hidden = true;
        return fetch(ENDPOINT + (ENDPOINT.indexOf('?') === -1 ? '?' : '&') + 'azione=disponibilita', { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (r) {
                if (!r.ok) throw new Error(r.errore || 'errore');
                if (r.attive === false) { fallback(); return; }
                stato.giorni = r.giorni || {};
                stato.durata = r.durata || 30;
                var date = Object.keys(stato.giorni).sort();
                if (!date.length) {
                    fallback("Al momento l'agenda online è piena. Scrivi su WhatsApp: si trova insieme un momento.");
                    return;
                }
                if (!stato.mese || !date.some(function (d) { return d.slice(0, 7) === stato.mese; })) {
                    stato.mese = date[0].slice(0, 7);
                }
                status.hidden = true;
                $('.cal').hidden = false;
                disegnaCalendario();
            })
            .catch(function () {
                fallback('In questo momento l\'agenda non si carica. Scrivi su WhatsApp per fissare l\'appuntamento.');
            });
    }

    // ------------------------------------------------------------ calendario

    function disegnaCalendario() {
        var date = Object.keys(stato.giorni).sort();
        var primo = date[0].slice(0, 7), ultimo = date[date.length - 1].slice(0, 7);
        var p = stato.mese.split('-'), anno = +p[0], mese = +p[1] - 1;

        $('.cal-month').textContent = maiuscola(MESI[mese]) + ' ' + anno;
        $('.cal-nav[data-dir="-1"]').disabled = stato.mese <= primo;
        $('.cal-nav[data-dir="1"]').disabled = stato.mese >= ultimo;

        var grid = $('.cal-grid');
        grid.innerHTML = '';
        ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(function (g) {
            var h = document.createElement('span');
            h.className = 'cal-dow';
            h.textContent = g;
            h.setAttribute('aria-hidden', 'true');
            grid.appendChild(h);
        });

        var inizio = new Date(anno, mese, 1);
        var vuoti = (inizio.getDay() + 6) % 7;
        for (var i = 0; i < vuoti; i++) grid.appendChild(document.createElement('span'));

        var giorniNelMese = new Date(anno, mese + 1, 0).getDate();
        for (var g = 1; g <= giorniNelMese; g++) {
            var d = iso(new Date(anno, mese, g));
            var slot = stato.giorni[d];
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cal-day';
            b.textContent = g;
            b.dataset.data = d;
            if (slot && slot.length) {
                b.classList.add('is-open');
                b.setAttribute('aria-label', maiuscola(dataLunga(d)) + ': ' + slot.length + (slot.length === 1 ? ' orario libero' : ' orari liberi'));
                if (d === stato.giorno) { b.classList.add('is-selected'); b.setAttribute('aria-pressed', 'true'); }
            } else {
                b.disabled = true;
                b.setAttribute('aria-label', maiuscola(dataLunga(d)) + ': non disponibile');
            }
            grid.appendChild(b);
        }
    }

    root.addEventListener('click', function (e) {
        var nav = e.target.closest('.cal-nav');
        if (nav) {
            var p = stato.mese.split('-');
            var d = new Date(+p[0], +p[1] - 1 + +nav.dataset.dir, 1);
            stato.mese = iso(d).slice(0, 7);
            disegnaCalendario();
            return;
        }
        var day = e.target.closest('.cal-day.is-open');
        if (day) { scegliGiorno(day.dataset.data); return; }

        var slot = e.target.closest('.slot');
        if (slot) { scegliOra(slot.dataset.ora); return; }

        var back = e.target.closest('[data-back]');
        if (back) { mostra(['giorno', 'ora']); steps.ora.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });

    function scegliGiorno(d) {
        stato.giorno = d;
        stato.ora = null;
        disegnaCalendario();

        $('.booking-chosen-day').textContent = maiuscola(dataLunga(d));
        var box = $('.slots');
        box.innerHTML = '';
        var gruppi = { Mattina: [], Pomeriggio: [] };
        stato.giorni[d].forEach(function (h) { gruppi[h < '13:00' ? 'Mattina' : 'Pomeriggio'].push(h); });

        Object.keys(gruppi).forEach(function (nome) {
            if (!gruppi[nome].length) return;
            var wrap = document.createElement('div');
            wrap.className = 'slot-group';
            var t = document.createElement('p');
            t.className = 'slot-label';
            t.textContent = nome;
            wrap.appendChild(t);
            var list = document.createElement('div');
            list.className = 'slot-list';
            gruppi[nome].forEach(function (h) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'slot';
                b.dataset.ora = h;
                b.textContent = ora(h);
                b.setAttribute('aria-label', 'Ore ' + ora(h));
                list.appendChild(b);
            });
            wrap.appendChild(list);
            box.appendChild(wrap);
        });

        mostra(['giorno', 'ora']);
        if (window.matchMedia('(max-width: 860px)').matches) {
            steps.ora.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function avviso(msg) {
        var el = $('.slot-notice');
        el.textContent = msg;
        el.hidden = !msg;
    }

    function scegliOra(h) {
        stato.ora = h;
        avviso('');
        root.querySelectorAll('.slot').forEach(function (b) {
            var sel = b.dataset.ora === h;
            b.classList.toggle('is-selected', sel);
            b.setAttribute('aria-pressed', sel ? 'true' : 'false');
        });
        $('.booking-summary').innerHTML = '<strong>' + SERVIZIO + '</strong> · ' +
            maiuscola(dataLunga(stato.giorno)) + ', ore ' + ora(h) + ' · ' + stato.durata + ' minuti';
        errore('');
        mostra(['giorno', 'ora', 'dati']);
        steps.dati.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () { $('#b-nome').focus({ preventScroll: true }); }, 400);
    }

    // ------------------------------------------------------------ invio

    function errore(msg) {
        var el = $('.form-error');
        el.textContent = msg;
        el.hidden = !msg;
    }

    steps.dati.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        var dati = {
            nome: f.nome.value.trim(),
            telefono: f.telefono.value.trim(),
            email: f.email.value.trim(),
            note: f.note.value.trim(),
            sito: f.sito.value,
            privacy: f.privacy.checked,
            data: stato.giorno,
            ora: stato.ora
        };

        // controlli rapidi prima di inviare
        if (dati.nome.length < 3) { errore(ERRORI.nome_non_valido); f.nome.focus(); return; }
        if (dati.telefono.replace(/\D/g, '').length < 8) { errore(ERRORI.telefono_non_valido); f.telefono.focus(); return; }
        if (dati.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dati.email)) { errore(ERRORI.email_non_valida); f.email.focus(); return; }
        if (!dati.privacy) { errore(ERRORI.privacy_mancante); return; }

        var btn = f.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.classList.add('is-loading');
        errore('');

        fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(dati) })   // text/plain: niente preflight CORS
            .then(function (r) { return r.json(); })
            .catch(function () { return { ok: false, errore: 'rete' }; })
            .then(function (r) {
                btn.disabled = false;
                btn.classList.remove('is-loading');
                if (r.ok) return conferma(dati);
                errore(ERRORI[r.errore] || ERRORI.errore_interno);
                if (r.errore === 'orario_non_disponibile') {
                    var giorno = stato.giorno;
                    carica().then(function () {
                        if (stato.giorni[giorno]) scegliGiorno(giorno);
                        else mostra(['giorno']);
                        avviso(ERRORI.orario_non_disponibile);
                    });
                }
            });
    });

    // ------------------------------------------------------------ conferma

    function romaInUTC(data, hhmm) {
        // ora italiana → istante UTC, tenendo conto dell'ora legale
        var p = data.split('-'), h = hhmm.split(':');
        var guess = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], +h[0], +h[1]));
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit',
            day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess)
            .reduce(function (a, x) { a[x.type] = x.value; return a; }, {});
        var comeRoma = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
        return new Date(guess.getTime() - (comeRoma - guess.getTime()));
    }
    function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

    function conferma(dati) {
        var inizio = romaInUTC(dati.data, dati.ora);
        var fine = new Date(inizio.getTime() + stato.durata * 60000);
        var titolo = SERVIZIO + ' — ' + BRAND;

        $('.booking-done-when').textContent = maiuscola(dataLunga(dati.data)) + ', ore ' + ora(dati.ora);
        $('.booking-done-where').textContent = INDIRIZZO;

        var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
            '&text=' + encodeURIComponent(titolo) +
            '&dates=' + stamp(inizio) + '/' + stamp(fine) +
            '&location=' + encodeURIComponent(INDIRIZZO) +
            '&details=' + encodeURIComponent('Consulenza di ' + stato.durata + ' minuti. Per spostarla: ' + (root.dataset.whatsapp || ''));
        $('[data-gcal]').href = g;

        var ics = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Filosophia//Prenotazioni//IT', 'BEGIN:VEVENT',
            'UID:' + stamp(inizio) + '-' + Math.random().toString(36).slice(2) + '@filosophia',
            'DTSTAMP:' + stamp(new Date()), 'DTSTART:' + stamp(inizio), 'DTEND:' + stamp(fine),
            'SUMMARY:' + titolo, 'LOCATION:' + INDIRIZZO.replace(/,/g, '\\,'),
            'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + titolo, 'END:VALARM',
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');
        $('[data-ics]').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);

        steps.dati.reset();
        mostra(['fatto']);
        steps.fatto.focus({ preventScroll: true });
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ------------------------------------------------------------ avvio

    if (!ENDPOINT) { fallback(); return; }
    carica();
})();
