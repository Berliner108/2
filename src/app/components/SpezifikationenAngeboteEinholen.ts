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
      label: 'Strahlverfahren:',
      options: ['Sandstrahlen', 'Glasperlenstrahlen', 'Korundstrahlen', 'Stahlkiesstrahlen', 'Keramikperlenstrahlen', 'Sodastrahlen', 'Kunststoffstrahlen', 'Kugelstrahlen / Shot Peening', 'Staubstrahlen', 'Andere / Nach Vorgabe']
    },
    {
      type: 'group',
      name: 'strahlziel',
      label: 'Bearbeitungsziel:',
      options: ['Entrosten', 'Entzundern', 'Entlacken', 'Aufrauen', 'Mattieren', 'Entgraten', 'Verdichten / Verfestigen']
    }
  ],
  Eloxieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Normaleloxal', 'Harteloxal / Hartanodisieren', 'Chromsäureanodisieren', 'Tioxal', 'Ematal'],
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
    {
      type: 'text',
      name: 'sonderverfahrenVorgabe',
      label: 'Zusätzliche Vorgabe / gewünschte Oberfläche',
      maxLength: 80,
      dependsOn: { name: 'verfahren', value: 'Tioxal' }
    },
    {
      type: 'text',
      name: 'sonderverfahrenVorgabe',
      label: 'Zusätzliche Vorgabe / gewünschte Oberfläche',
      maxLength: 80,
      dependsOn: { name: 'verfahren', value: 'Ematal' }
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
      options: ['Zink-Standard', 'Zink-Nickel', 'Zink-Eisen', 'Zinn-Zink'],
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
      label: 'Passivierung / Chromatierung:',
      options: [
        'Blaupassivieren',
        'Gelbpassivieren',
        'Dickschichtpassivieren',
        'Schwarzpassivieren',
        'Schwarzchromatieren',
        'Andere / nach Vorgabe',
        'Keine / nicht erforderlich'
      ],
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
  Beizen: [
    {
      type: 'dropdown',
      name: 'beizwerkstoff',
      label: 'Werkstoff / Beizart:',
      options: [
        'Edelstahl',
        'Stahl',
        'Aluminium',
        'Andere / nach Vorgabe'
      ],
      required: true
    },
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Beizverfahren:',
      options: ['Chemisch', 'Elektrochemisch', 'Nach Vorgabe']
    },
    {
      type: 'group',
      name: 'bearbeitungsziel',
      label: 'Bearbeitungsziel:',
      options: ['Entrosten', 'Entzundern', 'Aktivieren / Vorbehandeln']
    },
    {
      type: 'text',
      name: 'vorgabe',
      label: 'Beizmedium / Norm / Vorgabe',
      maxLength: 80
    }
  ],
  Entgraten: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Mechanisch', 'Thermisch', 'Elektrochemisch', 'Gleitschleifen', 'Nach Vorgabe']
    },
    {
      type: 'group',
      name: 'anforderung',
      label: 'Anforderung:',
      options: ['Gratfrei', 'Kanten brechen', 'Definierte Kantenverrundung']
    },
    {
      type: 'text',
      name: 'kantenradius',
      label: 'Gewünschter Kantenradius / Vorgabe',
      maxLength: 40
    }
  ],
  Verrunden: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Mechanisch', 'Gleitschleifen', 'Bürsten / Schleifen', 'Nach Vorgabe']
    },
    {
      type: 'text',
      name: 'kantenradius',
      label: 'Gewünschter Kantenradius (mm)',
      maxLength: 30
    }
  ],
  Glätten: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Mechanisch', 'Gleitschleifen', 'Chemisch', 'Nach Vorgabe']
    },
    {
      type: 'text',
      name: 'rauheit',
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    }
  ],
  Mattieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Mechanisch', 'Chemisch', 'Strahlen', 'Nach Vorgabe']
    },
    {
      type: 'text',
      name: 'oberflaechenziel',
      label: 'Gewünschte Optik / Rauheit',
      maxLength: 60
    }
  ],
  Schleifen: [
    {
      type: 'text',
      name: 'koernung',
      label: 'Körnung / Schleifmittel',
      maxLength: 40
    },
    {
      type: 'text',
      name: 'rauheit',
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    },
    {
      type: 'radio',
      name: 'schliffbild',
      label: 'Schliffbild:',
      options: ['Längsschliff', 'Kreuzschliff', 'Nach Vorgabe']
    }
  ],
  Polieren: [
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Technisch', 'Dekorativ', 'Hochglanz', 'Nach Vorgabe']
    },
    {
      type: 'text',
      name: 'rauheit',
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    }
  ],
  Bürsten: [
    {
      type: 'radio',
      name: 'schliffbild',
      label: 'Bürstbild:',
      options: ['Längs', 'Quer', 'Kreuz', 'Nach Vorgabe']
    },
    {
      type: 'text',
      name: 'koernung',
      label: 'Körnung / Bürstenangabe',
      maxLength: 40
    }
  ],
  Trowalisieren: [
    {
      type: 'group',
      name: 'bearbeitungsziel',
      label: 'Bearbeitungsziel:',
      options: ['Entgraten', 'Kantenverrunden', 'Glätten', 'Polieren', 'Reinigen / Entfetten', 'Entzundern / Entrosten']
    },
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Vibrationsgleitschleifen', 'Trommelgleitschleifen', 'Fliehkraft- / Schleppfinish', 'Nach Vorgabe']
    }
  ],
  'Chemisches Glänzen': [
    {
      type: 'group',
      name: 'bearbeitungsziel',
      label: 'Bearbeitungsziel:',
      options: ['Glanzsteigerung', 'Einebnen / Glätten', 'Vorbehandlung vor Eloxieren']
    },
    {
      type: 'text',
      name: 'vorgabe',
      label: 'Norm / Oberflächenvorgabe',
      maxLength: 80
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
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
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
      label: 'Verchromungsart:',
      options: [
        'Dekorativverchromen',
        'Hartverchromen',
        'Nach Vorgabe / unbekannt'
      ],
      required: true
    },
    {
      type: 'dropdown',
      name: 'chromoptik',
      label: 'Oberfläche / Optik:',
      options: [
        'Hochglanz',
        'Matt / satiniert',
        'Strichmatt',
        'Perlglanz / Perlmutt',
        'Rauchchrom dunkel – matt',
        'Rauchchrom dunkel – hochglanz',
        'Champagner',
        'Andere / nach Muster'
      ],
      dependsOn: { name: 'verfahren', value: 'Dekorativverchromen' }
    },
    {
      type: 'radio',
      name: 'chromsystem',
      label: 'Chromsystem:',
      options: ['Chrom(III)', 'Chrom(VI)', 'Nach Vorgabe / unbekannt']
    },
    {
      type: 'dropdown',
      name: 'schichtaufbau',
      label: 'Schichtaufbau:',
      options: [
        'Direkt auf Grundwerkstoff',
        'Nickel – Chrom',
        'Kupfer – Nickel – Chrom',
        'Andere / nach Vorgabe',
        'Unbekannt'
      ],
      dependsOn: { name: 'verfahren', value: 'Dekorativverchromen' }
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
    },
    {
      type: 'group',
      name: 'chromNachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Passivieren', 'Versiegeln', 'Andere / Nach Vorgabe']
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
  Bronzebeschichten: [
    {
      type: 'radio',
      name: 'bronzeart',
      label: 'Bronzeart:',
      options: ['Weißbronze', 'Gelbbronze', 'Andere Bronzelegierung / Nach Vorgabe'],
      required: true
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Versiegeln', 'Anlaufschutz', 'Passivieren']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: ['ISO 9001', 'ISO 14001', 'RoHS / REACH']
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
    },
    {
      type: 'radio',
      name: 'schichtaufbau',
      label: 'Schichtaufbau / Ausführung:',
      options: [
        'Direktvergoldung von Edelstahl',
        'Vergoldung mit Zwischenschicht',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Versiegeln', 'Anlaufschutz', 'Passivieren']
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
      maxLength: 40,      // 👈 z.B. 40 Zeichen
      showCounter: true   // 👈 Counter anzeigen
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
