# Moskunst — mosschilderijen uit Eersel

Productwebsite voor handgemaakte mosschilderijen, mandala's en 3D-moscomposities
van gepreserveerd mos. Eén pagina met de collectie, een configurator
("Stel jouw stuk samen") en een contactformulier.

## Structuur

```
site/                     De volledige website (statisch, geen buildstap)
  index.html              Alle secties: hero, collectie, configurator, contact
  assets/css/main.css     Ontwerptokens + alle styling
  assets/js/
    site-config.js        ← Contactgegevens en instellingen (invullen!)
    prijzen.js            ← Prijsindicaties voor de configurator (invullen!)
    werken-data.js        De tien werken (teksten, foto's, etiketten)
    configurator.js       Presets, keuzes, SVG-preview, prijsberekening
    main.js               Navigatie, filters, detail-overlay, formulier
  assets/images/werken/   Foto's per werk (webp)
  assets/fonts/           Zelf-gehoste fonts (geen Google-requests, AVG-proof)
nginx/default.conf        Serverconfiguratie (caching, gzip, security headers)
Dockerfile                nginx-container met de site
docker-compose.yml        Draaien met één commando
```

## Lokaal bekijken

De site is statisch — elke webserver werkt. Bijvoorbeeld:

```bash
npx serve site
# of met Docker:
docker compose up --build   # → http://localhost:8080
```

## Deployen

```bash
docker build -t moskunst-website .
docker run -d -p 80:80 --restart unless-stopped moskunst-website
```

HTTPS regel je het makkelijkst met een reverse proxy (Caddy, Traefik of
nginx + certbot) vóór deze container.

## Checklist voor Roland

Alles wat nog ingevuld moet worden staat op twee plekken:

1. **`site/assets/js/site-config.js`** — e-mailadres, WhatsApp-nummer,
   Marktplaats-link, formulier-endpoint (bv. [Formspree](https://formspree.io)),
   KvK/BTW. Lege velden worden automatisch verborgen op de site.
2. **`site/assets/js/prijzen.js`** — de echte prijzen voor de configurator.
   De huidige bedragen zijn voorbeelden; alleen € 200 voor het logo-werk klopt.

Verder, zoekbaar in de bestanden met de term `invullen`:

- [ ] Merknaam: overal staat nu **Moskunst** (in `index.html` en deze README)
- [ ] Domein: vervang `www.moskunst.nl` in `index.html` (canonical + Open Graph),
      `robots.txt` en `sitemap.xml`
- [ ] Beoordeling / aantal verkopen in de sectie "Over de maker" (`index.html`)
- [ ] Reviews: de sectie staat klaar in commentaar in `index.html`

## Nieuwe werken toevoegen

1. Maak een map `site/assets/images/werken/<nummer>-<naam>/` met `foto-01.webp` t/m `foto-NN.webp`
2. Voeg een kaart toe in `index.html` (kopieer een bestaande `<li class="werk-kaart">`)
3. Voeg het werk toe in `site/assets/js/werken-data.js` (zelfde nummer als `data-werk`)
