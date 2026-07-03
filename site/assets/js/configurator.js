/*
 * Configurator "Stel jouw stuk samen".
 * - Presets zetten alle keuzes in één klap goed.
 * - Keuzes worden per vorm gefilterd (geen led op een schaal, geen logo op een mandala).
 * - De SVG-preview tekent live mee; de mosvlekken komen uit een geseede
 *   pseudo-random generator zodat dezelfde keuze altijd dezelfde schets geeft.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const beweegNiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------ Keuzedata ------------------------------ */

  const VORMEN = {
    cirkel:    { label: 'Cirkel',     maten: ['cirkel-d40', 'cirkel-d57', 'cirkel-d70', 'cirkel-d80'], rand: true,  led: true,  logo: true,  standaard: false },
    ovaal:     { label: 'Ovaal',      maten: ['ovaal-70x50', 'ovaal-90x70', 'ovaal-maat'],             rand: true,  led: true,  logo: true,  standaard: false },
    organisch: { label: 'Organisch',  maten: ['organisch-maat'],                                       rand: true,  led: true,  logo: true,  standaard: false },
    mandala:   { label: 'Mandala',    maten: ['mandala-d40', 'mandala-d57', 'mandala-d70', 'mandala-d80'], rand: true, led: true, logo: false, standaard: false },
    schaal:    { label: '3D-schaal',  maten: ['schaal-standaard'],                                     rand: false, led: false, logo: false, standaard: true },
    sculptuur: { label: 'Sculptuur',  maten: ['sculptuur-standaard'],                                  rand: false, led: false, logo: false, standaard: true },
  };

  const MATEN = {
    'cirkel-d40':          { label: 'Ø 40 cm' },
    'cirkel-d57':          { label: 'Ø 57,5 cm' },
    'cirkel-d70':          { label: 'Ø 70 cm' },
    'cirkel-d80':          { label: 'Ø 80 cm' },
    'ovaal-70x50':         { label: '70 × 50 cm' },
    'ovaal-90x70':         { label: '90 × 70 cm' },
    'ovaal-maat':          { label: 'Op maat (tot 120 × 90)' },
    'organisch-maat':      { label: 'Op maat (tot 120 × 90)' },
    'mandala-d40':         { label: 'Ø 40 cm' },
    'mandala-d57':         { label: 'Ø 57,5 cm' },
    'mandala-d70':         { label: 'Ø 70 cm' },
    'mandala-d80':         { label: 'Ø 80 cm' },
    'schaal-standaard':    { label: 'Standaardmaat' },
    'sculptuur-standaard': { label: 'Standaardmaat' },
  };

  const MOSSEN = {
    rendier:   { label: 'Rendiermos' },
    bol:       { label: 'Bolmos' },
    mix:       { label: 'Rendiermos + bolmos' },
    botanisch: { label: 'Met varens & botanisch' },
  };

  const KLEUREN = {
    natuur:      { label: 'Natuurgroen',              palet: ['#4A5D3A', '#556840', '#5F7143'] },
    tinten:      { label: 'Meerdere groentinten',     palet: ['#2E3B26', '#4A5D3A', '#6E7B45', '#8A9A5B', '#A8B87A'] },
    meerkleurig: { label: 'Meerkleurig',              palet: ['#2E3B26', '#6E7B45', '#8A9A5B', '#B4BD84', '#DCD7BC', '#EAE6D4'] },
    neutraal:    { label: 'Groen + neutraal',         palet: ['#445436', '#4A5D3A', '#6E7B45', '#D9D4C0', '#EAE6D4'] },
  };

  const RANDEN = {
    zwart:  { label: 'Matzwarte rand',      kleur: '#1D1D1B' },
    acacia: { label: 'Ingelegd acaciahout', kleur: '#B08150' },
    geen:   { label: 'Geen rand',           kleur: null },
  };

  const EXTRAS = {
    led:       { label: 'Achtergrondverlichting', hint: 'met afstandsbediening' },
    logo:      { label: 'Logo of symbool verwerkt', hint: null },
    standaard: { label: 'Op standaard', hint: null },
  };

  const PRESETS = {
    moscirkel:   { label: 'Moscirkel Ø 80',       state: { vorm: 'cirkel', maat: 'cirkel-d80', mos: 'mix', kleur: 'tinten', rand: 'zwart', extras: [] } },
    verlichting: { label: 'Sfeerverlichting',     state: { vorm: 'cirkel', maat: 'cirkel-d70', mos: 'mix', kleur: 'tinten', rand: 'zwart', extras: ['led'] } },
    ovaal:       { label: 'Ovaal 90×70',          state: { vorm: 'ovaal', maat: 'ovaal-90x70', mos: 'rendier', kleur: 'natuur', rand: 'zwart', extras: [] } },
    mandala:     { label: 'Mandala',              state: { vorm: 'mandala', maat: 'mandala-d57', mos: 'rendier', kleur: 'meerkleurig', rand: 'zwart', extras: [] } },
    logo:        { label: 'Zakelijk: logo in mos', state: { vorm: 'cirkel', maat: 'cirkel-d80', mos: 'mix', kleur: 'tinten', rand: 'zwart', extras: ['logo'] } },
    landschap:   { label: '3D moslandschap',      state: { vorm: 'schaal', maat: 'schaal-standaard', mos: 'botanisch', kleur: 'tinten', rand: 'geen', extras: [] } },
  };

  /* -------------------------------- Status ------------------------------- */

  const state = structuredClone(PRESETS.moscirkel.state);
  let actievePreset = 'moscirkel';

  const form = document.getElementById('cfg-form');
  const svg = document.getElementById('cfg-preview');
  if (!form || !svg) return;

  /* --------------------------- Geseede 'random' -------------------------- */

  function seedVan(tekst) {
    let h = 2166136261;
    for (let i = 0; i < tekst.length; i++) {
      h ^= tekst.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function maakRandom(seed) {
    // mulberry32 — klein, snel en reproduceerbaar
    let a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------- Prijzen ------------------------------- */

  function prijsIndicatie() {
    const P = window.PRIJZEN || { basis: {}, toeslagen: {} };
    let bedrag = P.basis[state.maat] || 0;
    if (state.extras.includes('led')) bedrag += P.toeslagen.led || 0;
    if (state.extras.includes('logo')) bedrag += P.toeslagen.logo || 0;
    if (state.rand === 'acacia') bedrag += P.toeslagen.acacia || 0;
    return Math.round(bedrag / 5) * 5;
  }

  /* ------------------------------ Formulier ------------------------------ */

  // kleine vorm-pictogrammen in de keuzechips
  const VORM_ICONEN = {
    cirkel: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    ovaal: '<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="10" rx="8.5" ry="6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    organisch: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6c4.2-.3 7.4 2.6 7.3 6.6-.1 4-2.5 8-6.9 8.2-4.2.2-8-2.6-8.1-6.9C2.2 6.3 5.6 2.9 10 2.6Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    mandala: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4" stroke="currentColor" stroke-width="1.4"/></svg>',
    schaal: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9c.4 4 3 7 7 7s6.6-3 7-7Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="12.5" cy="6.6" r="2" fill="currentColor"/></svg>',
    sculptuur: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 13.5c-2-2.5-1.3-6.5 1.8-8 3-1.5 6.7-.2 7.4 3 .6 3-1.2 5-3.2 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6 16.5h8M9 13.5v3" stroke="currentColor" stroke-width="1.6"/></svg>',
  };

  function maakOptie(groep, id, label, type, checked, toeslag) {
    const wrap = document.createElement('label');
    wrap.className = 'cfg-optie';
    const input = document.createElement('input');
    input.type = type;
    input.name = groep;
    input.value = id;
    input.checked = checked;
    const span = document.createElement('span');
    span.className = 'cfg-optie__vlak';

    if (groep === 'vorm' && VORM_ICONEN[id]) {
      const icoon = document.createElement('span');
      icoon.className = 'cfg-optie__icoon';
      icoon.innerHTML = VORM_ICONEN[id];
      span.appendChild(icoon);
    }

    if (groep === 'kleur') {
      const stalen = document.createElement('span');
      stalen.className = 'cfg-optie__stalen';
      // toon drie representatieve tinten uit het palet
      const palet = KLEUREN[id].palet;
      [0, Math.floor(palet.length / 2), palet.length - 1].forEach((i) => {
        const dot = document.createElement('span');
        dot.className = 'cfg-optie__staal';
        dot.style.background = palet[i];
        stalen.appendChild(dot);
      });
      span.appendChild(stalen);
    }

    if (groep === 'rand' && RANDEN[id].kleur) {
      const staal = document.createElement('span');
      staal.className = 'cfg-optie__staal';
      staal.style.background = RANDEN[id].kleur;
      span.appendChild(staal);
    }

    span.appendChild(document.createTextNode(label));
    if (toeslag) {
      const t = document.createElement('em');
      t.className = 'cfg-optie__toeslag';
      t.textContent = ` +€${toeslag}`;
      span.appendChild(t);
    }
    wrap.append(input, span);
    return wrap;
  }

  function renderOpties() {
    const vorm = VORMEN[state.vorm];
    const P = (window.PRIJZEN && window.PRIJZEN.toeslagen) || {};

    const bak = (naam) => form.querySelector(`[data-opties="${naam}"]`);
    const groepEl = (naam) => form.querySelector(`[data-groep="${naam}"]`);

    // 1 · Vorm
    bak('vorm').replaceChildren(...Object.entries(VORMEN).map(([id, v]) =>
      maakOptie('vorm', id, v.label, 'radio', id === state.vorm)));

    // 2 · Formaat — afhankelijk van vorm
    if (!vorm.maten.includes(state.maat)) state.maat = vorm.maten[0];
    bak('maat').replaceChildren(...vorm.maten.map((id) =>
      maakOptie('maat', id, MATEN[id].label, 'radio', id === state.maat)));

    // 3 · Mos
    bak('mos').replaceChildren(...Object.entries(MOSSEN).map(([id, m]) =>
      maakOptie('mos', id, m.label, 'radio', id === state.mos)));

    // 4 · Kleur
    bak('kleur').replaceChildren(...Object.entries(KLEUREN).map(([id, k]) =>
      maakOptie('kleur', id, k.label, 'radio', id === state.kleur)));

    // 5 · Rand — verborgen bij schaal/sculptuur (die hebben hout of een standaard)
    groepEl('rand').hidden = !vorm.rand;
    if (!vorm.rand) {
      state.rand = 'geen';
    } else {
      if (state.rand === 'geen' && state.vorm === 'mandala') state.rand = 'zwart';
      bak('rand').replaceChildren(...Object.entries(RANDEN).map(([id, r]) =>
        maakOptie('rand', id, r.label, 'radio', id === state.rand, id === 'acacia' ? P.acacia : 0)));
    }

    // 6 · Extra's — per vorm gefilterd
    const beschikbaar = Object.keys(EXTRAS).filter((id) => vorm[id]);
    state.extras = state.extras.filter((id) => beschikbaar.includes(id));
    groepEl('extras').hidden = beschikbaar.length === 0;
    bak('extras').replaceChildren(...beschikbaar.map((id) => {
      const label = EXTRAS[id].hint ? `${EXTRAS[id].label} (${EXTRAS[id].hint})` : EXTRAS[id].label;
      return maakOptie('extras', id, label, 'checkbox', state.extras.includes(id), P[id]);
    }));
  }

  function renderPresets() {
    const rij = document.getElementById('cfg-presets');
    rij.replaceChildren(...Object.entries(PRESETS).map(([id, p]) => {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'preset-knop' + (id === actievePreset ? ' is-actief' : '');
      knop.textContent = p.label;
      knop.addEventListener('click', () => {
        Object.assign(state, structuredClone(p.state));
        actievePreset = id;
        renderAlles();
      });
      return knop;
    }));
  }

  /* ------------------------------ SVG-preview ---------------------------- */

  function el(naam, attrs) {
    const node = document.createElementNS(SVG_NS, naam);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  // Vaste geometrie per vorm: omtrek + een 'binnen'-test voor de mosvlekken
  const GEOMETRIE = {
    cirkel: {
      omtrek: () => el('circle', { cx: 220, cy: 220, r: 160 }),
      binnen: (x, y, m) => (x - 220) ** 2 + (y - 220) ** 2 < (160 - m) ** 2,
    },
    mandala: {
      omtrek: () => el('circle', { cx: 220, cy: 220, r: 160 }),
      binnen: (x, y, m) => (x - 220) ** 2 + (y - 220) ** 2 < (160 - m) ** 2,
    },
    ovaal: {
      omtrek: () => el('ellipse', { cx: 220, cy: 220, rx: 185, ry: 140 }),
      binnen: (x, y, m) => ((x - 220) / (185 - m)) ** 2 + ((y - 220) / (140 - m)) ** 2 < 1,
    },
    organisch: {
      omtrek: () => el('path', {
        d: 'M 220 62 C 316 54 388 118 386 208 C 384 296 330 376 232 380 C 138 384 56 322 54 226 C 52 132 122 70 220 62 Z',
      }),
      // de blob is grofweg een ellips; iets krapper testen zodat vlekken binnen blijven
      binnen: (x, y, m) => ((x - 220) / (158 - m)) ** 2 + ((y - 221) / (152 - m)) ** 2 < 1,
    },
  };

  function tekenGloed(laag) {
    laag.appendChild(el('circle', { cx: 220, cy: 220, r: 205, fill: 'url(#cfg-gloed)' }));
  }

  function tekenDefs() {
    const defs = el('defs', {});
    const gradient = el('radialGradient', { id: 'cfg-gloed' });
    gradient.appendChild(el('stop', { offset: '62%', 'stop-color': '#F2B450', 'stop-opacity': 0 }));
    gradient.appendChild(el('stop', { offset: '78%', 'stop-color': '#F2B450', 'stop-opacity': 0.55 }));
    gradient.appendChild(el('stop', { offset: '100%', 'stop-color': '#F2B450', 'stop-opacity': 0 }));
    defs.appendChild(gradient);
    return defs;
  }

  function tekenMosvlekken(laag, rnd, binnen, palet) {
    // gelaagde organische vlekken: groot en transparant onderop, kleiner en voller erboven
    for (let i = 0; i < 46; i++) {
      let x, y, pogingen = 0;
      const r = 14 + rnd() * 34;
      do {
        x = 40 + rnd() * 360;
        y = 40 + rnd() * 360;
      } while (!binnen(x, y, r * 0.55) && ++pogingen < 60);
      if (pogingen >= 60) continue;
      laag.appendChild(el('ellipse', {
        cx: x.toFixed(1), cy: y.toFixed(1),
        rx: r.toFixed(1), ry: (r * (0.7 + rnd() * 0.5)).toFixed(1),
        fill: palet[Math.floor(rnd() * palet.length)],
        opacity: (0.55 + rnd() * 0.4).toFixed(2),
        transform: `rotate(${Math.floor(rnd() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`,
      }));
    }
  }

  function tekenBolmos(laag, rnd, binnen, palet) {
    // bolmos: dichte ronde plukjes in kleine clusters
    const donker = palet[0];
    for (let c = 0; c < 7; c++) {
      let cx, cy, pogingen = 0;
      do {
        cx = 60 + rnd() * 320;
        cy = 60 + rnd() * 320;
      } while (!binnen(cx, cy, 30) && ++pogingen < 60);
      if (pogingen >= 60) continue;
      for (let i = 0; i < 5; i++) {
        const r = 7 + rnd() * 12;
        laag.appendChild(el('circle', {
          cx: (cx + (rnd() - 0.5) * 34).toFixed(1),
          cy: (cy + (rnd() - 0.5) * 34).toFixed(1),
          r: r.toFixed(1),
          fill: donker,
          opacity: (0.75 + rnd() * 0.25).toFixed(2),
        }));
      }
    }
  }

  function tekenVaren(laag, x, y, hoek, lengte, kleur) {
    const groep = el('g', { transform: `translate(${x} ${y}) rotate(${hoek})`, fill: kleur, opacity: 0.9 });
    groep.appendChild(el('path', { d: `M 0 0 L 0 ${-lengte}`, stroke: kleur, 'stroke-width': 2, fill: 'none' }));
    const blaadjes = Math.floor(lengte / 11);
    for (let i = 1; i <= blaadjes; i++) {
      const py = -(i / blaadjes) * lengte;
      const bl = (1 - i / (blaadjes + 2)) * 16 + 3;
      groep.appendChild(el('ellipse', { cx: -bl / 2, cy: py, rx: bl / 2, ry: 2.4, transform: `rotate(-24 ${-bl / 2} ${py})` }));
      groep.appendChild(el('ellipse', { cx: bl / 2, cy: py, rx: bl / 2, ry: 2.4, transform: `rotate(24 ${bl / 2} ${py})` }));
    }
    laag.appendChild(groep);
  }

  function tekenHoutInleg(laag, rnd, binnen) {
    for (let i = 0; i < 4; i++) {
      let x, y, pogingen = 0;
      do {
        x = 70 + rnd() * 300;
        y = 70 + rnd() * 300;
      } while (!binnen(x, y, 34) && ++pogingen < 60);
      if (pogingen >= 60) continue;
      laag.appendChild(el('path', {
        d: `M ${x - 30} ${y} q 14 ${-20 - rnd() * 14} 34 ${-8} q 22 10 26 ${16 + rnd() * 8} q -26 ${12 + rnd() * 8} -44 6 q -18 -6 -16 -14 Z`,
        fill: rnd() > 0.5 ? '#B08150' : '#9A6E42',
        opacity: 0.95,
      }));
    }
  }

  function tekenLogo(laag) {
    const groep = el('g', {});
    groep.appendChild(el('circle', { cx: 220, cy: 220, r: 56, fill: 'none', stroke: '#EDEAE1', 'stroke-width': 2.5, opacity: 0.95 }));
    const tekst = el('text', {
      x: 220, y: 227, 'text-anchor': 'middle',
      'font-family': "'Space Mono', monospace", 'font-size': 19, 'letter-spacing': 2,
      fill: '#EDEAE1',
    });
    tekst.textContent = 'LOGO';
    groep.appendChild(tekst);
    laag.appendChild(groep);
  }

  function tekenMandala(laag, palet) {
    // concentrische ringen + zesvoudig sterpatroon, uit het gekozen palet
    const c = (i) => palet[i % palet.length];
    laag.appendChild(el('circle', { cx: 220, cy: 220, r: 160, fill: c(1) }));
    for (let i = 0; i < 6; i++) {
      laag.appendChild(el('path', {
        d: 'M 220 80 C 252 128 252 176 220 208 C 188 176 188 128 220 80 Z',
        fill: c(3), transform: `rotate(${i * 60} 220 220)`,
      }));
      laag.appendChild(el('path', {
        d: 'M 220 108 C 242 142 242 178 220 200 C 198 178 198 142 220 108 Z',
        fill: c(0), transform: `rotate(${i * 60 + 30} 220 220)`,
      }));
      laag.appendChild(el('circle', {
        cx: 220, cy: 96, r: 10, fill: c(4),
        transform: `rotate(${i * 60 + 30} 220 220)`,
      }));
    }
    laag.appendChild(el('circle', { cx: 220, cy: 220, r: 34, fill: c(5) }));
    laag.appendChild(el('circle', { cx: 220, cy: 220, r: 16, fill: c(2) }));
  }

  function tekenSchaal(laag, rnd, palet, metVaren) {
    // zijaanzicht: houten schaal met mosheuvels erboven
    laag.appendChild(el('path', {
      d: 'M 66 240 C 70 260 90 336 220 336 C 350 336 370 260 374 240 C 330 252 110 252 66 240 Z',
      fill: '#A87B4C',
    }));
    laag.appendChild(el('path', {
      d: 'M 66 240 C 110 252 330 252 374 240 C 330 232 110 232 66 240 Z',
      fill: '#8A6238',
    }));
    if (metVaren) {
      tekenVaren(laag, 140, 232, -26, 92, palet[0]);
      tekenVaren(laag, 306, 230, 22, 104, palet[1 % palet.length]);
    }
    for (let i = 0; i < 22; i++) {
      const x = 100 + rnd() * 240;
      const r = 14 + rnd() * 22;
      laag.appendChild(el('circle', {
        cx: x.toFixed(1),
        cy: (238 - r * (0.4 + rnd() * 0.8)).toFixed(1),
        r: r.toFixed(1),
        fill: palet[Math.floor(rnd() * palet.length)],
        opacity: (0.8 + rnd() * 0.2).toFixed(2),
      }));
    }
  }

  function tekenSculptuur(laag, rnd, palet, metVaren, opStandaard) {
    if (opStandaard) {
      laag.appendChild(el('rect', { x: 168, y: 366, width: 104, height: 14, fill: '#1D1D1B' }));
      laag.appendChild(el('rect', { x: 204, y: 330, width: 32, height: 38, fill: '#1D1D1B' }));
    }
    laag.appendChild(el('path', {
      d: 'M 150 336 C 118 300 128 236 172 210 C 210 188 262 190 294 218 C 330 250 328 306 292 336 C 246 348 196 348 150 336 Z',
      fill: '#A87B4C',
    }));
    laag.appendChild(el('path', {
      d: 'M 168 322 C 150 296 158 250 190 232 C 218 217 258 220 280 240 C 305 264 302 302 278 322 C 242 331 202 331 168 322 Z',
      fill: '#8A6238', opacity: 0.6,
    }));
    if (metVaren) {
      tekenVaren(laag, 176, 226, -30, 84, palet[0]);
      tekenVaren(laag, 272, 228, 26, 92, palet[1 % palet.length]);
    }
    for (let i = 0; i < 16; i++) {
      const x = 162 + rnd() * 122;
      const r = 12 + rnd() * 20;
      laag.appendChild(el('circle', {
        cx: x.toFixed(1),
        cy: (222 - r * (0.3 + rnd() * 0.7)).toFixed(1),
        r: r.toFixed(1),
        fill: palet[Math.floor(rnd() * palet.length)],
        opacity: (0.8 + rnd() * 0.2).toFixed(2),
      }));
    }
  }

  function tekenPreview() {
    const rnd = maakRandom(seedVan(JSON.stringify(state)));
    const palet = KLEUREN[state.kleur].palet;
    const vlak = state.vorm !== 'schaal' && state.vorm !== 'sculptuur';

    // titel bewaren, de rest opnieuw opbouwen
    const titel = svg.querySelector('title');
    svg.replaceChildren(titel, tekenDefs());

    const laag = el('g', {});
    svg.appendChild(laag);

    if (vlak && state.extras.includes('led')) tekenGloed(laag);

    if (state.vorm === 'schaal') {
      tekenSchaal(laag, rnd, palet, state.mos === 'botanisch');
    } else if (state.vorm === 'sculptuur') {
      tekenSculptuur(laag, rnd, palet, state.mos === 'botanisch', state.extras.includes('standaard'));
    } else if (state.vorm === 'mandala') {
      tekenMandala(laag, palet);
    } else {
      const geo = GEOMETRIE[state.vorm];
      const klipId = 'cfg-klip';
      const klip = el('clipPath', { id: klipId });
      klip.appendChild(geo.omtrek());
      svg.querySelector('defs').appendChild(klip);

      const basis = geo.omtrek();
      basis.setAttribute('fill', palet[Math.min(1, palet.length - 1)]);
      laag.appendChild(basis);

      const mosLaag = el('g', { 'clip-path': `url(#${klipId})` });
      laag.appendChild(mosLaag);

      if (state.mos !== 'bol') tekenMosvlekken(mosLaag, rnd, geo.binnen, palet);
      if (state.mos === 'bol' || state.mos === 'mix') tekenBolmos(mosLaag, rnd, geo.binnen, palet);
      if (state.mos === 'botanisch') {
        tekenVaren(mosLaag, 160, 300, -18, 110, palet[0]);
        tekenVaren(mosLaag, 290, 310, 20, 120, palet[palet.length - 1]);
      }
      if (state.rand === 'acacia') tekenHoutInleg(mosLaag, rnd, geo.binnen);
    }

    // rand als laatste, over het mos heen
    if (vlak && state.rand !== 'geen') {
      const randVorm = state.vorm === 'mandala'
        ? el('circle', { cx: 220, cy: 220, r: 160 })
        : GEOMETRIE[state.vorm].omtrek();
      randVorm.setAttribute('fill', 'none');
      randVorm.setAttribute('stroke', RANDEN[state.rand].kleur);
      randVorm.setAttribute('stroke-width', state.rand === 'acacia' ? 9 : 7);
      laag.appendChild(randVorm);
    }

    if (vlak && state.extras.includes('logo')) tekenLogo(laag);

    // zachte crossfade zodat de schets niet 'knippert' bij elke keuze
    if (!beweegNiet && laag.animate) {
      laag.animate(
        [
          { opacity: 0.3, transform: 'scale(0.985)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
  }

  /* --------------------------- Etiket en prijs --------------------------- */

  function etiketTekst() {
    const delen = [
      'Nº —',
      MOSSEN[state.mos].label,
      `${VORMEN[state.vorm].label} ${MATEN[state.maat].label}`,
    ];
    if (VORMEN[state.vorm].rand && state.rand !== 'geen') delen.push(RANDEN[state.rand].label);
    for (const id of state.extras) delen.push(EXTRAS[id].label);
    delen.push('Eersel');
    return delen.join(' · ');
  }

  let getoondBedrag = 0;

  function renderUitvoer() {
    document.getElementById('cfg-etiket').textContent = etiketTekst();
    const prijsEl = document.getElementById('cfg-prijs');
    const bedrag = prijsIndicatie();

    if (bedrag <= 0) {
      prijsEl.textContent = 'prijs op aanvraag';
      getoondBedrag = 0;
      return;
    }

    // de prijs telt vloeiend naar het nieuwe bedrag
    if (beweegNiet || getoondBedrag === 0) {
      prijsEl.textContent = `vanaf € ${bedrag} (indicatie)`;
      getoondBedrag = bedrag;
      return;
    }
    const van = getoondBedrag;
    const start = performance.now();
    const duur = 380;
    getoondBedrag = bedrag;
    (function stap(nu) {
      const t = Math.min(1, (nu - start) / duur);
      const zacht = 1 - Math.pow(1 - t, 3);
      const tussen = Math.round((van + (bedrag - van) * zacht) / 5) * 5;
      prijsEl.textContent = `vanaf € ${tussen} (indicatie)`;
      if (t < 1) requestAnimationFrame(stap);
    })(start);
  }

  function renderAlles() {
    renderPresets();
    renderOpties();
    tekenPreview();
    renderUitvoer();
  }

  /* ------------------------------- Aanvraag ------------------------------ */

  function samenvatting() {
    const regels = [
      'Mijn samenstelling via de configurator:',
      `· Vorm: ${VORMEN[state.vorm].label}`,
      `· Formaat: ${MATEN[state.maat].label}`,
      `· Mos: ${MOSSEN[state.mos].label}`,
      `· Kleur: ${KLEUREN[state.kleur].label}`,
    ];
    if (VORMEN[state.vorm].rand) regels.push(`· Rand: ${RANDEN[state.rand].label}`);
    if (state.extras.length) regels.push(`· Extra's: ${state.extras.map((id) => EXTRAS[id].label).join(', ')}`);
    const bedrag = prijsIndicatie();
    if (bedrag > 0) regels.push(`· Prijsindicatie: vanaf € ${bedrag}`);
    regels.push('', 'Ik hoor graag wat de mogelijkheden zijn.');
    return regels.join('\n');
  }

  document.getElementById('cfg-aanvragen').addEventListener('click', () => {
    const bericht = document.getElementById('contact-bericht');
    bericht.value = samenvatting();
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    // focus na het scrollen, zonder de pagina te laten springen
    setTimeout(() => document.getElementById('contact-naam').focus({ preventScroll: true }), 600);
  });

  /* ------------------------------ Interactie ----------------------------- */

  form.addEventListener('change', (e) => {
    const { name, value, checked } = e.target;
    if (name === 'extras') {
      state.extras = checked
        ? [...state.extras, value]
        : state.extras.filter((id) => id !== value);
    } else {
      state[name] = value;
    }
    actievePreset = null;
    renderAlles();
  });

  // Vanuit de detail-overlay: pas een preset toe die bij het werk hoort
  window.CONFIGURATOR = {
    pasPresetToe(id) {
      if (!PRESETS[id]) return false;
      Object.assign(state, structuredClone(PRESETS[id].state));
      actievePreset = id;
      renderAlles();
      return true;
    },
  };

  renderAlles();
})();
