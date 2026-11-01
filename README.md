# filosophia — sito

Sito vetrina di **filosophia · Skin · Ritual · Beauty Boutique** (Rovereto, TN).
Costruito con [Jekyll](https://jekyllrb.com), pubblicato su GitHub Pages.

## Sviluppo locale

```bash
bundle install          # una sola volta
bundle exec jekyll serve --livereload
# apri http://127.0.0.1:4000
```

## Dove si modificano le cose

| Cosa | File |
|---|---|
| Titolo, dominio, SEO | `_config.yml` |
| Voci del menu | `_data/navigation.yml` |
| Contatti, orari, social | `_data/profiles.yml` |
| Listino / trattamenti | `_data/trattamenti.yml` |
| Marchi selezionati | `_data/marchi.yml` |
| Listino prodotti (prezzi al pubblico) | `_data/listino.yml` · costi riservati in `_private/listino-costi.csv` |
| Percorso cliente | `_data/percorso.yml` |
| Prenotazioni online e gestionale | `_data/prenotazioni.yml` + `_google-script/gestionale/` (guida dentro) |
| Domande frequenti | `_data/faq.yml` |
| Colori e tipografia | `assets/css/main.css` (blocco `:root` in cima) |
| Logo (rametto) | `_includes/sprig.html` · `assets/images/sprig.svg` |
| Font | `assets/fonts/` (Cormorant Garamond + Jost, ospitati sul sito) |
| Foto | `assets/images/` |
| Trattamenti "prossimamente" | `prossimamente: true` in `_data/trattamenti.yml` e `_data/percorso.yml` (cancella la riga quando partono) |

## Pubblicazione (GitHub Pages)

1. Crea un repository su GitHub (es. `filosophia-site`).
2. `git init && git add . && git commit -m "Primo commit"`
3. `git remote add origin <url> && git push -u origin main`
4. Settings → Pages → *Deploy from a branch* → `main` / `root`.
5. Per il dominio personalizzato: crea il file `CNAME` con dentro il dominio
   (già fatto: `www.filosophiaboutique.it`) e imposta i record DNS su Aruba (vedi GUIDA.md, sezione 6).

> `_private/` contiene documenti riservati: è escluso
> sia dal build sia da git. Non spostarli fuori da quella cartella.
