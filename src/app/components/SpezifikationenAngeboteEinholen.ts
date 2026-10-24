import type { Specification } from '../angebote/VerfahrenUndLogistik'; // <--- Pfad ggf. anpassen!
export const specificationsMap: Record<string, Specification[]> = {
  Entlacken: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entlackungsverfahren:',
      options: [
        'Chemisch',
        'Thermisch',
        'Mechanisch',
        'Laserentlackung',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'QUALISTRIP',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen Beschichtung (z. B. Pulverlack, Nasslack, KTL), gewünschter Entlackungsumfang, zulässiger Materialabtrag bzw. Anforderungen an den Grundwerkstoff, notwendige Nachreinigung oder Konservierung sowie konkrete Prüf- oder Qualitätsvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Brünieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Brünierverfahren:',
      options: [
        'Heißbrünieren',
        'Kaltbrünieren',
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN 50938',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Optik, Anforderungen an Korrosionsschutz und Maßhaltigkeit, gewünschte Nachbehandlung bzw. Konservierung (z. B. Ölen), besondere tribologische Anforderungen sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Strahlen: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Strahlverfahren:',
      options: [
        'Sandstrahlen',
        'Glasperlenstrahlen',
        'Korundstrahlen',
        'Stahlkiesstrahlen',
        'Keramikperlenstrahlen',
        'Sodastrahlen',
        'Kunststoffstrahlen',
        'Kugelstrahlen / Shot Peening',
        'Staubstrahlen',
        'Andere / Nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 8501-1',
        'ISO 8503',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Bearbeitungsziel (z. B. Entrosten, Entzundern, Entlacken, Aufrauen, Mattieren oder Entgraten), gewünschter Reinheitsgrad bzw. Oberflächenzustand, gewünschte Rauheit bzw. Rauheitsprofil, Strahlmittelvorgaben sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Eloxieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Eloxalverfahren:',
      options: [
        'Normaleloxal',
        'Harteloxal / Hartanodisieren',
        'Chromsäureanodisieren',
        'Tioxal',
        'Ematal'
      ],
      required: true
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
        'C-38 (Dunkelgrau)',
        'Andere / Nach Vorgabe'
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
      options: ['Natur / Grau', 'Schwarz', 'Andere / Nach Vorgabe'],
      dependsOn: { name: 'verfahren', value: 'Chromsäureanodisieren' }
    },
    {
      type: 'dropdown',
      name: 'eloxalverdichtung',
      label: 'Verdichtung:',
      options: ['Verdichten', 'Nicht verdichten', 'Nach Vorgabe / unbekannt']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'QUALANOD',
        'ISO 7599',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Anwendung (z. B. dekorativ oder technisch), Toleranzen, besondere optische oder technische Anforderungen sowie konkrete Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Verzinken: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Verzinkungsverfahren:',
      options: ['Feuerverzinken', 'Galvanisches Verzinken', 'Zinklamellenbeschichtung', 'Mechanisches Verzinken'],
      required: true
    },
    {
      type: 'dropdown',
      name: 'galvanikSystem',
      label: 'Galvanisches Zinksystem:',
      options: ['Zink-Standard', 'Zink-Nickel', 'Zink-Eisen', 'Zinn-Zink'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'dropdown',
      name: 'galvanikApplikation',
      label: 'Ausführung:',
      options: ['Trommelverfahren', 'Gestellverfahren'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Galvanisches Verzinken' }
    },
    {
      type: 'dropdown',
      name: 'galvanikPassivierung',
      label: 'Passivierung / Chromatierung:',
      options: [
        'Blau / transparent',
        'Dickschichtpassivierung',
        'Schwarzpassivierung',
        'Gelbchromatierung',
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
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN EN ISO 1461',
        'DASt-Richtlinie 022',
        'EN 1090',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicken, Korrosionsschutzanforderungen, besondere Normvorgaben sowie konstruktive Anforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  'KTL-Beschichten': [
    {
      type: 'dropdown',
      name: 'farbton',
      label: 'Farbton:',
      options: [
        'Schwarz',
        'Grau',
        'Andere / nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'IATF 16949',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Korrosionsschutzanforderungen, Vorbehandlung, konkrete Prüf- oder Normvorgaben sowie weitere technische Anforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Zinkphosphatieren: [
    {
      type: 'dropdown',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: [
        'Keine',
        'Geölt',
        'Versiegelt',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9717',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschtes Schichtgewicht, Korrosionsschutzanforderungen, Vorbehandlung, konkrete Prüf- oder Normvorgaben sowie weitere technische Anforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  'Mn-Phosphatieren': [
    {
      type: 'dropdown',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: [
        'Keine',
        'Geölt',
        'Versiegelt',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9717',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschtes Schichtgewicht, Korrosionsschutz- und Gleiteigenschaften, Vorbehandlung, konkrete Prüf- oder Normvorgaben sowie weitere technische Anforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Beizen: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Beizverfahren:',
      options: [
        'Chemisch',
        'Elektrochemisch',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'EN ISO 8504-4',
        'ASTM A380/A380M',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Bearbeitungsziel (z. B. Entrosten, Entzundern, Entfernen von Oxidschichten oder Aktivieren), gewünschter Materialabtrag, Beizmedium, besondere Oberflächenanforderungen, anschließende Passivierung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Entgraten: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entgratverfahren:',
      options: [
        'Mechanisch',
        'Thermisch',
        'Elektrochemisch',
        'Gleitschleifen',
        'Bürsten / Schleifen',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 13715',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Anforderungen wie gratfrei, Kanten brechen, gewünschter Kantenradius bzw. definierte Kantenverrundung, zulässiger Materialabtrag sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Verrunden: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Verrundungsverfahren:',
      options: [
        'Gleitschleifen',
        'Bürsten / Schleifen',
        'Strahlen',
        'Mechanisch',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 13715',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschter Kantenradius bzw. Umfang der Verrundung, zu bearbeitende Innen- oder Außenkanten, zulässiger Materialabtrag sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Glätten: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Glättverfahren:',
      options: [
        'Mechanisch',
        'Gleitschleifen',
        'Chemisch',
        'Elektropolieren',
        'Bürsten / Schleifen',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 21920',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Oberflächenrauheit bzw. Ra-/Rz-Werte, zulässiger Materialabtrag, optische Anforderungen sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Mattieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Mattierverfahren:',
      options: [
        'Strahlen',
        'Schleifen',
        'Bürsten',
        'Chemisch',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 21920',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschter Mattierungsgrad, Oberflächenrauheit bzw. Ra-/Rz-Werte, gewünschtes Strahl- oder Schliffbild, zulässiger Materialabtrag sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Schleifen: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Schleifverfahren:',
      options: [
        'Bandschleifen',
        'Flachschleifen',
        'Rundschleifen',
        'Handschleifen',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 21920',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Körnung, Oberflächenrauheit bzw. Ra-/Rz-Werte, Schliffbild und Schleifrichtung, zulässiger Materialabtrag sowie konkrete Maß-, Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Polieren: [
    {
      type: 'dropdown',
      name: 'ausfuehrung',
      label: 'Polierausführung:',
      options: [
        'Technisch',
        'Dekorativ',
        'Hochglanz',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 21920',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschter Glanzgrad bzw. Referenzoberfläche, Oberflächenrauheit bzw. Ra-/Rz-Werte, zulässiger Materialabtrag sowie konkrete optische, Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Bürsten: [
    {
      type: 'dropdown',
      name: 'ausfuehrung',
      label: 'Bürstausführung:',
      options: [
        'Technisch',
        'Dekorativ',
        'Mattierend',
        'Entgraten / Kanten brechen',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 21920',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschtes Bürstbild, Bürstrichtung, Körnung bzw. gewünschte Oberflächenrauheit, Anforderungen an Kanten und Entgratung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Trowalisieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Trowalisierverfahren:',
      options: [
        'Vibrationsgleitschleifen',
        'Trommelgleitschleifen',
        'Fliehkraftgleitschleifen',
        'Schleppschleifen',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN 8589',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Bearbeitungsziel (z. B. Entgraten, Kanten verrunden, Glätten, Polieren, Mattieren oder Reinigen), gewünschte Oberflächenrauheit, zulässiger Materialabtrag sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  'Chemisches Glänzen': [
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN 17611',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschter Glanzgrad bzw. Referenzoberfläche, zulässiger Materialabtrag, gewünschte Folgebehandlung (z. B. Eloxieren) sowie konkrete optische, Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Vernickeln: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Vernickelungsverfahren:',
      options: [
        'Galvanisches Vernickeln',
        'Chemisch Vernickeln'
      ],
      required: true
    },
    {
      type: 'dropdown',
      name: 'chemischNickelPhosphor',
      label: 'Nickel-Phosphor-Ausführung:',
      options: [
        'Low Phos',
        'Mid Phos',
        'High Phos'
      ],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Chemisch Vernickeln' }
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 4526',
        'ISO 4527',
        'ISO 1456',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Anforderungen an Korrosionsschutz, Verschleiß, Härte, Maßhaltigkeit oder Optik, gewünschte Wärmebehandlung bzw. Nachbehandlung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Entnickeln: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entnickelungsverfahren:',
      options: [
        'Chemisch',
        'Elektrochemisch'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Aktivieren / Dekapieren',
        'Konservieren / Korrosionsschutz',
        'Vorbereitung für Neubeschichtung'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art der vorhandenen Nickelschicht (z. B. galvanisch, chemisch Nickel bzw. Nickel-Phosphor), gewünschter Entnickelungsumfang, Grundwerkstoff und vorhandene Zwischen- oder Deckschichten, Schutz des Grundwerkstoffs, zulässiger Materialabtrag und gewünschter Oberflächenzustand, vorgesehene Folgebehandlung oder Neubeschichtung sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Entzinnen: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entzinnungsverfahren:',
      options: [
        'Chemisch',
        'Elektrochemisch'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Aktivieren / Dekapieren',
        'Konservieren / Korrosionsschutz',
        'Vorbereitung für Neubeschichtung'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen Zinn- bzw. Zinnlegierungsschicht, gewünschter Entzinnungsumfang, Grundwerkstoff und gegebenenfalls vorhandene Diffusions- oder Zwischenschichten, Schutz des Grundwerkstoffs, zulässiger Materialabtrag und gewünschter Oberflächenzustand, vorgesehene Folgebehandlung oder Neubeschichtung sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Entzinken: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entzinkungsverfahren:',
      options: [
        'Chemisch',
        'Elektrochemisch'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Konservieren / Korrosionsschutz',
        'Aktivieren für Neubeschichtung'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen Zinkschicht bzw. des Zink-Schichtsystems, gewünschter Entzinkungsumfang, Schutz des Grundwerkstoffs, Anforderungen an zulässigen Materialabtrag und Oberflächenzustand, vorgesehene Folgebehandlung oder Neubeschichtung sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
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
      type: 'dropdown',
      name: 'verfahren',
      label: 'Verzinnungsverfahren:',
      options: [
        'Galvanisches Verzinnen',
        'Feuerverzinnen / Schmelztauchverzinnen',
        'Chemisches Verzinnen'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN 50965',
        'ISO 2093',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Anforderungen an Lötbarkeit, Korrosionsschutz oder elektrische Eigenschaften, gewünschte Optik, eventuelle Nachbehandlung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Anodisieren: [
    {
      type: 'dropdown',
      name: 'anodisierfarbe',
      label: 'Farbe / Optik:',
      options: [
        'Natur / technisch',
        'Farbig',
        'Nach Vorgabe / Muster',
        'Unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Zertifizierungen:',
      tooltip: 'Wähle Normen oder Zertifizierungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'SAE / AMS nach Vorgabe',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Funktion der Beschichtung, konkrete Prozess- oder Normvorgaben sowie besondere technische und optische Anforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Aluminieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Aluminierverfahren:',
      options: [
        'Schmelztauchaluminieren / Feueraluminieren',
        'Thermisches Spritzaluminieren'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 2063',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Korrosions- und Hochtemperaturanforderungen, gewünschte Nachbehandlung bzw. Versiegelung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Enteloxieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Enteloxierverfahren:',
      options: [
        'Chemisch / Beizen'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Dekapieren / Aktivieren',
        'Vorbereitung für erneutes Eloxieren',
        'Konservieren / Korrosionsschutz'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen Eloxalschicht, gewünschter Enteloxierungsumfang, Schutz des Aluminiumgrundwerkstoffs, zulässiger Materialabtrag und gewünschter Oberflächenzustand, vorgesehene Folgebehandlung bzw. erneutes Eloxieren sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Entanodisieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entanodisierverfahren:',
      options: [
        'Chemisch / Beizen',
        'Mechanisch / Strahlen',
        'Nach Vorgabe / spezialchemisch'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Dekapieren / Aktivieren',
        'Vorbereitung für erneutes Anodisieren',
        'Konservieren / Korrosionsschutz'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen anodischen Oxidschicht, Grundwerkstoff und Legierung, gewünschter Entanodisierungsumfang, Schutz des Grundwerkstoffs, zulässiger Materialabtrag und gewünschter Oberflächenzustand, vorgesehene Folgebehandlung bzw. erneutes Anodisieren sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Entaluminieren: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Entaluminierverfahren:',
      options: [
        'Chemisch',
        'Elektrochemisch'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Neutralisieren / Spülen',
        'Aktivieren / Dekapieren',
        'Konservieren / Korrosionsschutz',
        'Vorbereitung für Neubeschichtung'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Art und Zustand der vorhandenen Aluminiumschicht, gewünschter Entaluminierungsumfang, Grundwerkstoff und gegebenenfalls vorhandene Zwischen- oder Diffusionsschichten, Schutz des Grundwerkstoffs, zulässiger Materialabtrag und gewünschter Oberflächenzustand, vorgesehene Folgebehandlung oder Neubeschichtung sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Verchromen: [
    {
      type: 'dropdown',
      name: 'verchromungsart',
      label: 'Verchromungsart:',
      options: [
        'Glanzverchromen',
        'Mattverchromen',
        'Hartverchromen',
        'Schwarzverchromen'
      ],
      required: true
    },
    {
      type: 'dropdown',
      name: 'chromsystem',
      label: 'Chromsystem:',
      options: [
        'Chrom(III)',
        'Chrom(VI)'
      ],
      required: true
    },
    {
      type: 'dropdown',
      name: 'chromoptik',
      label: 'Optik / Farbton:',
      options: [
        'Standard Chrom',
        'Perlglanz',
        'Rauchchrom / Dark Chrome',
        'Champagner',
        'Schwarz',
        'Nach Muster / Sonderoptik'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Glanzverchromen' }
    },
    {
      type: 'dropdown',
      name: 'chromoptik',
      label: 'Optik / Farbton:',
      options: [
        'Standard Chrom',
        'Perlglanz',
        'Rauchchrom / Dark Chrome',
        'Champagner',
        'Schwarz',
        'Nach Muster / Sonderoptik'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Mattverchromen' }
    },
    {
      type: 'dropdown',
      name: 'chromoptik',
      label: 'Optik / Farbton:',
      options: [
        'Standard Chrom',
        'Perlglanz',
        'Rauchchrom / Dark Chrome',
        'Champagner',
        'Schwarz',
        'Nach Muster / Sonderoptik'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Schwarzverchromen' }
    },
    {
      type: 'group',
      name: 'nachbehandlungDekorativ',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Passivieren',
        'Versiegeln',
        'Polieren'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Glanzverchromen' }
    },
    {
      type: 'group',
      name: 'nachbehandlungDekorativ',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Passivieren',
        'Versiegeln',
        'Polieren'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Mattverchromen' }
    },
    {
      type: 'group',
      name: 'nachbehandlungDekorativ',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Passivieren',
        'Versiegeln',
        'Polieren'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Schwarzverchromen' }
    },
    {
      type: 'group',
      name: 'nachbehandlungHartchrom',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Schleifen',
        'Honen',
        'Läppen',
        'Polieren',
        'Tempern / Wasserstoffentsprödung'
      ],
      dependsOn: { name: 'verchromungsart', value: 'Hartverchromen' }
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 1456',
        'ISO 6158',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Schichtaufbau und Zwischenschichten, gewünschte Optik bzw. Referenzoberfläche, Anforderungen an Härte, Verschleiß, Korrosionsschutz und Maßhaltigkeit sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  'Aluminium-Passivieren': [
    {
      type: 'dropdown',
      name: 'passivierungsart',
      label: 'Passivierungsart:',
      options: [
        'Chrom(III)-Passivierung',
        'Chromfreie Passivierung',
        'Chrom(VI)-Chromatierung / Gelbchromatierung'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN EN 12487',
        'ASTM B921',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Anforderungen an Korrosionsschutz, Lackhaftung, elektrische Leitfähigkeit bzw. Kontaktwiderstand, gewünschte Optik, anschließende Beschichtung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Elektropolieren: [
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'DIN EN ISO 15730',
        'ASTM B912',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Oberflächenrauheit bzw. Ra-/Rz-Werte, gewünschter Glanzgrad, zulässiger Materialabtrag, Anforderungen an Korrosionsbeständigkeit und Passivierung sowie konkrete Prüf-, Reinheits- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Vermessingen: [
    {
      type: 'dropdown',
      name: 'ausfuehrung',
      label: 'Ausführung / Optik:',
      options: [
        'Glänzend',
        'Matt',
        'Antik / Patiniert',
        'Vintage / Altmessing',
        'Nach Muster / Sonderoptik'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Klarlack / Versiegelung',
        'Polieren',
        'Patinieren / Färben'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschter Farbton bzw. Referenzoberfläche, Schichtaufbau und notwendige Zwischenschichten, gewünschte Patinierung oder Färbung, Anforderungen an Anlauf- und Korrosionsschutz sowie konkrete Prüf- oder Qualitätsvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Verkupfern: [
    {
      type: 'dropdown',
      name: 'verfahren',
      label: 'Verkupferungsverfahren:',
      options: [
        'Galvanisches Verkupfern',
        'Chemisches / stromloses Verkupfern'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Polieren',
        'Versiegeln / Klarlack',
        'Patinieren / Färben'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 1456',
        'ISO 9001',
        'ISO 14001',
        'Nach Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Funktion der Kupferschicht (z. B. dekorativ, Leitfähigkeit, Haftgrund oder Zwischenschicht), gewünschte Optik bzw. Patinierung, notwendige Folge- oder Nachbehandlung sowie konkrete Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Bronzebeschichten: [
    {
      type: 'dropdown',
      name: 'bronzeart',
      label: 'Bronzeart:',
      options: [
        'Rotbronze',
        'Gelbbronze',
        'Weißbronze',
        'Hartbronze'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Polieren',
        'Schleifen',
        'Honen',
        'Anlaufschutz',
        'Versiegeln / Klarlack'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke und Bronzelegierung bzw. Zusammensetzung, Funktion der Beschichtung (z. B. Gleit- und Verschleißschutz, Korrosionsschutz, dekorative oder elektrische Anwendung), notwendige Unter- bzw. Zwischenschichten, gewünschte Oberflächenqualität und Nachbearbeitung sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Vergolden: [
    {
      type: 'dropdown',
      name: 'vergoldungsart',
      label: 'Vergoldungsart:',
      options: [
        'Feingold / Weichgold',
        'Hartgold',
        'Chemisch / stromlos vergoldet',
        'Farbvergoldung'
      ],
      required: true
    },
    {
      type: 'dropdown',
      name: 'farbton',
      label: 'Farbton / Optik:',
      options: [
        'Gelbgold',
        'Roségold',
        'Rotgold',
        'Grüngold',
        'Weißgold',
        'Champagnergold',
        'Nach Muster / Sonderfarbton'
      ],
      dependsOn: { name: 'vergoldungsart', value: 'Farbvergoldung' }
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Polieren',
        'Versiegeln / Schutzlack',
        'Anlaufschutz',
        'Passivieren'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 4523',
        'ISO 8654',
        'ASTM B488',
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Goldgehalt bzw. Legierung und Farbton, Funktion der Beschichtung (z. B. dekorativ, elektrische Kontakte, Bondbarkeit oder Verschleißschutz), notwendige Unter- bzw. Diffusionssperrschichten, Anforderungen an Härte, Leitfähigkeit, Lötbarkeit und Oberflächenqualität sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Versilbern: [
    {
      type: 'dropdown',
      name: 'versilberungsart',
      label: 'Versilberungsart:',
      options: [
        'Glanzsilber',
        'Hartsilber',
        'Chemisch / stromlos versilbert'
      ],
      required: true
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: [
        'Polieren',
        'Anlaufschutz',
        'Versiegeln / Schutzlack'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Normen / Anforderungen:',
      tooltip: 'Wähle Normen oder Anforderungen aus, die für den Auftrag bzw. den Beschichter relevant sind.',
      options: [
        'ISO 4521',
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Silbergehalt bzw. Legierung, Funktion der Beschichtung (z. B. elektrische Leitfähigkeit, Kontaktierung, Lötbarkeit, Verschleißschutz oder dekorative Anwendung), notwendige Unter- bzw. Zwischenschichten, Anforderungen an Härte, Kontaktwiderstand, Anlaufschutz und Oberflächenqualität sowie konkrete Prüf-, Qualitäts- oder sonstige Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],

  Nasslackieren: [
    {
      type: 'dropdown',
      name: 'farbpalette',
      label: 'Farbpalette:',
      options: [
        'RAL',
        'NCS',
        'MCS',
        'DB',
        'BS',
        'Munsell',
        'Pantone',
        'Sikkens',
        'HKS',
        'RAL Design',
        'RAL Effect',
        'Klarlack',
        'Sonderfarbe / nach Vorlage',
        'Andere / unbekannt'
      ]
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
      options: [
        'Hochglänzend',
        'Glänzend',
        'Seidenglänzend',
        'Seidenmatt',
        'Matt',
        'Stumpfmatt',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'dropdown',
      name: 'oberfläche',
      label: 'Oberfläche:',
      options: [
        'Glatt',
        'Feinstruktur',
        'Grobstruktur',
        'Hammerschlag',
        'Nach Vorgabe / Muster'
      ]
    },
    {
      type: 'dropdown',
      name: 'lackaufbau',
      label: 'Lackaufbau:',
      options: [
        'Einschichtlackierung',
        'Grundierung + Decklack',
        'Mehrschichtaufbau',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'group',
      name: 'effekte',
      label: 'Effekte:',
      options: [
        'Metallic',
        'Perlmutteffekt',
        'Eisenglimmer',
        'Candy',
        'Neon',
        'Sonstiger Effekt'
      ]
    },
    {
      type: 'group',
      name: 'extras',
      label: 'Extras / besondere Ausführung:',
      options: [
        'Zweifarbig',
        'Beigestellter Lack',
        'Bereiche abdecken',
        'Sonstige Vorgabe'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicken, konkrete Schichtaufbauten sowie weitere technische Vorgaben und Sonderanforderungen sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ],
  Pulverbeschichten: [
    {
      type: 'dropdown',
      name: 'farbpalette',
      label: 'Farbpalette:',
      options: [
        'RAL',
        'NCS',
        'DB',
        'BS',
        'Munsell',
        'Pantone',
        'Sikkens',
        'HKS',
        'RAL Design',
        'RAL Effect',
        'Klarlack',
        'Sonderfarbe / nach Vorlage',
        'Andere / unbekannt'
      ]
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
      options: [
        'Hochglänzend',
        'Glänzend',
        'Seidenglänzend',
        'Seidenmatt',
        'Matt',
        'Stumpfmatt',
        'Nach Vorgabe / unbekannt'
      ]
    },
    {
      type: 'dropdown',
      name: 'oberfläche',
      label: 'Oberfläche:',
      options: [
        'Glatt',
        'Feinstruktur',
        'Grobstruktur'
      ]
    },
    {
      type: 'dropdown',
      name: 'qualität',
      label: 'Pulverlack-Qualität:',
      options: [
        'Polyester',
        'Epoxid',
        'Epoxy-Polyester',
        'Polyurethan',
        'Thermoplast',
        'Hochwetterfest / Fassadenqualität',
        'Andere / nach Vorgabe'
      ]
    },
    {
      type: 'group',
      name: 'effekte',
      label: 'Effekte:',
      tooltip: 'Weitere Effekte kannst du in der Beschreibung angeben.',
      options: [
        'Metallic',
        'Perlglanz / Perlmutteffekt',
        'Eisenglimmer',
        'Candy',
        'Neon',
        'Sonstiger Effekt'
      ]
    },
    {
      type: 'group',
      name: 'extras',
      label: 'Extras:',
      tooltip: 'Weitere Angaben kannst du in der Beschreibung machen.',
      options: [
        'Zweifarbig',
        'Duplexbeschichtung',
        'Beigestellter Pulverlack'
      ]
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: [
        'GSB',
        'QUALICOAT',
        'QUALISTEELCOAT',
        'ISO 9001',
        'ISO 14001'
      ]
    },
    {
      type: 'note',
      name: 'technischerHinweis',
      label: 'Gewünschte Schichtdicke, Vorbehandlung, Korrosionsschutzanforderungen, konkrete Schichtaufbauten, besondere Anforderungen an Witterungs- oder Chemikalienbeständigkeit sowie weitere technische, Prüf- oder Normvorgaben sollten aus den hochgeladenen Dateien oder dem Beschreibungsfeld hervorgehen.'
    }
  ]
};
