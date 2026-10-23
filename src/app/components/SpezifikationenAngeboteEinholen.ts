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
  
        {
      type: 'dropdown',
      name: 'beschichtung',
      label: 'Vorhandene Beschichtung:',
      options: ['Nasslack', 'Pulverlack', 'KTL', 'Mehrschicht', 'Unbekannt'],
      required: true,
    },
    {
      type: 'radio',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['vollständig', 'partiell', 'Nach Vorgabe'],
    },
    {
      type: 'radio',
      name: 'materialschonend',
      label: 'Maß-/oberflächenkritisch:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
  ],
  Brünieren: [
  {
    type: 'radio',
    name: 'verfahren',
    label: 'Verfahren',
    options: ['Heißbrünieren', 'Kaltbrünieren', 'Schwarzoxidieren', 'Nach Vorgabe']
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
  },

        {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: ['Ölen', 'Fetten', 'Gleitbeschichtung', 'Keine', 'Andere'],
    },
    {
      type: 'text',
      name: 'norm',
      label: 'Norm:',
      maxLength: 120,
    },
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
      options: ['Entrosten', 'Entzundern', 'Entlacken', 'Reinigen', 'Aufrauen', 'Mattieren', 'Entgraten', 'Verdichten / Verfestigen', 'Andere / Sondervorgabe']
    },
  
        {
      type: 'group',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['Entrosten', 'Entzundern', 'Entlacken', 'Reinigen', 'Aufrauen', 'Mattieren', 'Entgraten', 'Verdichten / Verfestigen', 'Andere / Sondervorgabe'],
      required: true,
    },
    {
      type: 'dropdown',
      name: 'strahlmittel',
      label: 'Strahlmittel:',
      options: ['Stahlkies', 'Stahlguss/Shot', 'Korund', 'Glasperlen', 'Keramikperlen', 'Kunststoff', 'organisch', 'Andere'],
    },
    {
      type: 'radio',
      name: 'reinheitsgrad',
      label: 'Reinheitsgrad:',
      options: ['Sa 1', 'Sa 2', 'Sa 2½', 'Sa 3', 'Nach Vorgabe / unbekannt'],
    },
    {
      type: 'radio',
      name: 'rauheit_typ',
      label: 'Rauheitskennwert:',
      options: ['Ra', 'Rz', 'Profilhöhe'],
    },
    {
      type: 'text',
      name: 'rauheit_wert',
      label: 'Rauheit / Profil (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
    {
      type: 'radio',
      name: 'sweep',
      label: 'Sweep-Strahlen:',
      options: ['Ja', 'Nein', 'Nach Vorgabe'],
    },
    {
      type: 'radio',
      name: 'bauteilart',
      label: 'Bauteilart:',
      options: ['Schüttgut/Kleinteile', 'Einzel-/Gestellteile', 'Großteile', 'Nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
  ],
  Eloxieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
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
      type: 'radio',
      name: 'eloxalanwendung',
      label: 'Anwendung:',
      options: ['Dekorativ', 'Technisch', 'Dekorativ & technisch', 'Nach Vorgabe / unbekannt']
    },
    {
      type: 'text',
      name: 'schichtdicke',
      numericOnly: true,
      allowDecimal: false,
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
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
      type: 'radio',
      name: 'eloxalverdichtung',
      label: 'Verdichtung:',
      options: ['Verdichten', 'Nicht verdichten', 'Nach Vorgabe / unbekannt']
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
    },
  
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: ['Versiegeln', 'Topcoat/Gleitmittel', 'Tempern/Wasserstoffentsprödung'],
    },
    {
      type: 'text',
      name: 'reibwert',
      label: 'Reibwertvorgabe:',
      maxLength: 120,
    },
    {
      type: 'text',
      name: 'nss_stunden',
      label: 'Salzsprühnebel-Anforderung nach ISO 9227 (h)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'text',
      name: 'schichtgewicht',
      label: 'Gewünschtes Schichtgewicht (g/m²)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
  ],
  Zinkphosphatieren: [
  {
    type: 'text',
    name: 'schichtgewicht',
    numericOnly: true,
    allowDecimal: false,
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
   },

        {
      type: 'group',
      name: 'zweck',
      label: 'Zweck / Anforderung:',
      options: ['Lackhaftung', 'Korrosionsschutz', 'Umformung', 'Andere'],
    },
  ],
  'Mn-Phosphatieren': [
    {
      type: 'text',
      name: 'schichtgewicht',
      numericOnly: true,
      allowDecimal: false,
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
    },
  
        {
      type: 'group',
      name: 'zweck',
      label: 'Zweck / Anforderung:',
      options: ['Einlauf-/Gleiteigenschaften', 'Verschleiß', 'Korrosionsschutz', 'Andere'],
    },
  ],
  Beizen: [
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
    },
  
    {
      type: 'group',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['Oxide/Zunder entfernen', 'Korrosion entfernen', 'Aktivieren', 'Vorbereitung Folgeprozess'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
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
      numericOnly: true,
      allowDecimal: true,
      label: 'Gewünschter Kantenradius / Vorgabe',
      maxLength: 40
    },
  
        {
      type: 'group',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['gratfrei', 'Kanten brechen', 'definierter Radius'],
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['einseitig', 'allseitig', 'definierte Kanten'],
    },
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
      numericOnly: true,
      allowDecimal: true,
      label: 'Gewünschter Kantenradius (mm)',
      maxLength: 30
    },
  
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
      numericOnly: true,
      allowDecimal: true,
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    },
  
        {
      type: 'radio',
      name: 'rauheit_typ',
      label: 'Rauheitskennwert:',
      options: ['Ra', 'Rz'],
    },
    {
      type: 'text',
      name: 'rauheit_wert',
      label: 'Rauheit / Profil (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
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
    },
  
        {
      type: 'radio',
      name: 'finish',
      label: 'Gewünschtes Finish:',
      options: ['Fein', 'Mittel', 'Grob', 'Nach Muster/Vorgabe'],
    },
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
      numericOnly: true,
      allowDecimal: true,
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    },
    {
      type: 'radio',
      name: 'schliffbild',
      label: 'Schliffbild:',
      options: ['Längsschliff', 'Kreuzschliff', 'Nach Vorgabe']
    },
  
        {
      type: 'radio',
      name: 'zweck',
      label: 'Zweck / Anforderung:',
      options: ['Technisch', 'Dekorativ', 'Vorbereitung Folgeprozess'],
    },
    {
      type: 'radio',
      name: 'rauheit_typ',
      label: 'Rauheitskennwert:',
      options: ['Ra', 'Rz'],
    },
    {
      type: 'text',
      name: 'rauheit_wert',
      label: 'Rauheit / Profil (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
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
      numericOnly: true,
      allowDecimal: true,
      label: 'Zielrauheit / Ra / Rz',
      maxLength: 40
    },
  
        {
      type: 'radio',
      name: 'rauheit_typ',
      label: 'Rauheitskennwert:',
      options: ['Ra', 'Rz'],
    },
    {
      type: 'text',
      name: 'rauheit_wert',
      label: 'Rauheit / Profil (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
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
    },
  
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
    },
  
        {
      type: 'text',
      name: 'zielrauheit',
      label: 'Zielrauheit (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
    {
      type: 'text',
      name: 'kantenradius',
      label: 'Gewünschter Kantenradius (mm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
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
    },
  
        {
      type: 'radio',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['Satinglanz', 'Hochglanz', 'Vorbereitung Eloxieren', 'Nach Vorgabe'],
    },
  ],
  'KTL-Beschichten': [
    {
      type: 'text',
      name: 'schichtdicke',
      numericOnly: true,
      allowDecimal: false,
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
    },
  
        {
      type: 'radio',
      name: 'ktl_ausfuehrung',
      label: 'KTL-Ausführung:',
      options: ['Standard-KTL', 'Dickschicht-KTL / D-KTL', 'Nach Vorgabe'],
    },
    {
      type: 'group',
      name: 'vorbehandlung',
      label: 'Vorbehandlung:',
      options: ['Entfetten', 'Beizen', 'Zinkphosphatieren', 'Passivieren', 'Andere'],
    },
    {
      type: 'radio',
      name: 'verwendung',
      label: 'Verwendung:',
      options: ['Endschicht', 'Grundierung für Pulverbeschichtung', 'Grundierung für Nasslack', 'weiterer Aufbau nach Vorgabe'],
    },
    {
      type: 'radio',
      name: 'farbe',
      label: 'Farbe:',
      options: ['Schwarz', 'Andere / nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'nss_stunden',
      label: 'Salzsprühnebel-Anforderung nach ISO 9227 (h)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
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
      options: ['Low Phos', 'Mid Phos', 'High Phos', 'Nach Vorgabe / unbekannt'],
      required: true,
      dependsOn: { name: 'verfahren', value: 'Chemisch' }
    },
    {
      type: 'text',
      name: 'schichtdicke',
      numericOnly: true,
      allowDecimal: false,
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
    },
  
    {
      type: 'dropdown',
      name: 'galvanik_ausfuehrung',
      label: 'Galvanische Ausführung:',
      options: ['Glanznickel', 'Halbglanznickel', 'Mattnickel', 'Technisch Nickel', 'Andere'],
      dependsOn: { name: 'verfahren', value: 'Galvanisch' },
    },
    {
      type: 'group',
      name: 'funktion',
      label: 'Gewünschte Funktion:',
      options: ['Korrosion', 'Verschleiß', 'Maßhaltigkeit', 'Leitfähigkeit', 'nichtmagnetisch', 'Diffusionssperre', 'dekorativ'],
    },
    {
      type: 'dropdown',
      name: 'schichtaufbau',
      label: 'Schichtaufbau:',
      options: ['Nickel Endschicht', 'Kupfer-Nickel', 'Nickel-Chrom', 'Kupfer-Nickel-Chrom', 'Sperr-/Zwischenschicht', 'Andere'],
    },
    {
      type: 'radio',
      name: 'waermebehandlung',
      label: 'Wärmebehandlung:',
      options: ['Keine', 'Aushärten/Wärmebehandlung', 'Nach Vorgabe'],
      dependsOn: { name: 'verfahren', value: 'Chemisch' },
    },
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
    },
  
        {
      type: 'radio',
      name: 'nickelart',
      label: 'Nickelart:',
      options: ['Galvanisch Nickel', 'Chemisch Nickel', 'unbekannt'],
      required: true,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'text',
      name: 'schicht',
      label: 'Vorhandene Zinnschicht:',
      maxLength: 120,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'dropdown',
      name: 'vorhandene_schicht',
      label: 'Vorhandene Schicht:',
      options: ['galvanisch Zink', 'Zink-Nickel', 'Zink-Eisen', 'feuerverzinkt', 'unbekannt'],
      required: true,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
  ],
  Einlagern: [
    {
      type: 'group',
      name: 'extra',
      label: 'Extra:',
      options: [
        'Trockenen lagern',
      ]
    },
  
    {
      type: 'text',
      name: 'lagerdauer',
      label: 'Lagerdauer (Tage)',
      required: true,
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'radio',
      name: 'lagerart',
      label: 'Lagerart:',
      options: ['Innen trocken', 'temperiert', 'Außen geschützt', 'Andere'],
      required: true,
    },
    {
      type: 'group',
      name: 'verpackung',
      label: 'Verpackung / Schutz:',
      options: ['Korrosionsschutz', 'Folie', 'Zwischenlagen', 'Sonderverpackung', 'Keine'],
    },
    {
      type: 'text',
      name: 'handling',
      label: 'Stapel-/Handlingvorgaben:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'text',
      name: 'stegtyp',
      label: 'Stegtyp / Stegbreite / Herstellerreferenz:',
      maxLength: 120,
    },
    {
      type: 'radio',
      name: 'vorbeschichtet',
      label: 'Profil bereits beschichtet:',
      options: ['Ja', 'Nein', 'unbekannt'],
    },
    {
      type: 'text',
      name: 'pruefung_norm',
      label: 'Prüfung / Normvorgabe:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'dropdown',
      name: 'folientyp',
      label: 'Folientyp / Zweck:',
      options: ['Dekorfolie', 'Schutzfolie', 'Transportfolie', 'UV-/Witterungsschutz', 'Andere'],
    },
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Vollflächig', 'Partiell', 'Nach Zeichnung'],
    },
    {
      type: 'text',
      name: 'farbe_dekor',
      label: 'Farbe / Dekor / Herstellerreferenz:',
      maxLength: 120,
    },
    {
      type: 'radio',
      name: 'einsatzbereich',
      label: 'Einsatzbereich:',
      options: ['Innen', 'Außen', 'Innen & Außen'],
    },
    {
      type: 'text',
      name: 'haltbarkeit',
      label: 'Gewünschte Haltbarkeit / Vorgabe:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'radio',
      name: 'auftrag',
      label: 'Auftragsart:',
      options: ['Gestell', 'Trommel', 'Nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'funktion',
      label: 'Gewünschte Funktion:',
      options: ['Lötbarkeit', 'Korrosionsschutz', 'elektrische Kontakte', 'Lebensmittelkontakt', 'Andere'],
    },
    {
      type: 'group',
      name: 'sonderanforderung',
      label: 'Sonderanforderungen:',
      options: ['Whisker-Anforderung', 'bleifrei/RoHS', 'Andere'],
    },
  ],
  Anodisieren: [
        {
      type: 'group',
      name: 'anodisierfunktion',
      label: 'Gewünschte Funktion:',
      options: [
        'Korrosionsschutz',
        'Verschleißschutz',
        'Dekorative Oberfläche / Färbung',
        'Elektrische Isolation',
        'Andere / nach Vorgabe'
      ]
    },
    {
      type: 'text',
      name: 'schichtdicke',
      numericOnly: true,
      allowDecimal: false,
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
    },
    {
      type: 'text',
      name: 'anodisierfarbe',
      label: 'Farbe / Optik (optional)',
      maxLength: 60
    },
    {
      type: 'text',
      name: 'anodisiernachbehandlung',
      label: 'Nachbehandlung / Prozessvorgabe (optional)',
      maxLength: 80
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen / Anforderungen:',
      tooltip: 'Wähle Anforderungen aus, die für den Beschichter bzw. den Auftrag relevant sind.',
      options: [
        'ISO 9001',
        'ISO 14001',
        'ISO 45001',
        'RoHS / REACH'
      ]
    },
  
    {
      type: 'text',
      name: 'norm_vorgabe',
      label: 'Norm / Kundenvorgabe:',
      maxLength: 120,
    },
  ],
  Aluminieren: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren',
      options: ['Schmelztauch-/Feueraluminieren', 'Thermisches Spritzaluminieren', 'Diffusionsaluminieren / Alitieren', 'Nach Vorgabe']
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
    },
  
        {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'funktion',
      label: 'Gewünschte Funktion:',
      options: ['Hochtemperatur-Oxidationsschutz', 'Korrosionsschutz', 'Andere'],
    },
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
    },
  
        {
      type: 'text',
      name: 'eloxalschicht',
      label: 'Vorhandene Eloxalschicht:',
      maxLength: 120,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'text',
      name: 'schicht_prozess',
      label: 'Vorhandene anodische Schicht / Prozess:',
      maxLength: 120,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
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
    },
  
        {
      type: 'dropdown',
      name: 'aluschicht',
      label: 'Vorhandene Aluminiumschicht:',
      options: ['Spritzaluminium', 'Schmelztauch-/Feueraluminium', 'Diffusionsschicht', 'unbekannt'],
      required: true,
    },
    {
      type: 'radio',
      name: 'umfang',
      label: 'Umfang:',
      options: ['vollständig', 'partiell/nach Zeichnung'],
      required: true,
    },
    {
      type: 'radio',
      name: 'masskritisch',
      label: 'Maßkritische Flächen / Passungen:',
      options: ['Ja', 'Nein'],
    },
    {
      type: 'text',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      maxLength: 120,
    },
  ],
  Verchromen: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verchromungsart:',
      options: [
        'Glanzverchromen',
        'Mattverchromen',
        'Strichmattverchromen',
        'Perlglanz / Perlmutt',
        'Rauchchrom matt',
        'Rauchchrom hochglanz',
        'Champagner',
        'Hartverchromen'
      ],
      required: true
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
      ]
    },
    {
      type: 'text',
      name: 'schichtdicke',
      numericOnly: true,
      allowDecimal: false,
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
    },
    {
      type: 'group',
      name: 'chromNachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Passivieren', 'Versiegeln', 'Andere / Nach Vorgabe']
    },
    {
      type: 'group',
      name: 'nachbearbeitung',
      label: 'Nachbearbeitung:',
      options: ['Schleifen', 'Polieren', 'Versiegeln nach System', 'Keine', 'Andere / nach Vorgabe'],
    },
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
    },
  
    {
      type: 'radio',
      name: 'system',
      label: 'Passivierungssystem:',
      options: ['Chrom(III)', 'chromfrei', 'Chrom(VI)', 'Nach Vorgabe/unbekannt'],
      required: true,
    },
    {
      type: 'group',
      name: 'zweck',
      label: 'Zweck / Anforderung:',
      options: ['Korrosionsschutz', 'Lackhaftung', 'Kleben', 'elektrische Leitfähigkeit', 'Andere'],
    },
    {
      type: 'text',
      name: 'folgebehandlung',
      label: 'Folgebehandlung:',
      maxLength: 120,
    },
    {
      type: 'text',
      name: 'nss_stunden',
      label: 'Salzsprühnebel-Anforderung nach ISO 9227 (h)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
  ],
  Elektropolieren: [
    {
      type: 'radio',
      name: 'anwendungsbereich',
      label: 'Anwendungsbereich:',
      options: ['Lebensmittel', 'Pharma', 'Medizintechnik', 'Industrie allgemein'],
      required: true
    },
  
        {
      type: 'group',
      name: 'ziel',
      label: 'Bearbeitungsziel:',
      options: ['Glätten', 'Rauheit reduzieren', 'Passivieren', 'Dekorativ', 'Reinigen', 'Andere'],
      required: true,
    },
    {
      type: 'text',
      name: 'ausgangsrauheit',
      label: 'Ausgangsrauheit (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
    {
      type: 'text',
      name: 'zielrauheit',
      label: 'Zielrauheit (µm)',
      numericOnly: true,
      allowDecimal: true,
      maxLength: 12,
    },
    {
      type: 'radio',
      name: 'flaechen',
      label: 'Zu bearbeitende Flächen:',
      options: ['Außenflächen', 'Innenflächen', 'definierte Flächen', 'komplett'],
    },
  ],
  Vermessingen: [
    {
      type: 'radio',
      name: 'ausfuehrung',
      label: 'Ausführung:',
      options: ['Glänzend', 'Matt', 'Antik / Patiniert'],
      required: true
    },
  
        {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: ['Patinieren/Färben', 'Klarlack', 'Versiegeln', 'Keine'],
    },
  ],
  Verkupfern: [
    {
      type: 'radio',
      name: 'verfahren',
      label: 'Verfahren:',
      options: ['Galvanisch', 'Chemisch'],
      required: true
    },
  
        {
      type: 'radio',
      name: 'auftrag',
      label: 'Auftragsart:',
      options: ['Gestell', 'Trommel', 'Nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'funktion',
      label: 'Gewünschte Funktion:',
      options: ['Zwischenschicht', 'Leitfähigkeit', 'dekorativ', 'Diffusionssperre', 'Reparatur/Dickkupfer', 'Andere'],
    },
    {
      type: 'group',
      name: 'folgeprozess',
      label: 'Geplanter Folgeprozess:',
      options: ['Vernickeln', 'Verchromen', 'Vergolden', 'Versilbern', 'Keine', 'Andere'],
    },
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
      numericOnly: true,
      allowDecimal: false,
      label: 'Gewünschte Schichtdicke (µm)',
      maxLength: 30
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Optionale Nachbehandlung:',
      options: ['Versiegeln', 'Anlaufschutz', 'Andere / nach Vorgabe']
    },
    {
      type: 'group',
      name: 'zertifizierungen',
      label: 'Zertifizierungen:',
      tooltip: 'Wähle Zertifizierungen aus, die den Beschichter auszeichnen müssen.',
      options: ['ISO 9001', 'ISO 14001', 'RoHS / REACH']
    },
  
    {
      type: 'radio',
      name: 'anwendung',
      label: 'Anwendung:',
      options: ['Dekorativ', 'Technisch', 'Beides', 'Nach Vorgabe'],
    },
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
      options: ['Versiegeln', 'Anlaufschutz', 'Andere / nach Vorgabe']
    },
  
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
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
    },
  
    {
      type: 'radio',
      name: 'optik',
      label: 'Optik:',
      options: ['Matt', 'Glänzend', 'Nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'group',
      name: 'funktion',
      label: 'Gewünschte Funktion:',
      options: ['elektrische Leitfähigkeit', 'Wärmeleitfähigkeit', 'Kontaktoberfläche', 'dekorativ', 'Andere'],
    },
    {
      type: 'group',
      name: 'nachbehandlung',
      label: 'Nachbehandlung:',
      options: ['Anlaufschutz', 'Passivierung', 'Versiegelung', 'Keine', 'Andere'],
    },
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
    },
  
    {
      type: 'dropdown',
      name: 'einsatzbereich',
      label: 'Einsatzbereich:',
      options: ['Innen', 'Außen', 'Innen & Außen', 'chemisch/industriell belastet', 'Nach Vorgabe'],
    },
    {
      type: 'radio',
      name: 'komponenten',
      label: 'Lacksystem:',
      options: ['1K', '2K', 'Nach Vorgabe / unbekannt'],
    },
    {
      type: 'dropdown',
      name: 'lacksystem',
      label: 'Bindemittelsystem:',
      options: ['Epoxidharz', 'Polyurethan', 'Acryl', 'Alkyd', 'Polysiloxan', 'Andere'],
    },
    {
      type: 'dropdown',
      name: 'grundierungstyp',
      label: 'Grundierungstyp:',
      options: ['Epoxy-Primer', 'Zinkstaub-Grundierung', 'Zinksilikat-Grundierung', 'Haftprimer', 'Andere / nach Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'oberflaechenvorbereitung',
      label: 'Oberflächenvorbereitung:',
      options: ['Reinigen/Entfetten', 'Sa 2', 'Sa 2½', 'Sa 3', 'Schleifen', 'Beizen', 'Nach Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'schichtaufbau',
      label: 'Schichtaufbau:',
      options: ['Grundierung', 'Grundierung + Decklack', 'Grundierung + Zwischen- + Decklack', 'Mehrschicht nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'grundierung_um',
      label: 'Grundierung (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'text',
      name: 'zwischenschicht_um',
      label: 'Zwischenbeschichtung (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'text',
      name: 'decklack_um',
      label: 'Deckbeschichtung (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'text',
      name: 'gesamt_um',
      label: 'Gesamtschichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'dropdown',
      name: 'korrosivitaet',
      label: 'Korrosivitätskategorie:',
      options: ['C2', 'C3', 'C4', 'C5', 'CX', 'keine Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'schutzdauer',
      label: 'Schutzdauer:',
      options: ['Niedrig', 'Mittel', 'Hoch', 'Sehr hoch', 'Nach Vorgabe'],
    },
    {
      type: 'group',
      name: 'bestaendigkeit',
      label: 'Besondere Beständigkeit:',
      options: ['UV/Witterung', 'Chemikalien', 'Temperatur', 'Abrieb/Verschleiß', 'Lebensmittelkontakt', 'Andere'],
    },
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
    },
  
    {
      type: 'dropdown',
      name: 'struktur',
      label: 'Oberfläche / Struktur:',
      options: ['Glatt', 'Feinstruktur', 'Grobstruktur', 'Hammerschlag', 'Antik', 'Perlglimmer', 'Eisenglimmer', 'Andere'],
    },
    {
      type: 'radio',
      name: 'einsatzbereich',
      label: 'Einsatzbereich:',
      options: ['Innen', 'Außen', 'Innen & Außen', 'Nach Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'pulversystem',
      label: 'Pulverlacksystem:',
      options: ['Polyester', 'Epoxy', 'Epoxy-Polyester', 'Polyurethan', 'Thermoplast', 'Nach Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'witterungsqualitaet',
      label: 'Witterungs-/Qualitätsklasse:',
      options: ['Standard Industrie', 'erhöhte Witterungsbeständigkeit', 'hochwetterfest/Fassadenqualität', 'Nach Vorgabe'],
    },
    {
      type: 'dropdown',
      name: 'schichtaufbau',
      label: 'Schichtaufbau:',
      options: ['Einschichtig', 'Zweischichtig', 'Grundierung + Deckpulver', 'Duplex: Verzinkung + Pulverbeschichtung', 'Nach Vorgabe'],
    },
    {
      type: 'text',
      name: 'schichtdicke',
      label: 'Gewünschte Schichtdicke (µm)',
      numericOnly: true,
      allowDecimal: false,
      maxLength: 10,
    },
    {
      type: 'dropdown',
      name: 'korrosivitaet',
      label: 'Korrosivitätskategorie:',
      options: ['C2', 'C3', 'C4', 'C5', 'keine Vorgabe/unbekannt'],
    },
    {
      type: 'group',
      name: 'sonderanforderung',
      label: 'Sonderanforderungen:',
      options: ['Metallic', 'Fluoreszierend', 'zweifarbig', 'beigestellter Lack', 'andere'],
    },
  ],
  'Edelstahl-Passivieren': [
        { type: 'dropdown', name: 'verfahren', label: 'Verfahren:', options: ['Zitronensäure-Passivieren', 'Salpetersäure-Passivieren', 'Nach Vorgabe / unbekannt'] },
    { type: 'group', name: 'ziel', label: 'Ziel / Anforderung:', options: ['Korrosionsbeständigkeit verbessern', 'Freie Eisenverunreinigungen entfernen', 'Vorbereitung Reinraum / Medizin / Lebensmittel', 'Andere / nach Vorgabe'] },
    { type: 'group', name: 'vorbehandlung', label: 'Vorbehandlung:', options: ['Reinigen / Entfetten', 'Beizen', 'Elektropolieren', 'Keine / nach Vorgabe'] },
    { type: 'text', name: 'nss_stunden', label: 'Salzsprühnebel-Anforderung (h)', numericOnly: true, allowDecimal: false, maxLength: 10 },
    { type: 'text', name: 'norm_vorgabe', label: 'Norm / Kundenvorgabe:', maxLength: 120 },
  ],
  Entchromen: [
        { type: 'dropdown', name: 'chromart', label: 'Chromschicht / Aufbau:', options: ['Dekorativchrom', 'Hartchrom', 'Mehrschichtsystem Chrom / Nickel / Kupfer', 'Unbekannt'] },
    { type: 'radio', name: 'umfang', label: 'Umfang:', options: ['Vollständig', 'Partiell / nach Zeichnung'], required: true },
    { type: 'radio', name: 'masskritisch', label: 'Maßkritische Flächen / Passungen:', options: ['Ja', 'Nein'] },
    { type: 'text', name: 'folgeprozess', label: 'Geplanter Folgeprozess:', maxLength: 120 },
  ],
  Entkupfern: [
        { type: 'dropdown', name: 'kupferschicht', label: 'Kupferschicht:', options: ['Galvanisch Kupfer', 'Chemisch Kupfer', 'Dickkupfer / Reparaturkupfer', 'Unbekannt'] },
    { type: 'radio', name: 'umfang', label: 'Umfang:', options: ['Vollständig', 'Partiell / nach Zeichnung'], required: true },
    { type: 'radio', name: 'masskritisch', label: 'Maßkritische Flächen / Passungen:', options: ['Ja', 'Nein'] },
    { type: 'text', name: 'folgeprozess', label: 'Geplanter Folgeprozess:', maxLength: 120 },
  ],
};
