export type NavLink = { href: string; text: string }
export type NavItem = { title: string; href: string; links: NavLink[] }

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Aufträge vergeben',
    href: '/angebote',
    links: [
      { href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },
      { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },
      { href: '/angebote?first=Verzinken', text: 'Verzinken' },
      { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },
      { href: '/angebote?first=Strahlen', text: 'Strahlen' },
      { href: '/angebote?first=Entlacken', text: 'Entlacken' },
      { href: '/angebote?first=Einlagern', text: 'Einlagern' },
      { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },
      { href: '/angebote?first=Folieren', text: 'Folieren' },
      { href: '/angebote', text: 'Kombiniert' }
    ]
  },
  {
    title: 'Lacke beschaffen',
    href: '/sonderlacke',
    links: [
      { href: '/sonderlacke?kategorie=nasslack', text: 'Nasslack' },
      { href: '/sonderlacke?kategorie=pulverlack', text: 'Pulverlack' }
    ]
  },
  {
    title: 'Shop',
    href: '/kaufen',
    links: [
      { href: '/kaufen?kategorie=Nasslack', text: 'Nasslacke' },
      { href: '/kaufen?kategorie=Pulverlack', text: 'Pulverlacke' },
      { href: '/kaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' }
    ]
  },
  
  {
    title: 'Auftragsbörse',
    href: '/auftragsboerse',
    links: [
      { href: '/auftragsboerse?verfahren=Nasslackieren',          text: 'Nasslackieren' },
      { href: '/auftragsboerse?verfahren=Pulverbeschichten',      text: 'Pulverbeschichten' },
      { href: '/auftragsboerse?verfahren=Verzinken',              text: 'Verzinken' },
      { href: '/auftragsboerse?verfahren=Eloxieren',              text: 'Eloxieren' },
      { href: '/auftragsboerse?verfahren=Strahlen',               text: 'Strahlen' },
      { href: '/auftragsboerse?verfahren=Entlacken',              text: 'Entlacken' },
      { href: '/auftragsboerse?verfahren=Einlagern',              text: 'Einlagern' },
      { href: '/auftragsboerse?verfahren=Isolierstegverpressung', text: 'Isolierstegverpressung' },
      { href: '/auftragsboerse?verfahren=Folieren',               text: 'Folieren' },
      { href: '/auftragsboerse',                                  text: 'Alle' }
    ]
  },
  
  {
    title: 'Lackanfragen-Börse',
    href: '/lackanfragen',
    links: [
      { href: '/lackanfragen?kategorie=Nasslack', text: 'Nasslack' },
      { href: '/lackanfragen?kategorie=Pulverlack', text: 'Pulverlack' }
    ]
  },
  {
    title: 'Verkaufen',
    href: '/verkaufen',
    links: [
      { href: '/verkaufen?kategorie=Nasslack', text: 'Nasslacke' },
      { href: '/verkaufen?kategorie=Pulverlack', text: 'Pulverlacke' },
      { href: '/verkaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' }
    ]
  },
  {
    title: 'Wissenswertes',
    href: '/wissenswertes',
    links: [
      { href: '/wissenswertes', text: 'Überblick' },
      { href: '/wissenswertes#Sofunktioniert’s', text: 'Vorteile' },
      { href: '/wissenswertes#standardablauf', text: 'Ablauf' },
      { href: '/wissenswertes#verfahren', text: 'Verfahren' },
      { href: '/wissenswertes#vision-mission', text: 'Vision und Mission' }
  ]
  },
  
  {
    title: 'Mein Konto',
    href: '/konto',
    links: [
      { href: '/konto/angebote',       text: 'Aufträge Angebote' },
      { href: '/konto/auftraege',      text: 'Aufträge' },
      { href: '/konto/bestellungen',   text: 'Bestellungen' },
      { href: '/konto/lackanfragen',   text: 'Lackanfragen Angebote' },
      { href: '/konto/lackangebote',   text: 'Lackanfragen-Deals' },
      { href: '/konto/verkaufen',      text: 'Verkaufen' },
      { href: '/konto/einstellungen',  text: 'Einstellungen' },
      { href: '/messages?empfaenger=${messageTarget}',    text: 'Nachrichten' }
    ]
  }
]
