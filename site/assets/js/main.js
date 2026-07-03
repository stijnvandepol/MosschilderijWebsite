/*
 * Sitebrede interactie: laadsequentie, navigatie, scroll-onthulling,
 * collectiefilter, detail-overlay en het contactformulier.
 * Alles werkt óók zonder JavaScript: de kaarten en teksten staan in de HTML.
 */
(function () {
  'use strict';

  const config = window.SITE_CONFIG || {};
  const werken = window.WERKEN || {};
  const beweegNiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------- Laadsequentie ----------------------------- */
  // html.js activeert de verborgen beginstanden; html.klaar speelt de
  // hero-choreografie af. De preloader toont het merk kort als etiket en
  // schuift dan omhoog — daarna pas start de hero. Bij een herhaald bezoek
  // (zelfde sessie) of reduced motion slaan we hem over.

  document.documentElement.classList.add('js');

  const preloader = document.getElementById('preloader');
  const startHero = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.documentElement.classList.add('klaar'));
    });
  };

  let alBezocht = false;
  try {
    alBezocht = sessionStorage.getItem('moskunst-bezocht') === '1';
    sessionStorage.setItem('moskunst-bezocht', '1');
  } catch { /* privémodus zonder storage: preloader gewoon tonen */ }

  if (!preloader || beweegNiet || alBezocht) {
    preloader?.remove();
    startHero();
  } else {
    // wachten op de fonts (met plafond) zodat het merk niet in fallback flitst
    const fontsKlaar = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsKlaar, new Promise((r) => setTimeout(r, 700))]).then(() => {
      setTimeout(() => {
        preloader.classList.add('preloader--klaar');
        startHero();
        setTimeout(() => preloader.remove(), 900);
      }, 250);
    });
  }

  /* ------------------------------ Navigatie ------------------------------ */

  const topbalk = document.querySelector('.topbalk');
  const hamburger = document.querySelector('.hoofdnav__hamburger');
  const navlijst = document.getElementById('navlijst');

  hamburger.addEventListener('click', () => {
    const open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!open));
    navlijst.classList.toggle('is-open', !open);
  });

  navlijst.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      hamburger.setAttribute('aria-expanded', 'false');
      navlijst.classList.remove('is-open');
    }
  });

  // de balk is donker op de hero en wordt licht zodra de hero voorbij is
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([entry]) => {
    topbalk.classList.toggle('topbalk--licht', !entry.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

  // verbergen bij naar beneden scrollen, tonen bij omhoog
  let vorigeScroll = window.scrollY;
  function bijwerkBalk() {
    const y = window.scrollY;
    const omlaag = y > vorigeScroll;
    topbalk.classList.toggle(
      'topbalk--verborgen',
      omlaag && y > 480 && !navlijst.classList.contains('is-open')
    );
    vorigeScroll = y;
  }
  window.addEventListener('scroll', bijwerkBalk, { passive: true });
  bijwerkBalk();

  // scrollspy: markeer de sectie die in beeld is
  const spyLinks = new Map(
    [...document.querySelectorAll('[data-spy]')].map((a) => [a.dataset.spy, a])
  );
  const spyKijker = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      spyLinks.forEach((a, id) => a.classList.toggle('is-actief', id === entry.target.id));
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  spyLinks.forEach((_, id) => {
    const sectie = document.getElementById(id);
    if (sectie) spyKijker.observe(sectie);
  });

  /* -------------------------- Scroll-onthulling -------------------------- */

  const onthullers = document.querySelectorAll(
    '.werk-kaart, .kenmerk, .werkwijze__stap, .sectie__kop, .contact-formulier, .contact__direct, .over__tekst'
  );

  if (beweegNiet || !('IntersectionObserver' in window)) {
    // geen beweging: alles direct zichtbaar, inclusief de getekende lijntjes
    onthullers.forEach((elm) => elm.classList.add('is-zichtbaar'));
  } else {
    const kijker = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-zichtbaar');
          kijker.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px' });

    onthullers.forEach((elm, i) => {
      elm.classList.add('onthul');
      // lichte stagger binnen een rij, niet over de hele pagina
      elm.style.setProperty('--onthul-vertraging', `${(i % 4) * 80}ms`);
      kijker.observe(elm);
    });
  }

  /* --------------------------- Collectiefilter --------------------------- */

  const chips = document.querySelectorAll('.filter-chip');
  const kaarten = document.querySelectorAll('.werk-kaart');
  const leegMelding = document.getElementById('collectie-leeg');

  function pasFilterToe(filter) {
    let zichtbaar = 0;
    kaarten.forEach((kaart) => {
      const past = filter === 'alles' || kaart.dataset.cat.split(' ').includes(filter);
      kaart.hidden = !past;
      if (past) zichtbaar++;
    });
    leegMelding.hidden = zichtbaar > 0;
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => {
        c.classList.toggle('is-actief', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      // vloeiende herschikking van het grid waar de browser dat kan
      if (document.startViewTransition && !beweegNiet) {
        document.startViewTransition(() => pasFilterToe(chip.dataset.filter));
      } else {
        pasFilterToe(chip.dataset.filter);
      }
    });
  });

  /* ---------------------------- Detail-overlay --------------------------- */

  const dialoog = document.getElementById('werk-detail');
  const hoofdfoto = document.getElementById('detail-hoofdfoto');
  const thumbs = document.getElementById('detail-thumbs');
  let actiefWerkId = null;

  function fotoPad(werk, nummer) {
    return `assets/images/werken/${werk.map}/foto-${String(nummer).padStart(2, '0')}.webp`;
  }

  function toonFoto(werk, nummer) {
    hoofdfoto.src = fotoPad(werk, nummer);
    hoofdfoto.alt = `${werk.alt} — foto ${nummer} van ${werk.fotos}`;
    thumbs.querySelectorAll('button').forEach((knop, i) => {
      knop.classList.toggle('is-actief', i + 1 === nummer);
    });
  }

  function openDetail(id) {
    const werk = werken[id];
    if (!werk) return;
    actiefWerkId = id;

    document.getElementById('detail-titel').textContent = werk.titel;
    document.getElementById('detail-etiket').textContent = werk.etiket;
    document.getElementById('detail-omschrijving').textContent = werk.omschrijving;
    document.getElementById('detail-prijs').textContent =
      werk.prijs === 'op aanvraag' ? 'Prijs op aanvraag' : `Prijs: ${werk.prijs}`;

    thumbs.replaceChildren(...Array.from({ length: werk.fotos }, (_, i) => {
      const li = document.createElement('li');
      const knop = document.createElement('button');
      knop.type = 'button';
      const img = document.createElement('img');
      img.src = fotoPad(werk, i + 1);
      img.alt = '';
      img.loading = 'lazy';
      knop.appendChild(img);
      knop.setAttribute('aria-label', `Foto ${i + 1} van ${werk.fotos}`);
      knop.addEventListener('click', () => toonFoto(werk, i + 1));
      li.appendChild(knop);
      return li;
    }));

    toonFoto(werk, 1);
    dialoog.showModal();
  }

  document.querySelectorAll('.werk-kaart__knop').forEach((knop) => {
    knop.addEventListener('click', () => openDetail(knop.closest('.werk-kaart').dataset.werk));
  });

  dialoog.querySelector('.werk-detail__sluit').addEventListener('click', () => dialoog.close());
  dialoog.addEventListener('click', (e) => {
    // klik op de backdrop (buiten de inhoud) sluit de overlay
    if (e.target === dialoog) dialoog.close();
  });

  document.getElementById('detail-aanvragen').addEventListener('click', () => {
    const werk = werken[actiefWerkId];
    dialoog.close();

    const bericht = document.getElementById('contact-bericht');
    bericht.value = `Ik heb interesse in "${werk.titel}" (Nº ${actiefWerkId}), of iets soortgelijks op maat.\n\n`;

    // heeft het werk een passende preset, dan start de configurator daarmee
    if (werk.preset && window.CONFIGURATOR && window.CONFIGURATOR.pasPresetToe(werk.preset)) {
      document.getElementById('op-maat').scrollIntoView({ behavior: 'smooth' });
    } else {
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => document.getElementById('contact-naam').focus({ preventScroll: true }), 600);
    }
  });

  /* ------------------------- Contact & kanalen --------------------------- */

  function toonKanaal(id, href, tekst) {
    const kanaal = document.getElementById(id);
    if (!kanaal) return;
    kanaal.href = href;
    if (tekst) kanaal.textContent = tekst;
    kanaal.hidden = false;
  }

  if (config.whatsapp) toonKanaal('kanaal-whatsapp', `https://wa.me/${config.whatsapp}`);
  if (config.email) toonKanaal('kanaal-email', `mailto:${config.email}`);
  if (config.marktplaats) {
    toonKanaal('kanaal-marktplaats', config.marktplaats);
    const voet = document.getElementById('voet-marktplaats');
    voet.querySelector('a').href = config.marktplaats;
    voet.hidden = false;
  }
  if (config.kvk) {
    const li = document.getElementById('voet-kvk');
    li.querySelector('span').textContent = config.kvk;
    li.hidden = false;
  }
  if (config.btw) {
    const li = document.getElementById('voet-btw');
    li.querySelector('span').textContent = config.btw;
    li.hidden = false;
  }

  /* --------------------------- Contactformulier -------------------------- */

  const formulier = document.getElementById('contact-formulier');
  const status = document.getElementById('formulier-status');

  // zonder echt endpoint kan een foto-upload nergens heen; verberg het veld dan
  if (!config.contactEndpoint) {
    document.getElementById('veld-upload').hidden = true;
  }

  function zetStatus(tekst, isFout) {
    status.textContent = tekst;
    status.classList.toggle('is-fout', Boolean(isFout));
  }

  formulier.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!formulier.reportValidity()) return;

    const naam = formulier.naam.value.trim();
    const email = formulier.email.value.trim();
    const bericht = formulier.bericht.value.trim();

    // Route 1: een echte formulierdienst (bv. Formspree)
    if (config.contactEndpoint) {
      const verstuurKnop = formulier.querySelector('[type="submit"]');
      verstuurKnop.disabled = true;
      zetStatus('Versturen…');
      try {
        const antwoord = await fetch(config.contactEndpoint, {
          method: 'POST',
          body: new FormData(formulier),
          headers: { Accept: 'application/json' },
        });
        if (!antwoord.ok) throw new Error(`Formulierdienst antwoordde met ${antwoord.status}`);
        formulier.reset();
        zetStatus('Verstuurd — je krijgt zo snel mogelijk antwoord.');
      } catch (fout) {
        console.error(fout);
        zetStatus('Versturen lukte niet. Probeer het nog eens, of mail direct.', true);
      } finally {
        verstuurKnop.disabled = false;
      }
      return;
    }

    // Route 2: nog geen endpoint ingesteld → open een e-mail met het bericht
    if (config.email) {
      const onderwerp = encodeURIComponent(`Aanvraag via de website — ${naam}`);
      const inhoud = encodeURIComponent(`${bericht}\n\nGroet,\n${naam}\n${email}`);
      window.location.href = `mailto:${config.email}?subject=${onderwerp}&body=${inhoud}`;
      zetStatus('Je e-mailprogramma opent met het bericht — verzenden doe je daar.');
      return;
    }

    // Route 3: niets geconfigureerd (alleen tijdens de bouwfase)
    zetStatus('Contactgegevens worden nog ingevuld — probeer het binnenkort opnieuw.', true);
  });

  /* ---------------------- Scroll-gekoppelde beweging ---------------------- */
  // Niets beweegt uit zichzelf: het materialenlint, de grote scrollstrook en
  // de tekstring in de hero verschuiven alleen mee met de scrollpositie.

  const schuifRegels = document.querySelectorAll('.schuiftekst__regel');
  const lintBaan = document.querySelector('.lint__baan');
  const heroRing = document.querySelector('.hero__ring');

  if (!beweegNiet) {
    let beweegTick = false;
    const beweegMee = () => {
      beweegTick = false;
      const y = window.scrollY;
      const vensterH = window.innerHeight;

      schuifRegels.forEach((regel) => {
        const rect = regel.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vensterH) return;
        const voortgang = (vensterH - rect.top) / (vensterH + rect.height);
        regel.style.transform = `translateX(${(0.5 - voortgang) * 320}px)`;
      });

      if (lintBaan) {
        // de baan bevat de reeks twee keer: modulo de helft loopt hij netjes rond
        const helft = lintBaan.scrollWidth / 2;
        if (helft > 0) lintBaan.style.transform = `translateX(${-((y * 0.3) % helft)}px)`;
      }

      if (heroRing && y < vensterH * 1.5) {
        heroRing.style.transform = `rotate(${y * 0.06}deg)`;
      }
    };
    window.addEventListener('scroll', () => {
      if (!beweegTick) { beweegTick = true; requestAnimationFrame(beweegMee); }
    }, { passive: true });
    beweegMee();
  }

  /* -------------------------- Magnetische knoppen ------------------------ */
  // primaire knoppen geven heel licht mee richting de muis; subtiel gehouden

  if (!beweegNiet && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('[data-magnetisch]').forEach((knop) => {
      knop.addEventListener('mousemove', (e) => {
        const rect = knop.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        knop.style.transform = `translate(${dx * 0.08}px, ${dy * 0.14}px)`;
      });
      knop.addEventListener('mouseleave', () => {
        knop.style.transform = '';
      });
    });
  }
})();
