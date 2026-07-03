/*
 * Prijsindicaties voor de configurator, in euro's.
 *
 * ROLAND: dit zijn voorbeeldbedragen — pas ze aan naar je echte tarieven.
 * Alleen de € 200 voor het logo-werk (Ø 80 + logo) is een bekende prijs.
 * Let op: met deze voorbeeldbedragen komt Ø 80 + logo uit op € 225 — pas
 * de basis of de logo-toeslag aan zodat het klopt met je echte prijs.
 * De site toont alles als "vanaf € X (indicatie)".
 */
window.PRIJZEN = {
  basis: {
    // per vorm, per formaat-id (zie configurator.js)
    'cirkel-d40': 90,
    'cirkel-d57': 130,
    'cirkel-d70': 160,
    'cirkel-d80': 190,
    'ovaal-70x50': 150,
    'ovaal-90x70': 200,
    'ovaal-maat': 220,
    'organisch-maat': 280,
    'mandala-d40': 100,
    'mandala-d57': 140,
    'mandala-d70': 170,
    'mandala-d80': 200,
    'schaal-standaard': 150,
    'sculptuur-standaard': 350,
  },
  toeslagen: {
    led: 40,        // achtergrondverlichting met afstandsbediening
    logo: 35,       // logo of symbool verwerkt
    acacia: 25,     // ingelegd acaciahout (randkeuze)
  },
};
