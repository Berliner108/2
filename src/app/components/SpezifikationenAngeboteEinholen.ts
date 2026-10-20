import type { Specification } from '../angebote/VerfahrenUndLogistik'; // <--- Pfad ggf. anpassen!
export const specificationsMap: Record<string, Specification[]> = {
  Entlacken: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch', 'Thermisch', 'Mechanisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'Qualistrip',
      ]
    },
  ],
  Brünieren: [
  {
    type: 'radio',
    name: 'verfahren',
    label: 'Verfahren',
    options: ['Heißbrünieren', 'Kaltbrünieren', 'Schwarzoxidieren']
  },
  {
    type: 'group',
    name: 'zertifizierungen',
    label: 'Zertifizierungen:',
    tooltip: 'Wähle Zertifizierungen aus, die den Anbieter auszeichnen müssen.',
    options: [
      'ISO 9001',
      'ISO 14001',
      'RoHS / REACH'
    ]
  }
],
  Strahlen: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Sandstrahlen', 'Staubstrahlen', 'Glasperlen']
    },
  ],
  Eloxieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Normaleloxal', 'Harteloxal / Hartanodisieren', 'Chromsäureanodisieren'],
      required: true
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'Qualanod',
        'GSB',
        'ISO 9001',
        'ISO 14001',
        'ISO 45001',
        'RoHS / REACH'
      ]
    },
    {
      type: 'dropdown',
      name: 'farbeeloxieren',
      label: 'Farbe:',
      options: [
        'C-0 (Natureloxal)',
        'C-31 (Leichtbronze)',
        'C-32 (Hellbronze)',
        'C-33 (Mittelbronze)',
        'C-34 (Dunkelbronze)',
        'C-35 (Schwarz)',
        'C-36 (Hellgrau)',
        'C-37 (Mittelgrau)',
        'C-38 (Dunkelgrau)'
      ],
      dependsOn: { name: 'verfahren', value: 'Normaleloxal' }
    },
    {
      type: 'dropdown',
      name: 'farbeeloxieren',
      label: 'Farbe:',
      options: ['Natur / Eigenfarbe', 'Schwarz', 'Andere / Nach Vorgabe'],
      dependsOn: { name: 'verfahren', value: 'Harteloxal / Hartanodisieren' }
    },
    {
      type: 'dropdown',
      name: 'farbeeloxieren',
      label: 'Farbe:',
      options: ['Natur / Grau', 'Schwarz / Nach Vorgabe'],
      dependsOn: { name: 'verfahren', value: 'Chromsäureanodisieren' }
    },
    {
      type: 'group',
      name: 'anforderung',
      label: 'Optionale Anforderung:',
      options: ['CO₂-reduziertes / nachhaltiges Verfahren'],
      dependsOn: { name: 'verfahren', value: 'Harteloxal / Hartanodisieren' }
    },
  ],
  Verzinken: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Feuerverzinken', 'Galvanisches Verzinken', 'Zinklamellenbeschichtung', 'Mechanisches Verzinken']
    },
    {
      type: 'radio',
      name: 'galvanikSystem',
      label: 'Galvanisches Zinksystem:',
      options: ['Zink-Standard', 'Zink-Nickel', 'Zink-Eisen'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'radio',
      name: 'galvanikApplikation',
      label: 'Ausführung:',
      options: ['Trommelverfahren', 'Gestellverfahren'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'radio',
      name: 'galvanikPassivierung',
      label: 'Passivierung / Ausführung:',
      options: ['Blau', 'Gelb', 'Schwarz', 'Dickschichtpassivierung'],
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'group',
      name: 'galvanikNachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Versiegelung', 'Gleitmittelbeschichtung', 'Tempern'],
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'RAL-GZ',
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Zinkphosphatieren: [
  {
    type: 'text',
    name: 'schichtgewicht',
    label: 'Schichtgewicht (g/m²)',
    maxLength: 20
  },
  {
    type: 'radio',
    name: 'nachbehandlung',
    label: 'Nachbehandlung:',
    options: ['Keine', 'Geölt', 'Versiegelt']
  },
  {
    type: 'group',
    name: 'zertifizierungen',
    label: 'Zertifizierungen:',
    tooltip: 'Wähle Zertifizierungen aus, die den Anbieter auszeichnen müssen.',
    options: [
      'ISO 9001',
      'ISO 14001',
      'RoHS / REACH'
    ]
   }
],
  'Mn-Phosphatieren': [
    {
      type: 'text',
      name: 'schichtgewicht',
      label: 'Schichtgewicht (g/m²)',
      maxLength: 20
    },
    {
      type: 'radio',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: ['Keine', 'Geölt', 'Versiegelt']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Anbieter auszeichnen müssen.',
      options: ['ISO 9001', 'ISO 14001', 'RoHS / REACH']
    }
  ],
  'KTL-Beschichten': [
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Schichtdicke (µm)',
      maxLength: 20
    },
    {
      type: 'dropdown',
      name: 'farbton',
      label: 'Farbton:',
      options: [
        'Schwarz',
        'Grau',
        'Andere / Nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Anbieter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'IATF 16949',
        'RoHS / REACH'
      ]
    }
  ],
  Vernickeln: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Galvanisch'],
      required: true
    },
    {
      type: 'radio',
      name: 'chemischNickelPhosphor',
      label: 'Chemisch Nickel:',
      options: ['Mid Phos', 'High Phos'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Chemisch' }
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'ISO 45001',
        'RoHS / REACH'
      ]
    }
  ],
  Entnickeln: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Entzinnen: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Entzinken: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Einlagern: [
    {
      type: 'group',
      name: 'extra',
      label: 'Extra:',
      options: [
        'Trockenen lagern',
      ]
    }
  ],
  Isolierstegverpressen: [
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH',
        'RAL-GZ 607/3'
      ]
    }
  ],
  Folieren: [
    {
      type: 'radio',
      name: 'anwendung',
      label: 'Anwendung',
      options: ['Innen', 'Außen']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH',
        'RAL-GZ 716'
      ]
    }
  ],
  Verzinnen: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Galvanisch']
    },
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Glänzend', 'Matt']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Anodisieren: [
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'Qualanod',
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Aluminieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Schmelztauchaluminieren', 'Spritzaluminieren', 'Feueraluminieren']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'ISO 45001',
        'RoHS / REACH'
      ]
    }
  ],
  Enteloxieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'Qualanod',
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Entanodisieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Galvanisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'Qualanod',
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Entaluminieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Chemisch', 'Elektrochemisch', 'Mechanisch']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Verchromen: [
  {
    type: 'radio',
    name: 'verfahren',
    label: 'Verfahren:',
    options: [
      'Glanzverchromen',
      'Mattverchromen',
      'Hartverchromen'
    ],
    required: true
  },
  {
    type: 'radio',
    name: 'chromsystem',
    label: 'Chromsystem:',
    options: ['Chrom(III)', 'Chrom(VI)', 'Nach Vorgabe / unbekannt']
  }
],
  'Aluminium-Passivieren': [
    {
      type: 'radio',
      name: 'passivierungsart',
      label: 'Passivierung:',
      options: ['Chrom(III)-Passivierung', 'Chromfreie Passivierung', 'Chrom(VI) / Gelbchromatierung'],
      required: true
    },
    {
      type: 'group',
      name: 'anforderung',
      label: 'Anforderung:',
      options: ['Korrosionsschutz', 'Lackhaftung', 'Elektrische Leitfähigkeit']
    }
  ],
  Elektropolieren: [
    {
      type: 'radio',
      name: 'anwendungsbereich',
      label: 'Anwendungsbereich:',
      options: ['Lebensmittel', 'Pharma', 'Medizintechnik', 'Industrie allgemein'],
      required: true
    }
  ],
  Vermessingen: [
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Glänzend', 'Matt', 'Antik / Patiniert'],
      required: true
    }
  ],
  Verkupfern: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Galvanisch', 'Chemisch'],
      required: true
    }
  ],
  Vergolden: [
    {
      type: 'radio',
      name: 'goldart',
      label: 'Goldart:',
      options: ['Reingold', 'Hartgold'],
      required: true
    },
    {
      type: 'radio',
      name: 'anwendung',
      label: 'Anwendung:',
      options: ['Dekorativ', 'Technisch'],
      required: true
    }
  ],
  Versilbern: [
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Technisch', 'Dekorativ', 'Hartversilbern'],
      required: true
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: ['ISO 9001', 'ISO 14001', 'RoHS / REACH']
    }
  ],
  Nasslackieren: [
    {
      type: 'dropdown',
      name: 'farbpalette',
      label: 'Farbpalette:',
      options: ['RAL', 'NCS', 'MCS', 'DB', 'BS', 'Munsell', 'Candy', 'Neon', 'Pantone', 'Sikkens', 'HKS', 'Klarlack', 'Sonderfarbe / Nach Vorlage', 'RAL D2-Design', 'RAL E4-Effekt']
    },
    {
      type: 'text',
      name: 'farbton',
      label: 'Farbtonbezeichnung oder Artikelnummer',
      maxLength: 40,      // 👈 z.B. 40 Zeichen
      showCounter: true   // 👈 Counter anzeigen
    },
    {
      type: 'dropdown',
      name: 'glanzgrad',
      label: 'Glanzgrad:',
      options: ['Hochglanz', 'Seidenglanz', 'Glanz', 'Matt', 'Seidenmatt', 'Stumpfmatt']
    },
    {
      type: 'dropdown',
      name: 'oberfläche',
      label: 'Oberfläche:',
      options: ['Glatt', 'Feinstruktur', 'Grobstruktur']
    },
    {
      type: 'group',
      name: 'effekte',
      label: 'Effekte:',
      tooltip: 'Weitere Effekte kannst du in der Beschreibung angeben.',
      options: ['Metallic', 'Fluoreszierend']
    },
    {
      type: 'group',
      name: 'extras',
      label: 'Extras:',
      tooltip: 'Weitere Angaben kannst du in der Beschreibung machen.',
      options: [
        'Zweifärbig ',
        'Duplexbeschichtung ',
        'Beigestellter Lack'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'GSB',
        'ISO 9001',
        'ISO 12944',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ],
  Pulverbeschichten: [
    {
      type: 'dropdown',
      name: 'farbpalette',
      label: 'Farbpalette:',
      options: ['RAL', 'NCS', 'MCS', 'DB', 'BS', 'Munsell', 'Candy', 'Neon', 'Pantone', 'Sikkens', 'HKS', 'Klarlack', 'Sonderfarbe / Nach Vorlage', 'RAL D2-Design', 'RAL E4-Effekt']
    },
    {
      type: 'text',
      name: 'farbton',
      label: 'Farbtonbezeichnung oder Artikelnummer',
      maxLength: 40,
      showCounter: true
    },
    {
      type: 'dropdown',
      name: 'glanzgrad',
      label: 'Glanzgrad:',
      options: ['Hochglanz', 'Seidenglanz', 'Glanz', 'Matt', 'Seidenmatt', 'Stumpfmatt']
    },
    {
      type: 'dropdown',
      name: 'oberfläche',
      label: 'Oberfläche:',
      options: ['Glatt', 'Feinstruktur', 'Grobstruktur']
    },
    {
      type: 'dropdown',
      name: 'qualität',
      label: 'Pulverlack-Qualität:',
      options: ['Polyester', 'Epoxy-Polyester', 'Polyurethan','Polyester für Feuerverzinkung', 'Thermoplast']
    },
    {
      type: 'group',
      name: 'effekte',
      label: 'Effekte:',
      tooltip: 'Weitere Effekte kannst du in der Beschreibung angeben.',
      options: ['Metallic', 'Fluoreszierend']
    },
    {
      type: 'group',
      name: 'extras',
      label: 'Extras:',
      tooltip: 'Weitere Angaben kannst du in der Beschreibung machen.',
      options: [
        'Zweifärbig ',
        'Duplexbeschichtung ',
        'Beigestellter Lack'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'GSB',
        'Qualicoat',
        'Qualisteelcoat',
        'ISO 9001',
        'ISO 14001',
        'RoHS / REACH'
      ]
    }
  ]
};
