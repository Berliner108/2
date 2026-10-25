"use client";

import { useState, useEffect } from "react";
import styles from "./wissenswertes.module.css";
import Navbar from '../components/navbar/Navbar'
import { motion } from "framer-motion";
import Vision from "./Vision";  // Importiere die Komponente


const Wissenswertes = () => {
  const [openContainers, setOpenContainers] = useState<{ [key: number]: boolean }>({});
  const [knowledgeSearch, setKnowledgeSearch] = useState("");

  const [isClient, setIsClient] = useState(false); // Um sicherzustellen, dass es nur im Client läuft
  // Container-Logik für das Öffnen
  const toggleContainer = (index: number) => {
    setOpenContainers((prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  };

  // Effekt, um sicherzustellen, dass wir den Router nur im Client verwenden
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsClient(true);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const hashTargets: Record<string, number> = {
      "#Beschichtungstechnik": 0,
      "#Verfahren": 1,
      "#Technische-Angaben": 1,
      "#Nasslackieren": 2,
      "#Pulverbeschichten": 3,
      "#KTL-Beschichten": 4,
      "#Verzinken": 5,
      "#Vernickeln": 6,
      "#Verchromen": 7,
      "#Verkupfern": 8,
      "#Verzinnen": 9,
      "#Vermessingen": 10,
      "#Bronzebeschichten": 11,
      "#Vergolden": 12,
      "#Versilbern": 13,
      "#Aluminieren": 14,
      "#Eloxieren": 15,
      "#Anodisieren": 16,
      "#Aluminium-Passivieren": 17,
      "#Edelstahl-Passivieren": 18,
      "#Zinkphosphatieren": 19,
      "#Eisenphosphatieren": 20,
      "#Mn-Phosphatieren": 21,
      "#Brünieren": 22,
      "#Beizen": 23,
      "#Elektropolieren": 24,
      "#Strahlen": 25,
      "#Schleifen": 26,
      "#Polieren": 27,
      "#Bürsten": 28,
      "#Trowalisieren": 29,
      "#Entgraten": 30,
      "#Verrunden": 31,
      "#Glätten": 32,
      "#Mattieren": 33,
      "#Chemisches-Glänzen": 34,
      "#Entlacken": 35,
      "#Entzinken": 36,
      "#Entnickeln": 37,
      "#Entchromen": 38,
      "#Entkupfern": 39,
      "#Entmessingen": 40,
      "#Entbronzieren": 41,
      "#Entgolden": 42,
      "#Entsilbern": 43,
      "#Entzinnen": 44,
      "#Entaluminieren": 45,
      "#Enteloxieren": 46,
      "#Entanodisieren": 47,
      "#Folieren": 48,
      "#Isolierstegverpressen": 49,
      "#Einlagern": 50,
      "#Lacke-Beschichtungsstoffe": 51,
      "#Lackrecycling-Restlackverwertung": 52
};

    const openHashTarget = () => {
      const index = hashTargets[window.location.hash];
      if (index === undefined) return;

      setOpenContainers({ [index]: true });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`container-${index}`)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    };

    openHashTarget();
    window.addEventListener("hashchange", openHashTarget);
    return () => window.removeEventListener("hashchange", openHashTarget);
  }, [isClient]);

useEffect(() => {
  if (isClient) {
    const hash = window.location.hash;

    if (hash === "#Sofunktioniert’s") {
      document.getElementById("Sofunktioniert’s")?.scrollIntoView({ behavior: "smooth" });
    }

    if (hash === "#standardablauf") {
      setTimeout(() => {
        document.getElementById("standardablauf")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }
}, [isClient]);




  const ScrollProgress = () => {
    const [scrollProgress, setScrollProgress] = useState(0);

    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    useEffect(() => {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    

    return (
      <div className={styles.scrollProgressContainer}>
        <div className={styles.scrollProgressBar} style={{ width: `${scrollProgress}%` }}></div>
      </div>
    );
  };


  type ProcedureInfo = {
    summary: string;
    purpose: string[];
    options: string[];
    important: string[];
    standards: string[];
    practice: string;
    example: string;
  };

  const procedureOrder = [
  "Nasslackieren",
  "Pulverbeschichten",
  "KTL-Beschichten",
  "Verzinken",
  "Vernickeln",
  "Verchromen",
  "Verkupfern",
  "Verzinnen",
  "Vermessingen",
  "Bronzebeschichten",
  "Vergolden",
  "Versilbern",
  "Aluminieren",
  "Eloxieren",
  "Anodisieren",
  "Aluminium-Passivieren",
  "Edelstahl-Passivieren",
  "Zinkphosphatieren",
  "Eisenphosphatieren",
  "Mn-Phosphatieren",
  "Brünieren",
  "Beizen",
  "Elektropolieren",
  "Strahlen",
  "Schleifen",
  "Polieren",
  "Bürsten",
  "Trowalisieren",
  "Entgraten",
  "Verrunden",
  "Glätten",
  "Mattieren",
  "Chemisches Glänzen",
  "Entlacken",
  "Entzinken",
  "Entnickeln",
  "Entchromen",
  "Entkupfern",
  "Entmessingen",
  "Entbronzieren",
  "Entgolden",
  "Entsilbern",
  "Entzinnen",
  "Entaluminieren",
  "Enteloxieren",
  "Entanodisieren",
  "Folieren",
  "Isolierstegverpressen",
  "Einlagern"
] as const;

  const procedureInfo: Record<string, ProcedureInfo> = {
  "Nasslackieren": {
    "summary": "Beim Nasslackieren wird ein flüssiger Beschichtungsstoff aufgebracht und anschließend getrocknet oder chemisch bzw. thermisch ausgehärtet.",
    "purpose": [
      "Korrosionsschutz",
      "dekorative Farb- und Effektoberflächen",
      "chemisch oder funktionell belastbare Beschichtungen",
      "Beschichtung auch komplexer oder temperaturempfindlicher Bauteile"
    ],
    "options": [
      "<strong>Farbpalette:</strong> RAL, NCS, MCS, DB, BS, Munsell, Pantone, Sikkens, HKS, RAL Design, RAL Effect, Klarlack, Sonderfarbe / nach Vorlage oder Andere. Klarlack wird im Formular bewusst als praktische Auswahl für eine transparente Beschichtung geführt.",
      "<strong>Farbtonbezeichnung oder Artikelnummer:</strong> konkrete Farbnummer oder Hersteller-/Produktnummer. Eine Artikelnummer kann das Material eindeutiger bestimmen als ein Farbton allein.",
      "<strong>Glanzgrad:</strong> Hochglänzend, Glänzend, Seidenglänzend, Seidenmatt, Matt oder Stumpfmatt. Bei technisch enger Vorgabe besser GU-Wert und Messwinkel nennen.",
      "<strong>Oberfläche:</strong> Glatt, Feinstruktur, Grobstruktur oder Hammerschlag. Struktur und Glanzgrad sind getrennte Eigenschaften.",
      "<strong>Lackaufbau:</strong> Einschichtlackierung, Grundierung + Decklack oder Mehrschichtaufbau. Die Schichten können unterschiedliche Aufgaben übernehmen.",
      "<strong>Effekte:</strong> Metallic, Perlmutteffekt, Eisenglimmer, Candy und Neon. Bei Effektlacken ist ein Referenzmuster besonders hilfreich.",
      "<strong>Extras:</strong> Zweifarbig, Beigestellter Lack und Bereiche abdecken. Bei beigestelltem Lack Hersteller, Produkt, Charge, Menge und Haltbarkeit angeben."
    ],
    "important": [
      "Werkstoff und Ausgangszustand",
      "Vorbehandlung",
      "Schichtdicke bzw. Schichtaufbau",
      "Sicht- und Funktionsflächen",
      "Maskierbereiche",
      "Einsatzumgebung, Temperatur-, UV- und Chemikalienbelastung",
      "Farb-/Glanzreferenz und Prüfanforderungen"
    ],
    "standards": [
      "Je nach Anwendung können z. B. ISO 12944 für Korrosionsschutzsysteme sowie konkrete Prüfstandards für Schichtdicke, Haftfestigkeit, Glanz oder Farbe relevant sein. ISO 9001/14001 beschreiben Managementsysteme, nicht die Beschichtungsleistung selbst."
    ],
    "practice": "Bei farbkritischen Sichtteilen sind physische Freigabemuster verlässlicher als Fotos oder Bildschirmdarstellungen. Gleicher RAL-Ton bedeutet nicht automatisch identisches Erscheinungsbild.",
    "example": "Stahlgehäuse, außen eingesetzt; RAL 7016, seidenmatt, glatt; Grundierung + Decklack; definierte Gesamtschichtdicke; Gewinde und Massepunkte beschichtungsfrei."
  },
  "Pulverbeschichten": {
    "summary": "Beim Pulverbeschichten wird trockenes Pulver elektrostatisch aufgebracht und anschließend im Ofen aufgeschmolzen und ausgehärtet.",
    "purpose": [
      "dekorative und robuste Serienoberflächen",
      "Korrosionsschutz im geeigneten System",
      "Innen- und Außenanwendungen",
      "strukturierte und funktionelle Oberflächen"
    ],
    "options": [
      "<strong>Farbpalette:</strong> RAL, NCS, DB, BS, Munsell, Pantone, Sikkens, HKS, RAL Design, RAL Effect, Klarlack, Sonderfarbe / nach Vorlage oder Andere.",
      "<strong>Glanzgrad:</strong> Hochglänzend bis Stumpfmatt.",
      "<strong>Oberfläche:</strong> Glatt, Feinstruktur oder Grobstruktur.",
      "<strong>Polyester:</strong> verbreitet für Außenanwendungen mit guter UV- und Wetterbeständigkeit.",
      "<strong>Epoxid:</strong> gute chemische und mechanische Eigenschaften, jedoch typischerweise nicht für dauerhafte UV-Außenbelastung.",
      "<strong>Epoxy-Polyester:</strong> Hybrid-System, häufig für Innenanwendungen.",
      "<strong>Polyurethan:</strong> System für spezielle Anforderungen an Optik und Beständigkeit.",
      "<strong>Thermoplast:</strong> schmilzt beim Erwärmen und erstarrt beim Abkühlen; andere Materiallogik als duroplastische Pulverlacke.",
      "<strong>Hochwetterfest / Fassadenqualität:</strong> für erhöhte Anforderungen an UV-Beständigkeit, Farbtonstabilität und Glanzerhalt.",
      "<strong>Effekte:</strong> Metallic, Perlmutteffekt, Eisenglimmer, Candy und Neon.",
      "<strong>Extras:</strong> Zweifarbig, Duplexbeschichtung und Beigestellter Pulverlack. Duplex bedeutet typischerweise metallischer Korrosionsschutz plus organische Beschichtung, z. B. Feuerverzinken + Pulverbeschichten."
    ],
    "important": [
      "Vorbehandlung passend zum Grundwerkstoff",
      "Schichtdicke",
      "Einbrennbarkeit und Wärmeempfindlichkeit des Bauteils",
      "Kanten, Hohlräume und Faradaysche Käfige",
      "Korrosionsschutzanforderung",
      "Witterungs- und Chemikalienbeständigkeit",
      "Maskier- und Kontaktstellen"
    ],
    "standards": [
      "<strong>GSB:</strong> Qualitätssystem für hochwertige Beschichtungen, u. a. im Architektur-/Fassadenbereich. <strong>QUALICOAT:</strong> Qualitätsanforderungen für beschichtetes Aluminium. <strong>QUALISTEELCOAT:</strong> Qualitätsanforderungen für organisch beschichteten Stahl. ISO 9001/14001 betreffen Managementsysteme."
    ],
    "practice": "Die erforderliche Objekttemperatur ist entscheidender als nur die angezeigte Ofenlufttemperatur. Massive Teile benötigen länger, bis der Bauteilkern die nötige Aushärtetemperatur erreicht.",
    "example": "Aluminiumprofile, Außenfassade; RAL 9005, matt, Feinstruktur; hochwetterfest/Fassadenqualität; QUALICOAT gefordert; Sichtseiten nach Muster."
  },
  "KTL-Beschichten": {
    "summary": "KTL steht für kathodische Tauchlackierung. Das leitfähige Werkstück wird in ein Lackbad getaucht und elektrochemisch als Kathode beschichtet.",
    "purpose": [
      "gleichmäßiger Korrosionsschutz",
      "Grundierung für Pulverlack oder Nasslack",
      "Serienteile und komplexe Geometrien",
      "Automotive- und industrielle Anwendungen"
    ],
    "options": [
      "<strong>Farbton:</strong> Schwarz oder Grau. Diese beiden Varianten sind im aktuellen Formular vorgesehen."
    ],
    "important": [
      "Schichtdicke",
      "Vorbehandlung",
      "Korrosionsschutzanforderung",
      "Hohlräume, Sacklöcher und Ablaufmöglichkeiten",
      "Kontaktierstellen",
      "spätere Weiterbeschichtung",
      "Maskierbereiche"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein; <strong>IATF 16949</strong> ist insbesondere für die Automobil-Lieferkette relevant."
    ],
    "practice": "Als Tauchverfahren braucht KTL geeignete Entlüftungs- und Ablaufmöglichkeiten. KTL erreicht Hohlräume gut, aber die elektrische Feldverteilung und Zugänglichkeit bleiben konstruktiv relevant.",
    "example": "Stahl-Serienteil; KTL schwarz; definierte Schichtdicke; als Grundierung für anschließendes Pulverbeschichten; Innengewinde beschichtungsfrei."
  },
  "Verzinken": {
    "summary": "Verzinken schützt vor allem Stahl durch eine Zink- oder zinkbasierte Schutzschicht. Die im Formular angebotenen Verfahren unterscheiden sich technisch deutlich.",
    "purpose": [
      "Korrosionsschutz",
      "Verbindungselemente",
      "Stahlkonstruktionen",
      "maßkritische oder serienmäßige Bauteile"
    ],
    "options": [
      "<strong>Feuerverzinken:</strong> Eintauchen des Stahlbauteils in flüssiges Zink; robuste, vergleichsweise dicke Schutzschicht.",
      "<strong>Galvanisches Verzinken:</strong> elektrochemische Zinkabscheidung; dünnere, gut steuerbare Schichten.",
      "<strong>Zinklamellenbeschichtung:</strong> zinkreiche Lamellensysteme, häufig bei Schrauben und Verbindungselementen mit hohen Korrosionsschutzanforderungen.",
      "<strong>Mechanisches Verzinken:</strong> Zink wird mechanisch aufgebracht; kann bei bestimmten hochfesten Verbindungselementen sinnvoll sein.",
      "<strong>Zink-Standard:</strong> klassische galvanische Zinkschicht.",
      "<strong>Zink-Nickel:</strong> Zinklegierung mit Nickel, häufig für erhöhten Korrosionsschutz.",
      "<strong>Zink-Eisen:</strong> Zinklegierung mit Eisen für spezielle Passivierungs- und Korrosionsschutzsysteme.",
      "<strong>Zinn-Zink:</strong> Zink-Zinn-Legierung für spezielle technische Anwendungen.",
      "<strong>Trommelverfahren:</strong> wirtschaftlich für viele kleine robuste Massenteile; Teile berühren sich während des Prozesses.",
      "<strong>Gestellverfahren:</strong> Teile werden definiert aufgehängt; günstiger für größere, empfindliche oder optisch anspruchsvollere Teile.",
      "<strong>Blau / transparent:</strong> helle Passivierung. <strong>Dickschichtpassivierung:</strong> verstärkte Passivierung. <strong>Schwarzpassivierung:</strong> dunkle Optik. <strong>Gelbchromatierung:</strong> gelblich-iridisierende Chromatierung, bei der regulatorische Chrom(VI)-Anforderungen zu beachten sind.",
      "<strong>Versiegelung:</strong> zusätzlicher Oberflächenschutz. <strong>Gleitmittelbeschichtung:</strong> kann Reibwerte z. B. bei Schrauben einstellen. <strong>Tempern:</strong> kann bei gefährdeten hochfesten Stählen zur Wasserstoffentsprödung erforderlich sein."
    ],
    "important": [
      "Schichtdicke",
      "Grundwerkstoff und Festigkeit",
      "Konstruktion und Ablauf-/Entlüftungsöffnungen beim Feuerverzinken",
      "Gewinde und Passungen",
      "Korrosionsumgebung",
      "Reibwert bei Verbindungselementen",
      "Duplex-Folgebehandlung"
    ],
    "standards": [
      "<strong>DIN EN ISO 1461:</strong> Stückverzinken von Eisen- und Stahlteilen. <strong>DASt-Richtlinie 022:</strong> relevant bei bestimmten tragenden feuerverzinkten Stahlbauteilen. <strong>EN 1090:</strong> Ausführung tragender Stahl-/Aluminiumbauteile. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Feuerverzinken und galvanisches Verzinken sind nicht austauschbar. Bei hochfesten Stählen muss außerdem das Risiko wasserstoffinduzierter Versprödung berücksichtigt werden.",
    "example": "Schrauben aus hochfestem Stahl; galvanisch Zink-Nickel, Gestell/Trommel nach Eignung; definierte Schichtdicke, Reibwert und Korrosionsanforderung; Wasserstoffentsprödung prüfen."
  },
  "Vernickeln": {
    "summary": "Beim Vernickeln wird eine Nickelschicht galvanisch oder chemisch/stromlos abgeschieden.",
    "purpose": [
      "Korrosionsschutz",
      "Verschleißschutz",
      "dekorative Oberflächen",
      "maßhaltige Funktionsschichten",
      "Zwischenschichten"
    ],
    "options": [
      "<strong>Galvanisches Vernickeln:</strong> elektrochemische Abscheidung; Schichtverteilung wird von Geometrie und Stromdichte beeinflusst.",
      "<strong>Chemisch Vernickeln:</strong> stromlose chemische Abscheidung; sehr gleichmäßige Schicht auch an komplexeren Geometrien.",
      "<strong>Low Phos:</strong> niedriger Phosphorgehalt; typischerweise höhere Härte und gute Verschleißeigenschaften.",
      "<strong>Mid Phos:</strong> verbreiteter Kompromiss zwischen Härte, Korrosion und Prozessierbarkeit.",
      "<strong>High Phos:</strong> hoher Phosphorgehalt; häufig für besonders hohe Korrosionsbeständigkeit interessant."
    ],
    "important": [
      "Schichtdicke und Toleranzen",
      "Korrosions- und Verschleißanforderung",
      "Härte",
      "Wärmebehandlung",
      "Optik",
      "Grundwerkstoff",
      "Unter- oder Sperrschichten"
    ],
    "standards": [
      "<strong>ISO 4526:</strong> galvanische Nickelüberzüge für technische Zwecke. <strong>ISO 4527:</strong> chemisch abgeschiedene Nickel-Phosphor-Schichten. <strong>ISO 1456:</strong> dekorative Nickel-/Chromsysteme. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Eine Wärmebehandlung kann die Härte und den Gefügezustand chemisch abgeschiedener Nickel-Phosphor-Schichten deutlich verändern. Maßkritische Teile müssen deshalb mit Schichtdicke und Nachbearbeitung zusammen betrachtet werden.",
    "example": "Welle aus Stahl; chemisch Nickel Mid Phos; 25 µm; Korrosionsschutz + Verschleiß; Funktionsdurchmesser nach Beschichtung toleriert; Wärmebehandlung nach Vorgabe."
  },
  "Verchromen": {
    "summary": "Beim Verchromen werden dekorative oder technische Chromschichten erzeugt. Das aktuelle Formular unterscheidet Glanz-, Matt-, Hart- und Schwarzverchromen.",
    "purpose": [
      "hochwertige Sichtoberflächen",
      "Korrosionsschutz in Mehrschichtsystemen",
      "Verschleißschutz",
      "Maßkorrektur und Funktionsflächen"
    ],
    "options": [
      "<strong>Glanzverchromen:</strong> dekorative helle Chromoberfläche, häufig auf Nickel bzw. Kupfer/Nickel.",
      "<strong>Mattverchromen:</strong> dekorative matte bzw. satinierte Chromwirkung.",
      "<strong>Hartverchromen:</strong> technische Chromschicht für Härte, Verschleißschutz, Gleit- und Maßanforderungen.",
      "<strong>Schwarzverchromen:</strong> dunkle dekorative oder funktionelle Chromoberfläche.",
      "<strong>Chrom(III):</strong> dreiwertiges Chromsystem. <strong>Chrom(VI):</strong> sechswertiges Chromsystem mit strengeren regulatorischen Anforderungen.",
      "<strong>Optiken:</strong> Standard Chrom, Perlglanz, Rauchchrom / Dark Chrome, Champagner und Schwarz. Nicht jede Optik ist mit jedem Betrieb und jedem Chromsystem gleich realisierbar; Referenzmuster ist sinnvoll.",
      "<strong>Dekorative Nachbehandlungen:</strong> Passivieren, Versiegeln, Polieren.",
      "<strong>Hartchrom-Nachbearbeitung:</strong> Schleifen, Honen, Läppen, Polieren oder Tempern / Wasserstoffentsprödung."
    ],
    "important": [
      "Schichtdicke",
      "Schichtaufbau und Zwischenschichten",
      "Untergrundvorbereitung",
      "Sicht-/Funktionsflächen",
      "Maßhaltigkeit",
      "Härte und Verschleiß",
      "Kontaktierstellen",
      "Nachbearbeitung"
    ],
    "standards": [
      "<strong>ISO 1456:</strong> dekorative Nickel-, Nickel-plus-Chrom- und Kupfer-plus-Nickel-plus-Chrom-Überzüge. <strong>ISO 6158:</strong> technische Chromüberzüge. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Chrom gleicht Kratzer oder Schleifriefen nicht automatisch aus. Bei dekorativen Oberflächen bestimmt die Vorbearbeitung die Optik stark; bei Hartchrom stehen dagegen Funktionsmaß und Nachbearbeitung im Vordergrund.",
    "example": "Kolbenstange; Hartverchromen; 80 µm vor Schleifen; Endmaß nach Schleifen; Härte/Verschleiß gefordert; Wasserstoffentsprödung nach Werkstofffestigkeit prüfen."
  },
  "Verkupfern": {
    "summary": "Beim Verkupfern wird Kupfer galvanisch oder chemisch/stromlos abgeschieden.",
    "purpose": [
      "elektrische Leitfähigkeit",
      "Haft- oder Zwischenschicht",
      "dekorative Kupferoberflächen",
      "Vorbereitung weiterer galvanischer Schichten"
    ],
    "options": [
      "<strong>Galvanisches Verkupfern:</strong> elektrochemische Kupferabscheidung.",
      "<strong>Chemisches / stromloses Verkupfern:</strong> Kupferabscheidung ohne externe Stromführung.",
      "<strong>Polieren:</strong> verbessert Glanz und Oberflächenqualität.",
      "<strong>Versiegeln / Klarlack:</strong> schützt dekoratives Kupfer vor Anlaufen.",
      "<strong>Patinieren / Färben:</strong> gezielte Veränderung der Kupferoptik."
    ],
    "important": [
      "Schichtdicke",
      "elektrische Funktion",
      "Zwischenschicht-Funktion",
      "Optik",
      "Untergrund",
      "Folgebeschichtung",
      "Anlaufschutz"
    ],
    "standards": [
      "<strong>ISO 1456</strong> kann bei dekorativen Kupfer-Nickel-Chrom-Systemen relevant sein. ISO 9001/14001 betreffen Managementsysteme."
    ],
    "practice": "Kupfer läuft unbehandelt an. Bei dekorativen Oberflächen muss deshalb geklärt werden, ob natürliche Alterung gewünscht oder durch Klarlack/Versiegelung verhindert werden soll.",
    "example": "Messingbauteil galvanisch verkupfern; dekorativ, hochglänzend; anschließend Klarlack/Versiegelung; Farbton nach Referenzmuster."
  },
  "Verzinnen": {
    "summary": "Beim Verzinnen wird Zinn als metallische Funktions- oder Schutzschicht aufgebracht.",
    "purpose": [
      "Lötbarkeit",
      "elektrische Kontaktflächen",
      "Korrosionsschutz",
      "technische Funktionsschichten"
    ],
    "options": [
      "<strong>Galvanisches Verzinnen:</strong> elektrochemisch abgeschiedene Zinnschicht.",
      "<strong>Feuerverzinnen / Schmelztauchverzinnen:</strong> Bauteil wird mit einer Zinnschmelze benetzt bzw. darin getaucht.",
      "<strong>Chemisches Verzinnen:</strong> stromlose chemische Zinnabscheidung."
    ],
    "important": [
      "Schichtdicke",
      "Lötbarkeit",
      "elektrische Eigenschaften",
      "Grundwerkstoff",
      "Zwischenschichten",
      "Optik",
      "Nachbehandlung"
    ],
    "standards": [
      "<strong>DIN 50965</strong> und <strong>ISO 2093</strong> können je nach galvanischer Zinnanwendung relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Die Eignung für Lötprozesse hängt nicht nur von der Zinnschicht, sondern auch von Alterung, Zwischenschichten, Legierung und nachfolgender Lagerung ab.",
    "example": "Kupferkontakt galvanisch verzinnen; 10 µm; gute Lötbarkeit erforderlich; Kontaktfläche vollständig beschichtet; Prüfzeugnis nach Vorgabe."
  },
  "Vermessingen": {
    "summary": "Beim Vermessingen wird eine messingartige Kupfer-Zink-Schicht erzeugt, meist mit dekorativem Schwerpunkt.",
    "purpose": [
      "dekorative Oberflächen",
      "Beschläge und Designteile",
      "gezielt gealterte bzw. patinierte Optiken"
    ],
    "options": [
      "<strong>Glänzend:</strong> reflektierende Messingoptik.",
      "<strong>Matt:</strong> reduzierte Reflexion.",
      "<strong>Antik / Patiniert:</strong> bewusst gealterte bzw. chemisch veränderte Oberfläche.",
      "<strong>Vintage / Altmessing:</strong> dekorative Alt-Messing-Wirkung.",
      "<strong>Klarlack / Versiegelung:</strong> schützt die Optik vor weiterem Anlaufen.",
      "<strong>Polieren:</strong> erhöht Glanz und Gleichmäßigkeit.",
      "<strong>Patinieren / Färben:</strong> erzeugt gezielt einen Farb- bzw. Alterungseffekt."
    ],
    "important": [
      "Referenzoberfläche",
      "Schichtaufbau und Zwischenschichten",
      "Anlauf- und Korrosionsschutz",
      "Sichtseiten",
      "Nachbehandlung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Unternehmensanforderungen gewählt werden."
    ],
    "practice": "Bezeichnungen wie Antik oder Vintage sind nicht exakt messbare Farbnormen. Für Serien oder sichtbare Teile ist ein Freigabemuster besonders wichtig.",
    "example": "Beschlag vermessingen; Vintage / Altmessing; Farbwirkung nach Muster; anschließend Klarlack; alle Sichtflächen gleichmäßig."
  },
  "Bronzebeschichten": {
    "summary": "Beim Bronzebeschichten werden Bronzelegierungsschichten für dekorative oder funktionelle Eigenschaften abgeschieden.",
    "purpose": [
      "dekorative Oberflächen",
      "Gleit- und Verschleißfunktionen",
      "Korrosionsschutz",
      "elektrische oder technische Sonderanwendungen"
    ],
    "options": [
      "<strong>Rotbronze:</strong> rötliche Bronzeoptik.",
      "<strong>Gelbbronze:</strong> gelblich-goldene Bronzeoptik.",
      "<strong>Weißbronze:</strong> helle, silbrig wirkende Bronzelegierung.",
      "<strong>Hartbronze:</strong> technisch orientierte Bronzeausführung für erhöhte Verschleiß-/Gleitanforderungen.",
      "<strong>Nachbehandlungen:</strong> Polieren, Schleifen, Honen, Anlaufschutz oder Versiegeln / Klarlack."
    ],
    "important": [
      "Schichtdicke",
      "Bronzelegierung bzw. Zusammensetzung",
      "Funktion der Schicht",
      "Zwischenschichten",
      "Oberflächenqualität",
      "Nachbearbeitung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Die Bezeichnung Bronze allein reicht bei technischen Anwendungen nicht: Zusammensetzung und Funktion müssen angegeben werden, weil unterschiedliche Bronzelegierungen deutlich andere Eigenschaften besitzen.",
    "example": "Lagerfläche mit Hartbronze; definierte Schichtdicke nach Bearbeitung; Gleit-/Verschleißfunktion; anschließend Honen auf Endmaß."
  },
  "Vergolden": {
    "summary": "Beim Vergolden wird Gold als dekorative oder technische Edelmetallschicht aufgebracht.",
    "purpose": [
      "hochwertige dekorative Oberflächen",
      "elektrische Kontakte",
      "Bond- und Lötflächen",
      "korrosionsbeständige Funktionsflächen"
    ],
    "options": [
      "<strong>Feingold / Weichgold:</strong> hoher Goldgehalt und relativ weiche Schicht.",
      "<strong>Hartgold:</strong> legiertes Gold mit erhöhter Härte und Verschleißfestigkeit.",
      "<strong>Chemisch / stromlos vergoldet:</strong> Goldabscheidung ohne klassische galvanische Stromführung.",
      "<strong>Farbvergoldung:</strong> Legierung/Prozess wird auf eine gewünschte Goldfarbe abgestimmt.",
      "<strong>Farbton:</strong> Gelbgold, Roségold, Rotgold, Grüngold, Weißgold oder Champagnergold.",
      "<strong>Nachbehandlungen:</strong> Polieren, Versiegeln / Schutzlack, Anlaufschutz oder Passivieren."
    ],
    "important": [
      "Schichtdicke",
      "Goldgehalt/Legierung",
      "Unter- und Diffusionssperrschichten",
      "Kontaktwiderstand",
      "Bondbarkeit",
      "Lötbarkeit",
      "Verschleiß",
      "Optik"
    ],
    "standards": [
      "<strong>ISO 4523</strong>, <strong>ISO 8654</strong> und <strong>ASTM B488</strong> können je nach Goldanwendung relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Bei technischen Kontakten ist die Schichtfolge oft wichtiger als die reine Goldfarbe. Nickel kann z. B. als Diffusionssperre dienen.",
    "example": "Kontaktstift: Hartgold nach ASTM B488; definierte Goldschicht auf Nickelsperrschicht; niedriger Kontaktwiderstand und Verschleißfestigkeit gefordert."
  },
  "Versilbern": {
    "summary": "Beim Versilbern wird Silber für dekorative oder besonders leitfähige Funktionsoberflächen abgeschieden.",
    "purpose": [
      "elektrische Leitfähigkeit",
      "Kontaktflächen",
      "Lötbarkeit",
      "dekorative Oberflächen"
    ],
    "options": [
      "<strong>Glanzsilber:</strong> helle glänzende Silberoberfläche.",
      "<strong>Hartsilber:</strong> legierte bzw. härtere Silberausführung für höhere Verschleißanforderungen.",
      "<strong>Chemisch / stromlos versilbert:</strong> Silberabscheidung ohne klassische galvanische Stromführung.",
      "<strong>Nachbehandlungen:</strong> Polieren, Anlaufschutz oder Versiegeln / Schutzlack."
    ],
    "important": [
      "Schichtdicke",
      "Silbergehalt bzw. Legierung",
      "Unter-/Zwischenschichten",
      "Kontaktwiderstand",
      "Lötbarkeit",
      "Verschleiß",
      "Anlaufschutz"
    ],
    "standards": [
      "<strong>ISO 4521</strong> kann für galvanische Silberüberzüge relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Silber läuft in geeigneten Atmosphären sichtbar an. Anlaufschutz kann die Optik stabilisieren, darf bei elektrischen Kontakten aber die Funktion nicht ungewollt verschlechtern.",
    "example": "Stromkontakt versilbern; Hartsilber; definierte Schichtdicke; niedriger Kontaktwiderstand; kein isolierender Schutzlack auf Kontaktfläche."
  },
  "Aluminieren": {
    "summary": "Beim Aluminieren wird Aluminium metallisch auf einen anderen Werkstoff aufgebracht, vor allem für Korrosions- und Hochtemperaturschutz.",
    "purpose": [
      "Korrosionsschutz",
      "Hochtemperatur-/Oxidationsschutz",
      "große Stahlbauteile und thermisch belastete Komponenten"
    ],
    "options": [
      "<strong>Schmelztauchaluminieren / Feueraluminieren:</strong> Werkstück wird in eine Aluminium- bzw. Aluminiumlegierungsschmelze eingetaucht.",
      "<strong>Thermisches Spritzaluminieren:</strong> Aluminium wird aufgeschmolzen und als Spritzschicht auf die vorbereitete Oberfläche aufgebracht."
    ],
    "important": [
      "Schichtdicke",
      "Einsatztemperatur",
      "Korrosionsumgebung",
      "Vorbehandlung",
      "Versiegelung/Nachbehandlung",
      "Geometrie und Maßhaltigkeit"
    ],
    "standards": [
      "<strong>ISO 2063</strong> ist insbesondere für thermisch gespritzte metallische Schutzschichten aus Zink, Aluminium und deren Legierungen relevant. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Schmelztauchen und thermisches Spritzen sind unterschiedliche Verfahren. Für thermisch gespritzte Schichten ist die Strahlvorbereitung des Untergrunds besonders wichtig.",
    "example": "Stahlkonstruktion thermisch spritzaluminieren; definierte Schichtdicke; Außen-/Industrieatmosphäre; Strahlvorbereitung und Versiegelung nach Spezifikation."
  },
  "Eloxieren": {
    "summary": "Eloxieren ist die elektrochemische Oxidation von Aluminium. Die Oxidschicht wächst aus dem Aluminium selbst und wird nicht wie Lack aufgetragen.",
    "purpose": [
      "Korrosionsschutz",
      "dekorative Aluminiumoberflächen",
      "Härte und Verschleißschutz",
      "elektrisch isolierende Funktionsschichten"
    ],
    "options": [
      "<strong>Normaleloxal:</strong> Standardverfahren für dekorative und korrosionsschützende Anwendungen.",
      "<strong>Harteloxal / Hartanodisieren:</strong> technisch orientierte, härtere und häufig dickere Oxidschichten.",
      "<strong>Chromsäureanodisieren:</strong> spezielles anodisches Verfahren für definierte technische Anwendungen.",
      "<strong>Tioxal:</strong> spezielle anodische Aluminiumoberfläche mit charakteristischen Eigenschaften.",
      "<strong>Ematal:</strong> spezielle dekorativ-technische anodische Oberfläche.",
      "<strong>C-0:</strong> Natureloxal. <strong>C-31:</strong> Leichtbronze. <strong>C-32:</strong> Hellbronze. <strong>C-33:</strong> Mittelbronze. <strong>C-34:</strong> Dunkelbronze. <strong>C-35:</strong> Schwarz. <strong>C-36:</strong> Hellgrau. <strong>C-37:</strong> Mittelgrau. <strong>C-38:</strong> Dunkelgrau.",
      "<strong>Harteloxal-Farbe:</strong> Natur / Eigenfarbe oder Schwarz. <strong>Chromsäureanodisieren:</strong> Natur / Grau oder Schwarz.",
      "<strong>Verdichtung Ja:</strong> Poren werden geschlossen und die Beständigkeit wird typischerweise erhöht. <strong>Nein:</strong> kann für bestimmte technische Folgeprozesse bewusst gefordert sein."
    ],
    "important": [
      "Aluminiumlegierung",
      "Vorbehandlung und gewünschte Optik",
      "Schichtdicke",
      "Maßänderung",
      "Verdichtung",
      "Farbgleichmäßigkeit",
      "Kontakt-/Maskierstellen",
      "technische oder dekorative Funktion"
    ],
    "standards": [
      "<strong>QUALANOD:</strong> Qualitätslabel für anodisierte Aluminiumoberflächen. <strong>ISO 7599:</strong> allgemeine Spezifikationen für anodische Oxidschichten auf Aluminium. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Legierung und Ausgangsoberfläche beeinflussen Farbe und Gleichmäßigkeit stark. Zwei unterschiedliche Aluminiumlegierungen können trotz identischem Eloxalprozess sichtbar verschieden aussehen.",
    "example": "EN AW-6060 Profile; Normaleloxal C-0; 20 µm; verdichtet; Sichtflächen gleichmäßig; QUALANOD/ISO 7599 gefordert."
  },
  "Anodisieren": {
    "summary": "Anodisieren ist der übergeordnete Begriff für elektrochemisch erzeugte Oxidschichten. Im Formular wird es für anodische Anwendungen außerhalb der klassischen Aluminium-Eloxal-Auswahl geführt.",
    "purpose": [
      "technische Oxidschichten",
      "Korrosions- oder Verschleißfunktionen",
      "farbige oder technische Oberflächen auf geeigneten Metallen"
    ],
    "options": [
      "<strong>Natur / technisch:</strong> funktionelle Oberfläche ohne primäre Farbvorgabe.",
      "<strong>Farbig:</strong> anodische Oberfläche mit gewünschter Farbwirkung."
    ],
    "important": [
      "Grundwerkstoff und Legierung",
      "gewünschte Funktion",
      "Schichtdicke",
      "Farbe/Optik",
      "konkrete Prozess- oder Kundennorm",
      "Maß- und Maskieranforderungen"
    ],
    "standards": [
      "Im Formular ist <strong>SAE / AMS nach Vorgabe</strong> vorgesehen, wenn eine konkrete Luftfahrt-/Kundenspezifikation gilt. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Anodisieren ist kein universell identischer Prozess für alle Metalle. Werkstoff und Spezifikation müssen genannt werden, weil Elektrolyt, Spannung und Schichtcharakter stark variieren.",
    "example": "Titanbauteil anodisieren; farbig nach Referenz; konkrete AMS-/Kundenspezifikation; Sicht- und Kontaktflächen in Zeichnung markiert."
  },
  "Aluminium-Passivieren": {
    "summary": "Beim Passivieren von Aluminium wird eine dünne Konversionsschicht erzeugt, die Korrosionsschutz, Lackhaftfestigkeit oder elektrische Eigenschaften unterstützen kann.",
    "purpose": [
      "Vorbehandlung für Lack/Pulver",
      "Korrosionsschutz",
      "elektrisch leitfähige bzw. kontaktfähige Konversionsschichten"
    ],
    "options": [
      "<strong>Chrom(III)-Passivierung:</strong> Konversionsschicht auf Basis dreiwertiger Chromchemie.",
      "<strong>Chromfreie Passivierung:</strong> chromfreies Konversionssystem.",
      "<strong>Chrom(VI)-Chromatierung / Gelbchromatierung:</strong> klassische gelblich-iridisierende Chromatierung mit regulatorisch relevantem Chrom(VI)."
    ],
    "important": [
      "Korrosionsschutz",
      "Lackhaftfestigkeit",
      "elektrische Leitfähigkeit bzw. Kontaktwiderstand",
      "Optik",
      "Folgebeschichtung",
      "Werkstoff/Legierung"
    ],
    "standards": [
      "<strong>DIN EN 12487</strong> und <strong>ASTM B921</strong> können für chemische Konversionsschichten auf Aluminium relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Eine Konversionsschicht ist sehr dünn und nicht mit einer dicken Lack- oder Eloxalschicht zu verwechseln. Für elektrische Kontaktflächen ist der Kontaktwiderstand entscheidend.",
    "example": "Aluminiumgehäuse chromfrei passivieren; anschließende Pulverbeschichtung; gute Lackhaftfestigkeit; Massekontaktbereiche leitfähig und beschichtungsfrei halten."
  },
  "Edelstahl-Passivieren": {
    "summary": "Beim Edelstahl-Passivieren werden insbesondere freie Eisenverunreinigungen entfernt und die Ausbildung einer stabilen korrosionsbeständigen Passivschicht unterstützt.",
    "purpose": [
      "Entfernung von Fremdeisen",
      "Verbesserung des passiven Oberflächenzustands",
      "hygienische und korrosionskritische Edelstahlbauteile"
    ],
    "options": [
      "<strong>Salpetersäure-Passivierung:</strong> klassisches Passivierungsverfahren.",
      "<strong>Zitronensäure-Passivierung:</strong> alternative chemische Passivierung mit Zitronensäure."
    ],
    "important": [
      "Edelstahlgüte",
      "Oberflächenzustand",
      "Fremdeisen/Verunreinigungen",
      "vorheriges Beizen oder Elektropolieren",
      "Korrosionsanforderung",
      "Reinheit und Prüfanforderungen"
    ],
    "standards": [
      "<strong>ASTM A967/A967M:</strong> Passivierungsbehandlungen für Edelstahlteile. <strong>ASTM A380/A380M:</strong> Reinigung, Entzunderung und Passivierung von Edelstahl. <strong>AMS 2700:</strong> Passivierungsanforderungen insbesondere im Aerospace-Umfeld. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Passivieren ist keine zusätzliche Metallschicht und ersetzt bei starken Schweißanlauffarben oder Oxiden nicht automatisch das Beizen. Edelstahlwerkzeuge müssen fremdeisenfrei eingesetzt werden.",
    "example": "1.4404 Bauteil; nach Bearbeitung zitronensäure-passivieren; Fremdeisenfreiheit gefordert; ASTM A967; Sichtoberfläche darf optisch nicht verändert werden."
  },
  "Zinkphosphatieren": {
    "summary": "Zinkphosphatieren erzeugt eine kristalline Phosphatschicht, häufig als Lackvorbehandlung oder funktionelle Konversionsschicht.",
    "purpose": [
      "Haftgrund für Lack/KTL",
      "Korrosionsschutzsysteme",
      "Ölaufnahme und funktionelle Vorbehandlung"
    ],
    "options": [
      "<strong>Geölt:</strong> Öl wird von der Phosphatschicht aufgenommen und kann Schutz-/Gleiteigenschaften verbessern.",
      "<strong>Versiegelt:</strong> zusätzliche chemische Nachbehandlung zur Stabilisierung bzw. Verbesserung des Schutzes."
    ],
    "important": [
      "Schichtgewicht",
      "Vorbehandlung",
      "Korrosionsschutzanforderung",
      "Folgebeschichtung",
      "Nachbehandlung"
    ],
    "standards": [
      "<strong>ISO 9717</strong> beschreibt Phosphatüberzüge auf Metallen. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Bei Phosphatierungen ist häufig das Schichtgewicht in g/m² aussagekräftiger als eine klassische Schichtdicke in µm.",
    "example": "Stahlteil zinkphosphatieren; Schichtgewicht nach Spezifikation; anschließend KTL; keine Öl-Nachbehandlung vor Lackierung."
  },
  "Eisenphosphatieren": {
    "summary": "Eisenphosphatieren erzeugt eine vergleichsweise leichte Phosphatschicht und wird häufig als Vorbehandlung vor organischen Beschichtungen eingesetzt.",
    "purpose": [
      "Lack- und Pulverlackvorbehandlung",
      "Oberflächenkonditionierung",
      "Unterstützung von Haftfestigkeit und Korrosionsschutz"
    ],
    "options": [
      "<strong>Geölt:</strong> Öl-Nachbehandlung für temporären Schutz bzw. spezielle Anwendungen.",
      "<strong>Versiegelt:</strong> chemische Nachbehandlung der Phosphatschicht."
    ],
    "important": [
      "Schichtgewicht",
      "Grundwerkstoff",
      "Folgebeschichtung",
      "Korrosionsanforderung",
      "Reinigungs- und Spülprozess"
    ],
    "standards": [
      "<strong>ISO 9717</strong> beschreibt Phosphatüberzüge auf Metallen. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Eisenphosphatieren ist nicht automatisch gleichwertig mit Zinkphosphatieren. Die geeignete Vorbehandlung hängt von Werkstoff, Beschichtung und gefordertem Korrosionsschutz ab.",
    "example": "Stahlblech eisenphosphatieren als Vorbehandlung für Pulverbeschichtung; anschließend direkt beschichten; Korrosionsanforderung in Spezifikation."
  },
  "Mn-Phosphatieren": {
    "summary": "Manganphosphatieren erzeugt eine ausgeprägte kristalline Phosphatschicht, die besonders für tribologische Anwendungen genutzt wird.",
    "purpose": [
      "Einlaufverhalten",
      "Ölaufnahme",
      "Reib- und Gleiteigenschaften",
      "Verschleißunterstützung"
    ],
    "options": [
      "<strong>Geölt:</strong> typische Nachbehandlung, weil die poröse Schicht Öl aufnehmen kann.",
      "<strong>Versiegelt:</strong> zusätzliche Nachbehandlung für definierte Schutzanforderungen."
    ],
    "important": [
      "Schichtgewicht",
      "Gleit-/Verschleißanforderung",
      "Ölsorte bzw. Nachbehandlung",
      "Maßhaltigkeit",
      "Vorbehandlung"
    ],
    "standards": [
      "<strong>ISO 9717</strong> beschreibt Phosphatüberzüge auf Metallen. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Die Manganphosphatschicht wird oft nicht als alleiniger Korrosionsschutz betrachtet, sondern als System zusammen mit Öl oder anderen Nachbehandlungen.",
    "example": "Getriebeteil manganphosphatieren; geölt; Schichtgewicht nach Zeichnung; Einlauf- und Gleiteigenschaften gefordert."
  },
  "Brünieren": {
    "summary": "Brünieren erzeugt auf geeigneten Eisenwerkstoffen eine dünne dunkle Konversionsschicht mit sehr geringer Maßänderung.",
    "purpose": [
      "dunkle Optik",
      "leichter Korrosionsschutz zusammen mit Konservierung",
      "maßhaltige Maschinen- und Werkzeugteile"
    ],
    "options": [
      "<strong>Heißbrünieren:</strong> klassischer chemischer Prozess bei erhöhter Temperatur.",
      "<strong>Kaltbrünieren:</strong> Prozess bei niedrigerer Temperatur, häufig für Reparatur-/Sonderanwendungen."
    ],
    "important": [
      "Optik",
      "Korrosionsanforderung",
      "Ölen/Konservierung",
      "Maßhaltigkeit",
      "Werkstoff"
    ],
    "standards": [
      "<strong>DIN 50938</strong> kann für Brünieren von Eisenwerkstoffen relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Die Brünierschicht selbst bietet nur begrenzten Korrosionsschutz. Häufig ist die anschließende Konservierung mit Öl ein wesentlicher Teil des Systems.",
    "example": "Präzisionsteil aus Stahl heißbrünieren; schwarz gleichmäßig; anschließend ölen; Passungen und Maße unverändert erhalten."
  },
  "Beizen": {
    "summary": "Beizen entfernt Oxide, Zunder, Rost oder oberflächennahe Verunreinigungen chemisch bzw. elektrochemisch.",
    "purpose": [
      "Entrosten und Entzundern",
      "Entfernung von Schweißanlauffarben",
      "Aktivierung vor weiteren Oberflächenprozessen"
    ],
    "options": [
      "<strong>Chemisch:</strong> Material wird durch ein geeignetes Beizmedium kontrolliert angegriffen.",
      "<strong>Elektrochemisch:</strong> chemische Wirkung wird durch elektrische Stromführung unterstützt."
    ],
    "important": [
      "Bearbeitungsziel",
      "Grundwerkstoff",
      "gewünschter bzw. maximaler Materialabtrag",
      "Beizmedium, falls vorgeschrieben",
      "Passivierung/Folgebehandlung",
      "kritische Maße"
    ],
    "standards": [
      "<strong>EN ISO 8504-4</strong> kann für chemische Oberflächenvorbereitung von Stahl relevant sein. <strong>ASTM A380/A380M</strong> ist für Reinigung/Beizen/Passivieren von Edelstahl relevant. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Beizen ist echter Materialabtrag. Bei Passungen, dünnen Bauteilen oder hochfesten Stählen müssen Werkstoffangriff und mögliche Wasserstoffeffekte berücksichtigt werden.",
    "example": "Edelstahl-Schweißbaugruppe beizen; Anlauffarben vollständig entfernen; anschließend passivieren; Sichtflächen gleichmäßig."
  },
  "Elektropolieren": {
    "summary": "Elektropolieren ist ein elektrochemischer Materialabtrag, bei dem Oberflächenspitzen bevorzugt reduziert werden.",
    "purpose": [
      "Rauheitsreduzierung",
      "bessere Reinigbarkeit",
      "glänzende Edelstahloberflächen",
      "Unterstützung der Korrosionsbeständigkeit"
    ],
    "options": [
      "Das Formular enthält keine weitere Verfahrensauswahl; entscheidend sind die technischen Zielwerte wie Rauheit, Glanz und zulässiger Materialabtrag."
    ],
    "important": [
      "Ra-/Rz-Zielwert",
      "Materialabtrag",
      "Werkstoffgüte",
      "Glanz/Optik",
      "Passivierung",
      "Reinheitsanforderungen",
      "Maßtoleranzen"
    ],
    "standards": [
      "<strong>DIN EN ISO 15730</strong> und <strong>ASTM B912</strong> können für Elektropolieren/Passivieren von Edelstahl relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Elektropolieren kann eine schlecht vorbereitete oder stark zerkratzte Oberfläche nicht beliebig einebnen. Für enge Rauheitsziele ist der Ausgangszustand entscheidend.",
    "example": "1.4404 Rohrbauteil elektropolieren; Ra ≤ 0,8 µm; hygienische Oberfläche; Materialabtrag maßlich berücksichtigt; Prüfprotokoll gefordert."
  },
  "Strahlen": {
    "summary": "Beim Strahlen trifft ein Strahlmittel mit hoher Geschwindigkeit auf die Oberfläche. Das Verfahren kann reinigen, aufrauen, mattieren oder Material abtragen.",
    "purpose": [
      "Entrosten und Entzundern",
      "Lack-/Beschichtungsentfernung",
      "Aufrauen für Folgebeschichtungen",
      "Mattieren und Oberflächenfinish"
    ],
    "options": [
      "<strong>Sandstrahlen:</strong> allgemeine Bezeichnung für abrasives Strahlen mit mineralischen Medien.",
      "<strong>Glasperlenstrahlen:</strong> häufig für gleichmäßig matte/satinierte Oberflächen.",
      "<strong>Korundstrahlen:</strong> scharfkantig und abrasiv; gut zum Aufrauen und Reinigen.",
      "<strong>Stahlkiesstrahlen:</strong> metallisches Strahlmittel für robuste Stahloberflächen.",
      "<strong>Keramikperlenstrahlen:</strong> feines, langlebiges Medium für gleichmäßige Oberflächen.",
      "<strong>Sodastrahlen:</strong> relativ schonendes Reinigungsverfahren.",
      "<strong>Kunststoffstrahlen:</strong> für empfindlichere Oberflächen bzw. spezielle Entlackungsaufgaben.",
      "<strong>Kugelstrahlen:</strong> runde Medien; je nach Prozess Reinigung oder gezielte mechanische Oberflächenbeeinflussung.",
      "<strong>Staubstrahlen:</strong> sehr feine Strahlbearbeitung für empfindliche bzw. fein definierte Oberflächen."
    ],
    "important": [
      "Bearbeitungsziel",
      "Reinheitsgrad",
      "Rauheitsprofil",
      "Strahlmittel",
      "Werkstoff",
      "Folgebeschichtung",
      "Vermeidung von Fremdeisen bei Edelstahl"
    ],
    "standards": [
      "<strong>ISO 8501-1:</strong> visuelle Reinheitsgrade wie Sa 1, Sa 2, Sa 2½ und Sa 3. <strong>ISO 8503:</strong> Rauheits-/Oberflächenprofil gestrahlter Stahloberflächen. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Reinheitsgrad und Rauheit sind zwei verschiedene Anforderungen. Sa 2½ sagt nicht aus, welchen Ra/Rz-Wert oder welches Profil die Oberfläche hat.",
    "example": "Stahlrahmen strahlen auf Sa 2½; definierter Rauheitsbereich für nachfolgende Beschichtung; Strahlmittel frei von schädlicher Kontamination."
  },
  "Schleifen": {
    "summary": "Schleifen ist eine spanende Feinbearbeitung mit abrasivem Werkzeug zur Form-, Maß- oder Oberflächenbearbeitung.",
    "purpose": [
      "Rauheitsreduzierung",
      "Vorbereitung zum Polieren oder Beschichten",
      "definiertes Sichtschliffbild",
      "Maß- und Formkorrektur"
    ],
    "options": [
      "<strong>Bandschleifen:</strong> gut für größere Flächen und gerichtete Schliffbilder.",
      "<strong>Flachschleifen:</strong> präzise Bearbeitung ebener Flächen.",
      "<strong>Rundschleifen:</strong> Bearbeitung rotationssymmetrischer Flächen.",
      "<strong>Handschleifen:</strong> manuelle Bearbeitung lokaler oder komplexer Bereiche."
    ],
    "important": [
      "Körnung",
      "Ra/Rz",
      "Schliffbild und Schleifrichtung",
      "Materialabtrag",
      "Maßtoleranz",
      "Sichtflächen"
    ],
    "standards": [
      "<strong>ISO 21920</strong> ist für geometrische Produktspezifikation und Oberflächenprofil-Kenngrößen relevant. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Körnung und Rauheitswert sind nicht dasselbe. Ein Schleifpapier mit gleicher Körnung kann je nach Prozess unterschiedliche Ra-/Rz-Werte und Schliffbilder erzeugen.",
    "example": "Edelstahlblech längs schleifen; Körnung 240 als Prozessvorgabe; Ra-Ziel nach Zeichnung; keine Querschliffe auf Sichtseite."
  },
  "Polieren": {
    "summary": "Polieren ist eine sehr feine mechanische Oberflächenbearbeitung zur Glättung und/oder Glanzsteigerung.",
    "purpose": [
      "technische Rauheitsreduzierung",
      "dekorative Sichtoberflächen",
      "Hochglanz- oder Spiegelwirkung"
    ],
    "options": [
      "<strong>Technisch:</strong> funktionelle Oberflächenqualität, z. B. definierte Rauheit.",
      "<strong>Dekorativ:</strong> optische Wirkung steht im Vordergrund.",
      "<strong>Hochglanz:</strong> stark reflektierende Oberfläche; definiert allein keinen exakten Ra-Wert."
    ],
    "important": [
      "Glanz bzw. Referenzoberfläche",
      "Ra/Rz",
      "Materialabtrag",
      "Werkstoff",
      "Sicht-/Funktionsflächen",
      "Maßhaltigkeit"
    ],
    "standards": [
      "<strong>ISO 21920</strong> kann für Rauheits-/Profilanforderungen relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Polieren trägt Material ab und kann Kanten, Gravuren oder Maße verändern. Bei beschichteten Teilen muss außerdem genügend Schichtreserve vorhanden sein.",
    "example": "Edelstahl-Sichtteil dekorativ hochglanzpolieren; Referenzmuster verbindlich; keine sichtbaren Schleifspuren; Funktionspassung nicht bearbeiten."
  },
  "Bürsten": {
    "summary": "Bürsten bearbeitet die Oberfläche mit metallischen oder abrasiven Bürstwerkzeugen und kann reinigen, strukturieren, mattieren oder leicht entgraten.",
    "purpose": [
      "dekoratives Bürstbild",
      "Reinigung",
      "Mattierung",
      "leichte Entgratung/Kantenbearbeitung"
    ],
    "options": [
      "<strong>Technisch:</strong> funktionelle Reinigung bzw. Oberflächenbearbeitung.",
      "<strong>Dekorativ:</strong> sichtbares gleichmäßiges Bürstbild.",
      "<strong>Mattierend:</strong> diffuse, weniger reflektierende Oberfläche.",
      "<strong>Entgraten / Kanten brechen:</strong> leichte Grate entfernen bzw. Kanten entschärfen."
    ],
    "important": [
      "Bürstbild",
      "Bürstrichtung",
      "Werkzeug/Körnung",
      "Ra/Rz",
      "Kantenanforderung",
      "Werkstoff und Kontaminationsschutz"
    ],
    "standards": [
      "<strong>ISO 21920</strong> kann für Rauheits-/Profilanforderungen relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Bei Edelstahl dürfen keine ungeeigneten Stahlbürsten oder kontaminierten Werkzeuge verwendet werden, da Fremdeisen später Roststellen verursachen kann.",
    "example": "Edelstahlfront dekorativ längs bürsten; gleichmäßiges Bild; keine Querschliffe; Referenzmuster; Kanten nur leicht brechen."
  },
  "Trowalisieren": {
    "summary": "Trowalisieren bzw. Gleitschleifen bewegt Werkstücke zusammen mit Schleif- oder Polierkörpern und Prozessflüssigkeit.",
    "purpose": [
      "Entgraten",
      "Kanten verrunden",
      "Glätten",
      "Polieren/Entmattieren",
      "Serienbearbeitung kleiner und mittlerer Teile"
    ],
    "options": [
      "<strong>Vibrationsgleitschleifen:</strong> verbreitet für Entgraten, Glätten und Verrunden.",
      "<strong>Trommelgleitschleifen:</strong> einfache rotierende Trommel, gut für robuste Werkstücke.",
      "<strong>Fliehkraftgleitschleifen:</strong> hohe Bearbeitungsintensität und kurze Prozesszeiten.",
      "<strong>Schleppschleifen:</strong> Werkstücke werden fixiert durch das Medium bewegt; Werkstück-zu-Werkstück-Kontakt kann vermieden werden."
    ],
    "important": [
      "Bearbeitungsziel",
      "zulässiger Materialabtrag",
      "Kantenradius",
      "Ra/Rz",
      "Kontaktspuren zulässig?",
      "Maßhaltigkeit"
    ],
    "standards": [
      "<strong>DIN 8589</strong> kann im Kontext spanender/abrasiver Fertigungsverfahren relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Beim normalen Gleitschleifen können Werkstücke einander berühren. Für hochwertige Sichtteile oder empfindliche Geometrien kann Schleppschleifen geeigneter sein.",
    "example": "Kleine Frästeile vibrationsgleitschleifen; gratfrei und Kanten leicht verrundet; maximaler Materialabtrag nach Zeichnung."
  },
  "Entgraten": {
    "summary": "Entgraten entfernt unerwünschte scharfe Grate und Bearbeitungsüberstände.",
    "purpose": [
      "Sicherheit",
      "Montagefähigkeit",
      "Beschichtbarkeit",
      "Schutz von Dichtungen und Passungen"
    ],
    "options": [
      "<strong>Mechanisch:</strong> Schleifen, Fräsen, Feilen oder Maschinenentgraten.",
      "<strong>Thermisch:</strong> sehr kurze thermische Reaktion entfernt geeignete Grate auch in schwer zugänglichen Bereichen.",
      "<strong>Elektrochemisch:</strong> selektiver elektrochemischer Materialabtrag.",
      "<strong>Gleitschleifen:</strong> wirtschaftlich für viele kleine Teile.",
      "<strong>Bürsten / Schleifen:</strong> klassische mechanische Entgratung."
    ],
    "important": [
      "gratfrei vs. Kantenradius",
      "Innen-/Außenkanten",
      "Bohrungsdurchbrüche",
      "Sichtflächen",
      "Materialabtrag",
      "kritische Maße"
    ],
    "standards": [
      "<strong>ISO 13715</strong> beschreibt Angaben für Kanten unbestimmter Form. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Gratfrei bedeutet nicht automatisch verrundet. Soll ein definierter Radius entstehen, muss dieser separat angegeben werden.",
    "example": "Laserschnittteile allseitig gratfrei; Außenkanten leicht brechen, kein definierter Radius; Sichtflächen ohne Schleifspuren."
  },
  "Verrunden": {
    "summary": "Beim Verrunden werden scharfe Kanten gezielt mit einer Rundung versehen.",
    "purpose": [
      "bessere Beschichtbarkeit",
      "gleichmäßigerer Kantenschutz",
      "Sicherheit und Haptik",
      "definierte Geometrie"
    ],
    "options": [
      "<strong>Gleitschleifen:</strong> gleichzeitige Verrundung vieler zugänglicher Kanten.",
      "<strong>Bürsten / Schleifen:</strong> mechanische Kantenbearbeitung.",
      "<strong>Strahlen:</strong> kann je nach Prozess Kanten beeinflussen, ist jedoch weniger exakt als spanende Bearbeitung.",
      "<strong>Mechanisch:</strong> gezielte Bearbeitung mit Werkzeug/Maschine."
    ],
    "important": [
      "gewünschter Radius",
      "welche Innen-/Außenkanten",
      "zulässiger Materialabtrag",
      "Pass-/Dichtflächen",
      "Sichtkanten"
    ],
    "standards": [
      "<strong>ISO 13715</strong> ist für die Zeichnungsangabe von Kanten relevant. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "R2 bedeutet Radius 2 mm. 'Kanten brechen' ist dagegen keine gleichbedeutende Angabe und kann nur eine kleine Fase oder leichte Verrundung meinen.",
    "example": "Alle zugänglichen Außenkanten R2; Innenkanten und Passflächen unverändert; Radius auf Sichtkanten gleichmäßig."
  },
  "Glätten": {
    "summary": "Glätten reduziert Unebenheiten, Rauheitsspitzen oder Bearbeitungsspuren, ohne dass Hochglanz zwingend das Ziel ist.",
    "purpose": [
      "Rauheitsreduzierung",
      "Funktionsflächen",
      "Vorbereitung zum Polieren/Beschichten",
      "Verbesserung der Reinigbarkeit"
    ],
    "options": [
      "<strong>Mechanisch:</strong> gezielter Materialabtrag mit Werkzeugen.",
      "<strong>Gleitschleifen:</strong> flächige Serienbearbeitung.",
      "<strong>Chemisch:</strong> kontrollierter chemischer Materialabtrag.",
      "<strong>Elektropolieren:</strong> elektrochemisches Einebnen.",
      "<strong>Bürsten / Schleifen:</strong> mechanische Glättung bzw. Vereinheitlichung."
    ],
    "important": [
      "Ra/Rz",
      "Materialabtrag",
      "Maße",
      "optische Anforderungen",
      "Funktionsflächen"
    ],
    "standards": [
      "<strong>ISO 21920</strong> kann für Profil- und Rauheitskennwerte relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Eine optisch glatte Oberfläche besitzt nicht automatisch einen definierten Ra-Wert. Wenn die Funktion davon abhängt, muss der Messwert angegeben werden.",
    "example": "Funktionsfläche glätten auf Ra ≤ 1,6 µm; Maßtoleranz nach Zeichnung; übrige Flächen unbearbeitet."
  },
  "Mattieren": {
    "summary": "Mattieren erzeugt eine optisch weniger reflektierende Oberfläche durch mechanische, strahltechnische oder chemische Bearbeitung.",
    "purpose": [
      "dekorative matte Oberflächen",
      "gleichmäßiges Erscheinungsbild",
      "Vorbehandlung vor Eloxieren oder anderen Prozessen"
    ],
    "options": [
      "<strong>Strahlen:</strong> matte Oberfläche durch geeignetes Strahlmittel.",
      "<strong>Schleifen:</strong> gerichtetes mattes Schliffbild.",
      "<strong>Bürsten:</strong> satinierte/gebürstete Mattierung.",
      "<strong>Chemisch:</strong> chemische Mikrostrukturierung, z. B. bei Aluminium."
    ],
    "important": [
      "Mattierungsgrad",
      "Ra/Rz",
      "Strahl-/Schliffbild",
      "Werkstoff",
      "Materialabtrag",
      "Referenzmuster"
    ],
    "standards": [
      "<strong>ISO 21920</strong> kann für Rauheitskennwerte relevant sein. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Matt ist eine optische Beschreibung und kein Rauheitswert. Eine Oberfläche kann matt und trotzdem sehr fein oder relativ rau sein.",
    "example": "Aluminium-Sichtteil chemisch mattieren vor Eloxieren; gleichmäßige Optik nach Referenzmuster; keine Wolkenbildung."
  },
  "Chemisches Glänzen": {
    "summary": "Chemisches Glänzen ebnet und hellt eine Metalloberfläche durch kontrollierten chemischen Materialabtrag auf.",
    "purpose": [
      "dekoratives Glänzen",
      "Vorbehandlung vor Eloxieren",
      "optische Vereinheitlichung von Aluminium, Kupfer oder Messing"
    ],
    "options": [
      "Im Formular gibt es keine Unterverfahrensauswahl; entscheidend sind gewünschter Glanz, Referenzoberfläche, Materialabtrag und Folgebehandlung."
    ],
    "important": [
      "Werkstoff/Legierung",
      "Glanzziel",
      "Materialabtrag",
      "Maßtoleranz",
      "Folgebehandlung, z. B. Eloxieren",
      "Referenzmuster"
    ],
    "standards": [
      "<strong>DIN 17611</strong> ist im Kontext anodisierter Aluminiumhalbzeuge bzw. dekorativer Aluminiumoberflächen relevant. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Besonders bei Aluminium beeinflusst die Legierung das erreichbare Glanzergebnis stark. Chemisches Glänzen ist nicht mit mechanischem Polieren oder Elektropolieren gleichzusetzen.",
    "example": "EN AW-6060 chemisch glänzen, anschließend Natureloxal; Optik nach Freigabemuster; Materialabtrag berücksichtigen."
  },
  "Entlacken": {
    "summary": "Entlacken entfernt vorhandene Lack-, Pulver- oder KTL-Systeme, um den Grundwerkstoff freizulegen oder neu beschichten zu können.",
    "purpose": [
      "Aufarbeitung und Neubeschichtung",
      "Reparatur",
      "Entfernung fehlerhafter oder alter Beschichtungen"
    ],
    "options": [
      "<strong>Chemisch:</strong> Beschichtung wird mit geeigneter Chemie gelöst oder aufgequollen.",
      "<strong>Thermisch:</strong> Beschichtung wird durch Wärme zersetzt bzw. pyrolysiert.",
      "<strong>Mechanisch:</strong> z. B. Strahlen, Schleifen oder Bürsten.",
      "<strong>Laserentlackung:</strong> gezielter Abtrag durch Laserenergie."
    ],
    "important": [
      "Art/Zustand der Beschichtung",
      "Grundwerkstoff",
      "Entlackungsumfang",
      "zulässiger Materialabtrag",
      "Oberflächenzustand danach",
      "Konservierung/Folgebeschichtung"
    ],
    "standards": [
      "<strong>QUALISTRIP</strong> ist ein Qualitätslabel für kontrollierte Entlackungsprozesse. ISO 9001/14001: Managementsysteme."
    ],
    "practice": "Nicht jedes Entlackungsverfahren ist für jeden Grundwerkstoff geeignet. Wärme kann Bauteile verziehen oder beeinflussen; aggressive Chemie kann den Grundwerkstoff angreifen.",
    "example": "Aluminiumprofile mit Pulverlack vollständig entlacken; Grundwerkstoff nicht sichtbar angreifen; anschließend für erneutes Pulverbeschichten vorbereiten."
  },
  "Entzinken": {
    "summary": "Entzinken entfernt vorhandene Zink- bzw. zinkbasierte Schichten zur Reparatur oder Neubeschichtung.",
    "purpose": [
      "Aufarbeitung verzinkter Teile",
      "Neubeschichtung",
      "Korrektur fehlerhafter Zinkschichten"
    ],
    "options": [
      "<strong>Chemisch:</strong> kontrolliertes chemisches Lösen der Zinkschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemischer Abtrag der Zinkschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozessreste entfernen.",
      "<strong>Konservieren / Korrosionsschutz:</strong> den freigelegten Stahl temporär schützen.",
      "<strong>Aktivieren für Neubeschichtung:</strong> Oberfläche unmittelbar für den Folgeprozess vorbereiten."
    ],
    "important": [
      "Art des Zinksystems",
      "Grundwerkstoff",
      "Entzinkungsumfang",
      "Materialabtrag",
      "Korrosionsschutz nach dem Entzinken",
      "Folgeprozess"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Feuerzink, galvanisches Zink und Zinklegierungen benötigen unterschiedliche Prozessführung. Der freigelegte Stahl kann nach dem Entzinken sehr schnell korrodieren.",
    "example": "Stahlteil chemisch entzinken; gesamte Zinkschicht entfernen; anschließend sofort aktivieren und neu galvanisch verzinken."
  },
  "Entnickeln": {
    "summary": "Entnickeln entfernt eine vorhandene Nickel- bzw. Nickel-Phosphor-Schicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Nickel- bzw. Nickel-Phosphor-Schicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Nickel- bzw. Nickel-Phosphor-Schicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Stahlteil chemisch entnickeln; chemisch Nickel vollständig entfernen; Grundwerkstoff schützen; anschließend neu beschichten."
  },
  "Entchromen": {
    "summary": "Entchromen entfernt eine vorhandene Chromschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Chromschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Chromschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "vorhandener Kupfer-/Nickel-Unterbau"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Dekoratives Bauteil elektrochemisch entchromen; nur Chrom entfernen, Nickelschicht erhalten; anschließend neu verchromen."
  },
  "Entkupfern": {
    "summary": "Entkupfern entfernt eine vorhandene Kupferschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Kupferschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Kupferschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Stahlbauteil chemisch entkupfern; Kupfer-Zwischenschicht vollständig entfernen; Grundwerkstoff schonen; anschließend aktivieren."
  },
  "Entmessingen": {
    "summary": "Entmessingen entfernt eine vorhandene Messingschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Messingschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Messingschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Dekoratives Bauteil chemisch entmessingen; gesamte Messingschicht entfernen; Untergrund für Neubeschichtung vorbereiten."
  },
  "Entbronzieren": {
    "summary": "Entbronzieren entfernt eine vorhandene Bronzeschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Bronzeschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Bronzeschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "Bronzelegierung bzw. Zusammensetzung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Funktionsbauteil chemisch entbronzieren; Hartbronze entfernen; Grundmaß und Grundwerkstoff erhalten; anschließend Neubeschichtung."
  },
  "Entgolden": {
    "summary": "Entgolden entfernt eine vorhandene Goldschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Goldschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Goldschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "gewünschte Edelmetallrückgewinnung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Kontaktteile elektrochemisch entgolden; Edelmetallrückgewinnung gewünscht; Nickelsperrschicht möglichst erhalten."
  },
  "Entsilbern": {
    "summary": "Entsilbern entfernt eine vorhandene Silberschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Silberschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Silberschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "gewünschte Edelmetallrückgewinnung"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Kupferkontakte chemisch entsilbern; Silber rückgewinnen; Grundwerkstoff schonen; anschließend neu versilbern."
  },
  "Entzinnen": {
    "summary": "Entzinnen entfernt eine vorhandene Zinn- bzw. Zinnlegierungsschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen Zinn- bzw. Zinnlegierungsschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen Zinn- bzw. Zinnlegierungsschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "eventuelle Diffusionsschichten"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Kupferkontakt elektrochemisch entzinnen; Zinn vollständig entfernen; Zwischenschicht beachten; anschließend neu verzinnen."
  },
  "Entaluminieren": {
    "summary": "Entaluminieren entfernt eine vorhandene metallischen Aluminiumschicht, ohne den Grundwerkstoff stärker als zulässig zu verändern.",
    "purpose": [
      "Reparatur",
      "Neubeschichtung",
      "Aufarbeitung und Wiederverwendung"
    ],
    "options": [
      "<strong>Chemisch:</strong> chemische Entfernung der vorhandenen metallischen Aluminiumschicht.",
      "<strong>Elektrochemisch:</strong> elektrochemische Entfernung der vorhandenen metallischen Aluminiumschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen und Oberfläche stabilisieren.",
      "<strong>Aktivieren / Dekapieren:</strong> Oberfläche für den nächsten Prozess chemisch aktivieren.",
      "<strong>Konservieren / Korrosionsschutz:</strong> freigelegten Grundwerkstoff bis zur Weiterbearbeitung schützen.",
      "<strong>Vorbereitung für Neubeschichtung:</strong> Oberfläche gezielt für den Folgeprozess herstellen."
    ],
    "important": [
      "Art und Zustand der vorhandenen Schicht",
      "Grundwerkstoff",
      "Zwischen-/Deckschichten",
      "gewünschter Entschichtungsumfang",
      "Schutz des Grundwerkstoffs",
      "zulässiger Materialabtrag",
      "Folgebehandlung",
      "eventuelle Diffusions-/Zwischenschichten"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Bei Mehrschichtsystemen muss eindeutig festgelegt werden, ob nur die oberste Schicht oder der gesamte Schichtaufbau entfernt werden soll.",
    "example": "Stahlteil chemisch entaluminieren; Aluminiumschicht entfernen; Grundwerkstoff nicht angreifen; anschließend neu beschichten."
  },
  "Enteloxieren": {
    "summary": "Enteloxieren entfernt die anodische Oxidschicht von Aluminium. Da die Eloxalschicht aus dem Grundwerkstoff entstanden ist, kann der Entschichtungsprozess auch das Aluminiummaß beeinflussen.",
    "purpose": [
      "Neueloxieren",
      "Korrektur fehlerhafter Eloxalschichten",
      "Aufarbeitung von Aluminiumteilen"
    ],
    "options": [
      "<strong>Chemisch / Beizen:</strong> chemische Entfernung der Eloxalschicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozesschemie entfernen.",
      "<strong>Dekapieren / Aktivieren:</strong> Oberfläche für Folgeprozesse aktivieren.",
      "<strong>Vorbereitung für erneutes Eloxieren:</strong> Oberfläche gezielt für die neue Eloxalschicht herstellen.",
      "<strong>Konservieren / Korrosionsschutz:</strong> temporärer Schutz, wenn nicht sofort weiterbehandelt wird."
    ],
    "important": [
      "Aluminiumlegierung",
      "Art/Dicke der Eloxalschicht",
      "zulässiger Materialabtrag",
      "Maßhaltigkeit",
      "gewünschter Oberflächenzustand",
      "erneutes Eloxieren"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Enteloxieren kann Maße und Oberflächenoptik verändern. Besonders bei wiederholtem Enteloxieren und Neueloxieren muss der kumulierte Materialabtrag berücksichtigt werden.",
    "example": "EN AW-6060 Profil chemisch enteloxieren; anschließend erneut C-0 eloxieren; Sichtmaß und Passung prüfen."
  },
  "Entanodisieren": {
    "summary": "Entanodisieren entfernt eine anodisch erzeugte Oxidschicht von einem geeigneten Grundwerkstoff.",
    "purpose": [
      "Neuanodisieren",
      "Reparatur",
      "Aufarbeitung technischer anodischer Schichten"
    ],
    "options": [
      "<strong>Chemisch / Beizen:</strong> chemische Entfernung der Oxidschicht.",
      "<strong>Mechanisch / Strahlen:</strong> mechanischer Abtrag der anodischen Schicht.",
      "<strong>Neutralisieren / Spülen:</strong> Prozessreste entfernen.",
      "<strong>Dekapieren / Aktivieren:</strong> Oberfläche für Folgeprozess vorbereiten.",
      "<strong>Vorbereitung für erneutes Anodisieren:</strong> erneute anodische Behandlung ermöglichen.",
      "<strong>Konservieren / Korrosionsschutz:</strong> temporärer Schutz des freigelegten Grundwerkstoffs."
    ],
    "important": [
      "Grundwerkstoff und Legierung",
      "Art der anodischen Schicht",
      "Materialabtrag",
      "Maßhaltigkeit",
      "Folgeprozess"
    ],
    "standards": [
      "ISO 9001 und ISO 14001 können als Managementanforderungen relevant sein."
    ],
    "practice": "Die geeignete Entanodisierung hängt stark vom Grundwerkstoff ab. Ein Verfahren für Aluminium kann nicht einfach auf Titan, Magnesium oder andere Metalle übertragen werden.",
    "example": "Anodisierte Titanbauteile nach Spezifikation entanodisieren; Grundwerkstoff schützen; anschließend erneut anodisieren."
  },
  "Folieren": {
    "summary": "Beim Folieren wird eine technische oder dekorative Folie auf eine vorbereitete Oberfläche aufgebracht.",
    "purpose": [
      "Dekoration",
      "Oberflächenschutz",
      "Kennzeichnung",
      "funktionelle Folienanwendungen"
    ],
    "options": [
      "<strong>Innen:</strong> Anwendung in geschützter Umgebung; Witterung und UV sind meist weniger kritisch.",
      "<strong>Außen:</strong> Folie muss zu UV-, Witterungs-, Temperatur- und Feuchtigkeitsbelastung passen."
    ],
    "important": [
      "Folienart/Hersteller",
      "Farbe oder Design",
      "Innen/Außen",
      "vollflächig oder Teilbereiche",
      "Untergrund",
      "Temperatur/UV/Chemikalien",
      "gewünschte Haltbarkeit"
    ],
    "standards": [
      "ISO 9001/14001 und RoHS/REACH können je nach Auftrag/Material als Unternehmens- bzw. Stoffanforderungen relevant sein. <strong>RAL-GZ 716</strong> kann für Kunststoff-Fensterprofilsysteme bzw. relevante Güteanforderungen eine Rolle spielen."
    ],
    "practice": "Die Haftfestigkeit einer Folie hängt stark vom Untergrund und dessen Oberflächenenergie, Sauberkeit und Struktur ab. Frische Lack-/Pulverbeschichtungen müssen ausreichend ausgehärtet sein.",
    "example": "Aluminiumblende außen folieren; UV-beständige schwarze Dekorfolie; Teilbereiche nach Zeichnung; Haltbarkeit für Außenanwendung gefordert."
  },
  "Isolierstegverpressen": {
    "summary": "Beim Isolierstegverpressen werden insbesondere Aluminiumprofilhälften mit thermisch trennenden Kunststoffstegen mechanisch zu einem Verbundprofil verbunden.",
    "purpose": [
      "Fenster-, Türen- und Fassadenprofile",
      "thermische Trennung",
      "Herstellung mehrteiliger Aluminium-Verbundprofile"
    ],
    "options": [
      "Das aktuelle Formular enthält keine zusätzliche technische Auswahl. Die konkrete Ausführung ergibt sich aus Profilsystem, Stegtyp und Zeichnung."
    ],
    "important": [
      "Profilsystem/Hersteller",
      "Stegtyp und Abmessungen",
      "Profilzustand",
      "Toleranzen",
      "Stückzahl",
      "Beschichtungszustand",
      "Prozessreihenfolge vor/nach Oberflächenbehandlung"
    ],
    "standards": [
      "ISO 9001/14001 und RoHS/REACH können relevant sein. <strong>RAL-GZ 607/3</strong> betrifft Güteanforderungen an thermisch getrennte Aluminiumprofile/Verbundsysteme."
    ],
    "practice": "Beschichten und Verpressen beeinflussen sich gegenseitig. Je nach Profilsystem muss feststehen, ob die Profile vor oder nach dem Verpressen oberflächenbehandelt werden.",
    "example": "Aluminium-Fassadenprofile nach Systemzeichnung verpressen; Stege beigestellt; Profile bereits pulverbeschichtet; Maß- und Schubverbundanforderungen nach Systemvorgabe."
  },
  "Einlagern": {
    "summary": "Einlagern ist eine ergänzende Leistung innerhalb der Auftragsabwicklung und kein Oberflächenverfahren.",
    "purpose": [
      "Zwischenlagerung zwischen Prozessschritten",
      "Fertigwarenlagerung",
      "Abruflager für beschichtete Bauteile"
    ],
    "options": [
      "<strong>Trocken lagern:</strong> Bauteile vor direkter Feuchtigkeit und Nässe geschützt lagern."
    ],
    "important": [
      "Lagerdauer",
      "Verpackung",
      "Korrosionsschutz",
      "zulässige Luftfeuchtigkeit/Temperatur falls kritisch",
      "Abrufmengen",
      "Schutz empfindlicher Sichtflächen"
    ],
    "standards": [
      "Für die reine Lagerleistung sind im aktuellen Formular keine zusätzlichen technischen Normen vorgesehen."
    ],
    "practice": "Einlagern ist bewusst kein Endpunkt der Verfahrenskette. Nach der Lagerung können weitere Beschichtungs-, Montage- oder Bearbeitungsschritte folgen.",
    "example": "Pulverbeschichtete Profile 8 Wochen trocken und verpackt zwischenlagern; Sichtflächen gegen Scheuern schützen; Abruf in Teilmengen."
  }
};

  const beschichtungstechnikText = "Die <strong>Beschichtungstechnik bzw. Oberflächentechnik</strong> verändert gezielt die Oberfläche eines Bauteils, ohne dass dafür zwangsläufig der gesamte Grundwerkstoff verändert werden muss. Je nach Verfahren stehen <strong>Korrosionsschutz, Verschleißschutz, Optik, elektrische Eigenschaften, Reibung, Reinigbarkeit oder die Vorbereitung eines Folgeprozesses</strong> im Vordergrund.<br><br>\n<h4>Warum die genaue Spezifikation wichtig ist</h4>\nEin Verfahren allein beschreibt das gewünschte Ergebnis noch nicht vollständig. Werkstoff, Ausgangszustand, Geometrie, Schichtdicke, Optik, Toleranzen, Einsatzumgebung und Prüfanforderungen können das Ergebnis wesentlich beeinflussen.<br><br>\n<strong>Beschichter Scout</strong> soll deshalb nicht nur ein Verfahren auswählen lassen, sondern verständlich machen, welche technischen Angaben für ein belastbares Angebot wirklich wichtig sind.";
  const technischeAngabenText = "<strong>Viele Begriffe im Anfrageformular sind für mehrere Verfahren gleich wichtig.</strong> Diese Grundlagen werden hier einmal zentral erklärt. Bei den einzelnen Verfahren wird anschließend nur noch auf die verfahrensspezifischen Besonderheiten eingegangen.<br><br>\n\n<h4>Farbpalette / Farbsystem</h4>\nEine Farbpalette bezeichnet das System, aus dem ein Farbton gewählt wird – noch nicht den konkreten Farbton. <strong>RAL</strong> steht im Formular für die klassischen RAL-Farbtöne wie RAL 7016 oder RAL 9005. <strong>RAL Design</strong> ist ein umfangreicheres systematisch aufgebautes Farbsystem, <strong>RAL Effect</strong> enthält Uni- und Metallicfarbtöne. Weitere mögliche Systeme sind <strong>NCS, MCS, DB, BS, Munsell, Pantone, Sikkens und HKS</strong>.<br><br>\n<strong>Sonderfarbe / nach Vorlage</strong> wird verwendet, wenn ein physisches Muster, ein vorhandenes Bauteil, ein Herstellerfarbton oder eine Kundenspezifikation maßgeblich ist. <strong>Andere</strong> ist für weitere Farbsysteme vorgesehen.<br><br>\n<strong>Klarlack</strong> bleibt im Formular bewusst als praktische Auswahl unter Farbpalette enthalten. Fachlich ist Klarlack keine Farbpalette, sondern eine transparente Beschichtung. Für die Anfrage ist die Auswahl trotzdem nützlich, wenn keine deckende Farbe gewünscht ist.<br><br>\n\n<h4>Farbtonbezeichnung oder Artikelnummer</h4>\nDie Farbpalette benennt das System, die Farbtonbezeichnung den konkreten Farbton. Beispiel: <strong>RAL → RAL 7016</strong>. Eine Hersteller- oder Artikelnummer kann noch eindeutiger sein, weil zwei Beschichtungsstoffe mit gleichem Farbton unterschiedliche Bindemittel, Glanzgrade, Strukturen oder Beständigkeiten besitzen können.<br><br>\n\n<h4>Glanzgrad</h4>\nDer Glanzgrad beschreibt die Lichtreflexion einer Oberfläche. Im Formular werden <strong>Hochglänzend, Glänzend, Seidenglänzend, Seidenmatt, Matt und Stumpfmatt</strong> unterschieden. Für technisch enge Anforderungen kann zusätzlich ein konkreter Glanzwert in <strong>Gloss Units (GU)</strong> mit Messwinkel angegeben werden, z. B. nach ISO 2813. Die Begriffe matt oder seidenglänzend haben nicht bei jedem Hersteller exakt dieselben GU-Grenzen.<br><br>\n\n<h4>Oberfläche / Struktur</h4>\n<strong>Glatt, Feinstruktur, Grobstruktur und Hammerschlag</strong> beschreiben die Oberflächenstruktur und sind vom Glanzgrad getrennt zu betrachten. Eine matte Beschichtung kann glatt oder strukturiert sein. Struktur beeinflusst Optik, Haptik, Reinigbarkeit und die Sichtbarkeit kleiner Untergrundfehler.<br><br>\n\n<h4>Lack- und Schichtaufbau</h4>\n<strong>Einschichtlackierung</strong> bedeutet, dass die geforderte Funktion grundsätzlich mit einem Beschichtungssystem ohne separate Grund-/Deckschichtkombination erreicht werden soll. <strong>Grundierung + Decklack</strong> teilt Funktionen wie Haftfestigkeit/Korrosionsschutz und Optik auf. Ein <strong>Mehrschichtaufbau</strong> kann zusätzlich Zwischenbeschichtungen enthalten. Die Anzahl der Spritzgänge ist nicht automatisch identisch mit der Anzahl funktioneller Schichten.<br><br>\n\n<h4>Schichtdicke</h4>\nSchichtdicken werden häufig in <strong>µm</strong> angegeben. 1 µm entspricht 0,001 mm. Bei einem Mehrschichtsystem können Einzelschichtdicken und Gesamtschichtdicke getrennt gefordert sein. Mehr Schichtdicke ist nicht automatisch besser: zu hohe Schichten können ebenso Probleme verursachen wie zu geringe. Bei Passungen, Gewinden und Bohrungen verändert die Beschichtung außerdem das Maß.<br><br>\n\n<h4>Schichtgewicht</h4>\nBei Konversionsschichten wie Phosphatierungen wird häufig ein <strong>Schichtgewicht in g/m²</strong> angegeben. Schichtgewicht und Schichtdicke sind nicht dasselbe und dürfen nicht ohne Kenntnis von Material und Dichte ineinander umgerechnet werden.<br><br>\n\n<h4>Rauheit – Ra und Rz</h4>\nRauheit beschreibt mikroskopische Unebenheiten. <strong>Ra</strong> und <strong>Rz</strong> sind unterschiedliche Profilkennwerte und dürfen nicht gleichgesetzt werden. Auch eine Schleifkörnung definiert keinen festen Ra-Wert. Wenn eine Funktion von der Rauheit abhängt, sollte der Messwert mit Messbedingungen vorgegeben werden.<br><br>\n\n<h4>Materialabtrag</h4>\nSchleifen, Polieren, Beizen, Elektropolieren, Trowalisieren und Entschichten können Material entfernen. Bei Passflächen, dünnen Wandungen, Gravuren oder engen Toleranzen muss deshalb der zulässige Abtrag angegeben werden. Wichtig ist auch, ob ein Maß <strong>vor oder nach der Oberflächenbehandlung</strong> gilt.<br><br>\n\n<h4>Maskieren / beschichtungsfreie Bereiche</h4>\nTypische Bereiche, die beschichtungsfrei bleiben können, sind <strong>Gewinde, Passungen, Dichtflächen, Lagerstellen, elektrische Kontaktflächen, Massepunkte, Klebeflächen oder Schweißbereiche</strong>. Kritische Bereiche sollten möglichst in einer Zeichnung gekennzeichnet werden.<br><br>\n\n<h4>Sichtflächen und Funktionsflächen</h4>\nEine <strong>Sichtfläche</strong> ist optisch relevant. Eine <strong>Funktionsfläche</strong> kann Anforderungen an Maß, Rauheit, Dichtheit, Reibung oder elektrische Eigenschaften besitzen. Eine Fläche kann beides gleichzeitig sein.<br><br>\n\n<h4>Werkstoff und Werkstoffgüte</h4>\n„Stahl“, „Edelstahl“ oder „Aluminium“ ist häufig zu ungenau. Beispiele sind <strong>S235JR, S355J2, C45, 42CrMo4, 1.4301, 1.4404, EN AW-6060 oder EN AW-6082</strong>. Die genaue Werkstoffgüte kann Beschichtbarkeit, Farbwirkung, Korrosionsverhalten, Wärmebehandlung und Entschichtbarkeit beeinflussen.<br><br>\n\n<h4>Ausgangszustand</h4>\nRelevant können sein: blank, rostig, verzundert, ölig, geschweißt, mit Anlauffarben, bereits lackiert, verzinkt, eloxiert, gestrahlt, geschliffen, gebürstet oder poliert. Fotos helfen bei der Einschätzung, ersetzen aber keine Werkstoff- oder Zeichnungsangaben.<br><br>\n\n<h4>Vorbehandlung</h4>\nMögliche Schritte sind Reinigen/Entfetten, Beizen, Strahlen, Schleifen, Aktivieren, Phosphatieren, Passivieren, Spülen und Trocknen. Die Vorbehandlung beeinflusst häufig maßgeblich <strong>Haftfestigkeit und Korrosionsschutz</strong>.<br><br>\n\n<h4>Nachbehandlung</h4>\nMögliche Nachbehandlungen sind Versiegeln, Ölen, Polieren, Passivieren, Anlaufschutz, Konservieren, Neutralisieren, Aktivieren/Dekapieren, Gleitmittelbeschichtung oder Vorbereitung für eine Neubeschichtung.<br><br>\n\n<h4>Korrosionsschutz und Einsatzumgebung</h4>\n„Guter Korrosionsschutz“ ist zu ungenau. Sinnvoller sind Angaben zu Innen-/Außenbereich, Feuchtigkeit, Industrieatmosphäre, Küste/Chloriden, Streusalz, Chemikalien oder dauerndem Wasserkontakt. Korrosivitätskategorien nach ISO 12944 beschreiben die Umgebungsbelastung und nicht automatisch einen bestimmten Schichtaufbau.<br><br>\n\n<h4>Temperatur-, Chemikalien-, UV- und Wetterbeständigkeit</h4>\nBei Temperatur sollte zwischen Dauer- und Spitzentemperatur unterschieden werden. Bei Chemikalien sind Medium, Konzentration, Temperatur und Kontaktdauer relevant. Für Außenoberflächen können UV-Beständigkeit, Farbtonstabilität und Glanzerhalt entscheidend sein.<br><br>\n\n<h4>Elektrische Eigenschaften</h4>\nEine Oberfläche kann leitfähig, niederohmig, isolierend oder elektrostatisch ableitfähig gefordert sein. Metallische Beschichtungen wie Silber, Gold, Kupfer, Nickel oder Zinn können elektrische Funktionen übernehmen; Lack- und Pulverbeschichtungen wirken normalerweise isolierend, sofern kein spezielles System eingesetzt wird.<br><br>\n\n<h4>Härte, Verschleiß, Reibung und Gleitverhalten</h4>\nHärte ist nicht dasselbe wie Verschleißfestigkeit. Bei Funktionsflächen können zusätzlich Reibwert, Schmierung, Trockenlauf oder Einlaufverhalten relevant sein. Deshalb sollte möglichst die tatsächliche Belastung beschrieben werden.<br><br>\n\n<h4>Farbeffekte und Referenzmuster</h4>\nMetallic-, Perlmutteffekt-, Candy-, Neon- oder patinierte Oberflächen reagieren besonders sensibel auf Untergrund, Schichtdicke, Applikation und Charge. Bei sichtbaren Serienbauteilen empfiehlt sich ein physisches Freigabemuster. Fotos und Monitore sind keine verbindliche Farbreferenz.<br><br>\n\n<h4>Farbabweichung / ΔE</h4>\nΔE beschreibt einen messbaren Farbabstand, ist aber nur mit definiertem Farbraum, Messgeometrie und Toleranz sinnvoll. Bei Metallic- oder Effektoberflächen kann zusätzlich eine Mehrwinkelmessung bzw. visuelle Musterfreigabe notwendig sein.<br><br>\n\n<h4>Trocknung / Aushärtung / Einbrenntemperatur</h4>\nTrocknen und vollständiges Aushärten sind nicht dasselbe. Bei Pulverlack ist insbesondere die <strong>Objekttemperatur</strong> wichtig: Die erforderliche Haltezeit beginnt erst, wenn das Bauteil selbst die geforderte Temperatur erreicht hat. Bei 2K-Nasslacken sind Mischungsverhältnis und Topfzeit relevant.<br><br>\n\n<h4>Prüfungen</h4>\nJe nach Auftrag können Schichtdicke, Haftfestigkeit, Gitterschnitt, Abreißfestigkeit, Glanz, Farbe, Rauheit, Härte, Korrosion, Porosität, Maßhaltigkeit oder elektrische Eigenschaften geprüft werden. Prüfungen und Dokumentationsumfang sollten vor Auftragserteilung festgelegt werden.<br><br>\n\n<h4>Normen, Anforderungen und Zertifizierungen</h4>\nEine technische Norm beschreibt nicht dasselbe wie eine Unternehmenszertifizierung. <strong>ISO 9001</strong> beschreibt ein Qualitätsmanagementsystem, <strong>ISO 14001</strong> ein Umweltmanagementsystem. Verfahrenstechnische Normen, Gütezeichen und Kundenspezifikationen können dagegen konkrete Anforderungen an Schicht, Prüfung oder Prozess stellen. Deshalb nur Anforderungen auswählen, die für den Auftrag tatsächlich notwendig sind.<br><br>\n\n<h4>Wenn ein Wert unbekannt ist</h4>\nKeine technische Zahl raten. Stattdessen Funktion und Einsatz beschreiben, z. B. „Bauteil steht ganzjährig außen und ist Streusalz ausgesetzt“, „Sichtteil aus Edelstahl, gleichmäßig matt“ oder „Bohrung ist eine Passung und muss nach Beschichtung im Toleranzfeld liegen“. Ein Fachbetrieb kann daraus häufig besser das geeignete Verfahren ableiten.";
  const lackeBeschichtungsstoffeText = "<strong>Lacke und Beschichtungsstoffe</strong> unterscheiden sich nicht nur nach Farbe, sondern auch nach Bindemittel, Pigmentierung, Glanz, Struktur, Aushärtung und technischen Eigenschaften.<br><br>\n<h4>Nasslacke</h4>\nTypische Systeme sind 1K- und 2K-Lacke, wasserbasierte und lösemittelbasierte Systeme, Grundierungen, Zwischen- und Decklacke, Klarlacke sowie Spezialbeschichtungen. Bei 2K-Lacken sind Mischungsverhältnis und Topfzeit wichtig.<br><br>\n<h4>Pulverlacke</h4>\nTypische Bindemittelsysteme sind Polyester, Epoxid, Epoxy-Polyester, Polyurethan und Thermoplaste. Für Außenanwendungen können hochwetterfeste bzw. Fassadenqualitäten erforderlich sein.<br><br>\n<h4>Für eine eindeutige Materialvorgabe</h4>\nHersteller, Produktname, Artikelnummer, Charge, Farbton, Glanzgrad, Struktur und gegebenenfalls technisches Datenblatt angeben. Bei beigestelltem Material zusätzlich Menge und Haltbarkeit nennen.";
  const lackrecyclingRestlackText = "<strong>Restlacke und Beschichtungsstoffe können je nach Zustand weiterverwendet, vermittelt, aufbereitet oder fachgerecht verwertet werden.</strong><br><br>\n<h4>Für eine Weiterverwendung wichtig</h4>\nHersteller, Produkt, Artikelnummer, Farbton, Glanzgrad, Gebindegröße, Restmenge, Charge, Herstell-/Ablaufdatum, Lagerzustand und vorhandene Sicherheits-/Technikdaten sollten möglichst bekannt sein.<br><br>\nPulverlacke müssen trocken, sauber und frei von Fremdmaterial gelagert sein. Bei Nasslacken sind unter anderem Hautbildung, Sedimentation, Mischbarkeit und Haltbarkeit zu prüfen. Ob ein Restmaterial noch technisch einsetzbar ist, entscheidet letztlich die konkrete Produkt- und Qualitätsprüfung.";

  const htmlList = (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

  const buildProcedureText = (name: string, info: ProcedureInfo) => `
    <strong>${info.summary}</strong><br><br>
    <h4>Wofür wird ${name} eingesetzt?</h4>
    ${htmlList(info.purpose)}
    <h4>Auswahlmöglichkeiten im Formular</h4>
    ${htmlList(info.options)}
    <h4>Wichtige Angaben für eine Anfrage</h4>
    ${htmlList(info.important)}
    <h4>Normen / Anforderungen</h4>
    ${htmlList(info.standards)}
    <h4>Praxis-Hinweis</h4>
    ${info.practice}<br><br>
    <h4>Beispiel einer guten Anfrage</h4>
    <em>${info.example}</em>
  `;

  const procedureIndex: Record<string, number> = Object.fromEntries(
    procedureOrder.map((name, index) => [name, index + 2])
  );

  const groupDefinitions: Record<string, readonly string[]> = {
  "Lackieren": [
    "Nasslackieren",
    "Pulverbeschichten",
    "KTL-Beschichten"
  ],
  "Metallische & chemische Oberflächen": [
    "Verzinken",
    "Vernickeln",
    "Verchromen",
    "Verkupfern",
    "Verzinnen",
    "Vermessingen",
    "Bronzebeschichten",
    "Vergolden",
    "Versilbern",
    "Aluminieren",
    "Eloxieren",
    "Anodisieren",
    "Aluminium-Passivieren",
    "Edelstahl-Passivieren",
    "Zinkphosphatieren",
    "Eisenphosphatieren",
    "Mn-Phosphatieren",
    "Brünieren",
    "Elektropolieren"
  ],
  "Mechanische Bearbeitung & Vorbehandlung": [
    "Beizen",
    "Strahlen",
    "Schleifen",
    "Polieren",
    "Bürsten",
    "Trowalisieren",
    "Entgraten",
    "Verrunden",
    "Glätten",
    "Mattieren",
    "Chemisches Glänzen"
  ],
  "Entschichten": [
    "Entlacken",
    "Entzinken",
    "Entnickeln",
    "Entchromen",
    "Entkupfern",
    "Entmessingen",
    "Entbronzieren",
    "Entgolden",
    "Entsilbern",
    "Entzinnen",
    "Entaluminieren",
    "Enteloxieren",
    "Entanodisieren"
  ],
  "Weitere Leistungen": [
    "Folieren",
    "Isolierstegverpressen",
    "Einlagern"
  ]
};

  const verfahrensGruppen = [
    ...Object.entries(groupDefinitions).map(([title, names]) => ({
      title,
      items: names.map((name) => ({
        name,
        description: procedureInfo[name].summary,
        target: `container-${procedureIndex[name]}`,
      })),
    })),
    {
      title: "Lacke, Restlacke & Recycling",
      items: [
        {
          name: "Lacke & Beschichtungsstoffe",
          description: "Grundlagen zu Nass- und Pulverlacken, Werkstoffsystemen, Produktangaben und technischer Auswahl.",
          target: `container-${procedureOrder.length + 2}`,
        },
        {
          name: "Lackrecycling & Restlackverwertung",
          description: "Wichtige Angaben für Weiterverwendung, Vermittlung und fachgerechte Verwertung von Restmaterialien.",
          target: `container-${procedureOrder.length + 3}`,
        },
      ],
    },
  ];

  const scrollToVerfahren = (target: string) => {
    const match = target.match(/container-(\d+)/);
    if (match) {
      const index = Number(match[1]);
      setOpenContainers({ [index]: true });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(target)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const normalizeSearchText = (value: string) =>
    value
      .toLocaleLowerCase("de-DE")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[^a-z0-9äöüßµ]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const searchEntries = [
    {
      title: "Technische Angaben verstehen",
      description: "Farbpalette, Farbton, Glanzgrad, Schichtdicke, Rauheit, Werkstoff, Maskieren, Prüfungen und weitere Grundlagen.",
      target: "container-1",
      searchText: technischeAngabenText,
    },
    ...procedureOrder.map((name) => ({
      title: name,
      description: procedureInfo[name].summary,
      target: `container-${procedureIndex[name]}`,
      searchText: [
        name,
        procedureInfo[name].summary,
        ...procedureInfo[name].purpose,
        ...procedureInfo[name].options,
        ...procedureInfo[name].important,
        ...procedureInfo[name].standards,
        procedureInfo[name].practice,
        procedureInfo[name].example,
      ].join(" "),
    })),
    {
      title: "Lacke & Beschichtungsstoffe",
      description: "Grundlagen zu Nasslacken, Pulverlacken, Produktangaben und Materialsystemen.",
      target: `container-${procedureOrder.length + 2}`,
      searchText: lackeBeschichtungsstoffeText,
    },
    {
      title: "Lackrecycling & Restlackverwertung",
      description: "Weiterverwendung, Vermittlung und Verwertung von Restlacken und Beschichtungsstoffen.",
      target: `container-${procedureOrder.length + 3}`,
      searchText: lackrecyclingRestlackText,
    },
  ];

  const normalizedKnowledgeSearch = normalizeSearchText(knowledgeSearch);
  const knowledgeSearchTerms = normalizedKnowledgeSearch.split(" ").filter(Boolean);
  const knowledgeSearchResults = knowledgeSearchTerms.length
    ? searchEntries
        .map((entry) => {
          const haystack = normalizeSearchText(`${entry.title} ${entry.description} ${entry.searchText}`);
          const title = normalizeSearchText(entry.title);
          const matchesAll = knowledgeSearchTerms.every((term) => haystack.includes(term));
          const score = matchesAll
            ? knowledgeSearchTerms.reduce(
                (sum, term) => sum + (title.includes(term) ? 4 : haystack.includes(term) ? 1 : 0),
                0
              )
            : 0;
          return { ...entry, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "de"))
        .slice(0, 12)
    : [];

  const containerHeadings = [
    "Beschichtungstechnik",
    "Technische Angaben verstehen",
    ...procedureOrder,
    "Lacke & Beschichtungsstoffe",
    "Lackrecycling & Restlackverwertung",
  ];

  const baseContainerTexts = [
    beschichtungstechnikText,
    technischeAngabenText,
    ...procedureOrder.map((name) => buildProcedureText(name, procedureInfo[name])),
    lackeBeschichtungsstoffeText,
    lackrecyclingRestlackText,
  ];


  const relatedByName: Record<string, string[]> = {
  "Nasslackieren": [
    "Pulverbeschichten",
    "KTL-Beschichten",
    "Strahlen"
  ],
  "Pulverbeschichten": [
    "Nasslackieren",
    "Verzinken",
    "Zinkphosphatieren"
  ],
  "KTL-Beschichten": [
    "Zinkphosphatieren",
    "Nasslackieren",
    "Pulverbeschichten"
  ],
  "Verzinken": [
    "Entzinken",
    "Pulverbeschichten",
    "Strahlen"
  ],
  "Vernickeln": [
    "Entnickeln",
    "Verchromen",
    "Vergolden"
  ],
  "Verchromen": [
    "Vernickeln",
    "Entchromen",
    "Polieren"
  ],
  "Verkupfern": [
    "Entkupfern",
    "Vernickeln",
    "Vergolden"
  ],
  "Verzinnen": [
    "Entzinnen",
    "Verkupfern",
    "Versilbern"
  ],
  "Vermessingen": [
    "Verkupfern",
    "Polieren",
    "Entmessingen"
  ],
  "Bronzebeschichten": [
    "Entbronzieren",
    "Verkupfern",
    "Polieren"
  ],
  "Vergolden": [
    "Entgolden",
    "Vernickeln",
    "Verkupfern"
  ],
  "Versilbern": [
    "Entsilbern",
    "Verkupfern",
    "Vergolden"
  ],
  "Aluminieren": [
    "Entaluminieren",
    "Strahlen",
    "Verzinken"
  ],
  "Eloxieren": [
    "Enteloxieren",
    "Aluminium-Passivieren",
    "Chemisches Glänzen"
  ],
  "Anodisieren": [
    "Entanodisieren",
    "Eloxieren",
    "Elektropolieren"
  ],
  "Aluminium-Passivieren": [
    "Eloxieren",
    "Pulverbeschichten",
    "Nasslackieren"
  ],
  "Edelstahl-Passivieren": [
    "Beizen",
    "Elektropolieren",
    "Bürsten"
  ],
  "Zinkphosphatieren": [
    "Eisenphosphatieren",
    "KTL-Beschichten",
    "Pulverbeschichten"
  ],
  "Eisenphosphatieren": [
    "Zinkphosphatieren",
    "Pulverbeschichten",
    "Nasslackieren"
  ],
  "Mn-Phosphatieren": [
    "Trowalisieren",
    "Schleifen",
    "Brünieren"
  ],
  "Brünieren": [
    "Mn-Phosphatieren",
    "Schleifen",
    "Polieren"
  ],
  "Beizen": [
    "Edelstahl-Passivieren",
    "Eloxieren",
    "Verzinken"
  ],
  "Elektropolieren": [
    "Edelstahl-Passivieren",
    "Polieren",
    "Beizen"
  ],
  "Strahlen": [
    "Schleifen",
    "Entlacken",
    "Pulverbeschichten"
  ],
  "Schleifen": [
    "Polieren",
    "Bürsten",
    "Mattieren"
  ],
  "Polieren": [
    "Schleifen",
    "Chemisches Glänzen",
    "Elektropolieren"
  ],
  "Bürsten": [
    "Schleifen",
    "Mattieren",
    "Entgraten"
  ],
  "Trowalisieren": [
    "Entgraten",
    "Verrunden",
    "Glätten"
  ],
  "Entgraten": [
    "Verrunden",
    "Trowalisieren",
    "Bürsten"
  ],
  "Verrunden": [
    "Entgraten",
    "Trowalisieren",
    "Schleifen"
  ],
  "Glätten": [
    "Schleifen",
    "Polieren",
    "Trowalisieren"
  ],
  "Mattieren": [
    "Strahlen",
    "Bürsten",
    "Schleifen"
  ],
  "Chemisches Glänzen": [
    "Polieren",
    "Eloxieren",
    "Elektropolieren"
  ],
  "Entlacken": [
    "Strahlen",
    "Pulverbeschichten",
    "Nasslackieren"
  ],
  "Entzinken": [
    "Verzinken",
    "Strahlen",
    "Beizen"
  ],
  "Entnickeln": [
    "Vernickeln",
    "Verchromen",
    "Beizen"
  ],
  "Entchromen": [
    "Verchromen",
    "Entnickeln",
    "Polieren"
  ],
  "Entkupfern": [
    "Verkupfern",
    "Vernickeln",
    "Beizen"
  ],
  "Entmessingen": [
    "Vermessingen",
    "Verkupfern",
    "Polieren"
  ],
  "Entbronzieren": [
    "Bronzebeschichten",
    "Verkupfern",
    "Polieren"
  ],
  "Entgolden": [
    "Vergolden",
    "Vernickeln",
    "Verkupfern"
  ],
  "Entsilbern": [
    "Versilbern",
    "Verkupfern",
    "Vergolden"
  ],
  "Entzinnen": [
    "Verzinnen",
    "Verkupfern",
    "Vernickeln"
  ],
  "Entaluminieren": [
    "Aluminieren",
    "Strahlen",
    "Beizen"
  ],
  "Enteloxieren": [
    "Eloxieren",
    "Anodisieren",
    "Aluminium-Passivieren"
  ],
  "Entanodisieren": [
    "Anodisieren",
    "Eloxieren",
    "Beizen"
  ],
  "Folieren": [
    "Pulverbeschichten",
    "Nasslackieren",
    "Einlagern"
  ],
  "Isolierstegverpressen": [
    "Pulverbeschichten",
    "Eloxieren",
    "Einlagern"
  ],
  "Einlagern": [
    "Pulverbeschichten",
    "Folieren",
    "Isolierstegverpressen"
  ]
};

  const procedureHash = (name: string) =>
    name === "Chemisches Glänzen" ? "#Chemisches-Glänzen" : `#${name}`;

  const relatedVerfahren: Record<number, { name: string; hash: string }[]> =
    Object.fromEntries(
      procedureOrder.map((name, i) => [
        i + 2,
        (relatedByName[name] ?? []).map((relatedName) => ({
          name: relatedName,
          hash: procedureHash(relatedName),
        })),
      ])
    );

  const genericInquiryBlock = `
    <br><br><h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Werkstoff, Materialgüte und Ausgangszustand</li>
      <li>Bauteilabmessungen, Gewicht und Stückzahl</li>
      <li>gewünschtes Ergebnis und relevante Funktions- oder Sichtflächen</li>
      <li>erforderliche Normen, Prüfungen oder Dokumentationen</li>
      <li>geplante Folgebehandlung sowie Termin- und Logistikanforderungen</li>
    </ul>
  `;

  const containerTexts = baseContainerTexts.map((text, index) => {
    if (index < 2) return text;

    const isKnowledgeTopic = index >= procedureOrder.length + 2;
    const inquiry = isKnowledgeTopic || text.includes("Wichtige Angaben für eine Anfrage") ? "" : genericInquiryBlock;
    const links = relatedVerfahren[index] ?? [];
    const related = links.length
      ? `<br><br><h4>Verwandte Verfahren</h4><ul>${links
          .map((item) => `<li><a href="${item.hash}">${item.name}</a></li>`)
          .join("")}</ul>`
      : "";

    return `${text}${inquiry}${related}`;
  });

  return (
    <>
      <Navbar />
      <ScrollProgress />

      <main className={styles.pageShell}>
        <section className={styles.guideHero}>
          <div className={styles.guideHeroInner}>
            <p className={styles.sectionKicker}>Wissenswertes</p>
            <h1>Beschichtungstechnik verständlich erklärt</h1>
            <p className={styles.heroLead}>
              Ein praxisnaher Fachguide zu Beschichtungsverfahren, Vorbereitung,
              Qualitätsanforderungen und typischen Einsatzbereichen.
            </p>
            <div className={styles.heroMeta}>
              <span>Für Auftraggeber</span>
              <span>Beschichter</span>
              <span>Einkäufer</span>
              <span>Lieferanten</span>
            </div>
          </div>
        </section>

        <section className={styles.orientationSection} aria-label="Orientierung">
          <div className={styles.orientationText}>
            <p className={styles.sectionKicker}>Orientierung</p>
            <h2>Von der Anforderung zum passenden Beschichtungsverfahren</h2>
            <p>
              Diese Seite hilft dabei, technische Angaben besser einzuordnen,
              typische Arbeitsschritte zu verstehen und Beschichtungsaufträge
              sauber vorzubereiten. Der Fokus liegt auf Praxisnähe: Welche
              Informationen werden benötigt, welche Verfahren kommen infrage
              und welche Anforderungen sollten vorab geklärt werden?
            </p>
          </div>

          <aside className={styles.quickNav} aria-label="Direkt zu">
            <p>Direkt zu</p>
            <a href="#standardablauf">Standardablauf & Vorbereitung</a>
            <a href="#verfahren">Verfahren & Grundlagen</a>
            <a href="#container-2">Nasslackieren</a>
            <a href="#container-3">Pulverbeschichten</a>
            <a href="#container-5">Verzinken & Entzinken</a>
            <a href="#container-9">KTL-Beschichten</a>
            <a href="#container-10">Verchromen</a>
            <a href="#container-11">Brünieren</a>
          </aside>
        </section>

        <section className={styles.platformSection} id="Sofunktioniert’s">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>Plattform</p>
            <h2>Warum Beschichter Scout?</h2>
            <p>
              Beschichter Scout verbindet Auftraggeber & -nehmer, Fachwissen sowie Einkäufer mit Lieferanten in einem spezialisierten Umfeld für die
              Beschichtungstechnik.
            </p>
          </div>
          <div className={styles.audienceOverview}>
  <div className={styles.audienceGroup}>
    <h3>Auftraggeber</h3>
    <ul>
      <li>Aufträge einmal strukturiert erfassen</li>
      <li>Viele passende Beschichter gleichzeitig für die Angebotsabgabe erreichen</li>
      <li>Rückfragen, Verzögerungen und mögliche Mehrkosten reduzieren</li>
      <li>Angebote besser vergleichen und gezielter vergeben</li>
      <li>Passende Beschichter schneller finden</li>
    </ul>
  </div>

  <div className={styles.audienceGroup}>
    <h3>Beschichter</h3>
    <ul>
      <li>Neue Aufträge ohne klassische Akquise gewinnen</li>
      <li>Auftragsschwankungen besser ausgleichen</li>
      <li>Freie Kapazitäten effizienter nutzen</li>
      <li>Restmengen, Sonderfarben und überschüssige Materialien verkaufen</li>
      <li>Zahlungssicherheit durch bezahlte Aufträge erhöhen</li>
      <li>Strukturiertere Anfragen mit weniger Klärungsaufwand erhalten</li>
    </ul>
  </div>

  <div className={styles.audienceGroup}>
    <h3>Lieferanten</h3>
    <ul>
      <li>Produkte in einem fachlich passenden Umfeld präsentieren</li>
      <li>Potenzielle Kunden mit konkretem Bedarf erreichen</li>
      <li>Zubehör, Materialien und Lösungen sichtbarer machen</li>
    </ul>
  </div>
</div>

        </section>

        <section className={styles.processSection} id="standardablauf">
          <div className={styles.sectionHeaderLeft}>
            <p className={styles.sectionKicker}>Ablauf & Vorbereitung</p> <h2>Angaben für eine saubere Auftragsabwicklung</h2> <p> Vollständige und klare Angaben helfen dem Beschichter, Aufwand, Machbarkeit, Termine und Ergebnis realistisch einzuschätzen. So lassen sich Rückfragen, Verzögerungen, Nachträge und mögliche Mehrkosten deutlich reduzieren. </p>
          </div>

          <div className={styles.processTimeline}>
            <div className={styles.processStep}> <span>01</span> 
            <h3>Anforderungen und Auftragsdaten vollständig angeben</h3> 
            <p>Verfahren, Ziel, Einsatzbereich, gewünschtes Ergebnis, Material, Maße, Gewicht, Stückzahl, Zustand, Fotos, Sichtflächen, Normen, Zertifikate, 
              Prüfanforderungen sowie Abholung, Lieferung, Verpackung, Ladezeiten und Hebehilfen klar übermitteln.</p> </div> 
              <div className={styles.processStep}> <span>02</span> <h3>Angebote vergleichen und Beschichter beauftragen</h3> 
              <p>Preis, Leistungsumfang, Bearbeitungszeit, Vorbehandlung, Beschichtungssystem, Logistik, mögliche Zusatzkosten und enthaltene Prüf- oder 
                Dokumentationsleistungen prüfen, bevor der Auftrag vergeben wird.</p> </div> <div className={styles.processStep}> <span>03</span> 
                <h3>Beschichtungsergebnis prüfen und Auftrag abschließen</h3> <p>Oberfläche, Farbton, Sichtflächen, Schichtqualität, vereinbarte 
                  Anforderungen, Dokumente und eventuelle Abweichungen kontrollieren, Rückfragen klären und den Auftrag sauber abschließen.</p> </div>
              
          </div>

          <motion.div
            className={styles.standardCompactBox}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
          >
            <h3>Im Detail - Was vor der Auftragsvergabe wichtig ist</h3>

            <p className={styles.standardCompactIntro}> Je vollständiger diese Angaben vor der Auftragsvergabe gemacht werden, desto besser kann der Beschichter Aufwand, Machbarkeit, Termine und Ergebnis einschätzen. Das reduziert Rückfragen, Verzögerungen, Nachträge und mögliche Mehrkosten. </p>

            <div className={styles.preparationInfoBlock}>
              <h4>Reinigen &amp; Entfetten</h4>
              <p>
                Vor vielen Beschichtungs- und Oberflächenverfahren müssen Werkstücke
                gründlich gereinigt und entfettet werden. Öl, Fett, Staub,
                Bearbeitungsrückstände und andere Verunreinigungen können die Haftfestigkeit
                einer nachfolgenden Beschichtung deutlich verschlechtern.
              </p>
              <p>
                Je nach Werkstoff und späterem Verfahren kommen unterschiedliche
                Reinigungs- und Entfettungsverfahren zum Einsatz. Entscheidend ist,
                dass die Oberfläche anschließend sauber, gleichmäßig und für die
                weitere Behandlung geeignet ist. Besonders relevant ist die
                Entfettung beispielsweise vor Pulverbeschichten, Nasslackieren,
                Eloxieren, Passivieren oder galvanischen Verfahren.
              </p>
              <p>
                <strong>Für eine Anfrage wichtig:</strong> Grundwerkstoff,
                Ausgangszustand, Art der Verschmutzung und die geplante
                Folgebehandlung sollten möglichst klar angegeben werden.
              </p>
            </div>

            <ul className={styles.standardCompactList}>
              <li>
                <strong>Standardablauf:</strong> Abholung, Zustellung,
                Verpackung, Be- und Entladung, Bearbeitung und Termine angeben.
              </li>
              <li>
                <strong>Zeiten:</strong> Mo–Do 08:00–12:00 und 13:00–16:00 Uhr,
                Fr 08:00–12:00 Uhr. Abweichungen vorher vereinbaren.
              </li>
              <li>
                <strong>Logistik:</strong> Ladezeiten, Zufahrt, Stapler,
                Hebehilfen, Rampen oder zusätzliches Personal vorab mitteilen.
              </li>
              <li>
                <strong>Teilezustand:</strong> Stückzahlen, Maße, Gewicht,
                Material, Zustand, Fotos, Zeichnungen, Farbton und Besonderheiten
                vollständig angeben. Die gewünschte Erwartung an das
                Beschichtungsergebnis kann ebenfalls beschrieben werden.
              </li>
              <li> <strong>Farbton und Lackhersteller:</strong> Wenn bei Lackierverfahren ein bestehender Farbton möglichst genau 
              getroffen werden soll, sollte angegeben werden, ob Lack vom gleichen Hersteller verwendet werden muss. Wichtig: Auch unterschiedliche Chargen 
              desselben Herstellers können technisch bedingt minimale Farbabweichungen aufweisen. </li>
               <li> <strong>Sichtseiten und Qualitätsflächen:</strong> Sichtseiten,
                Hauptansichtsflächen oder optisch besonders wichtige Bereiche
                sollten eindeutig angegeben werden.
              </li>
              <li>
                <strong>Funktionsflächen, Passungen und Bohrungen:</strong>
                Funktionsrelevante Flächen wie Passungen, Dichtflächen,
                Lagerstellen, Bolzenbohrungen, Führungen, Auflageflächen oder
                Montageflächen sollten klar gekennzeichnet werden.
              </li>
              <li>
                <strong>Gewinde und Abdeckbereiche:</strong> Innen- und
                Außengewinde, Sacklöcher, Durchgangsbohrungen oder empfindliche
                Bereiche sollten vorab angegeben werden.
              </li>
              <li>
                <strong>Normen / Anforderungen:</strong> Auftraggeber:innen können vor der
                Auftragsvergabe benötigte Normen, Zertifizierungen oder
                Qualitätsanforderungen angeben.
              </li>
              <li>
                <strong>Bewegliche Teile:</strong> Bewegliche, mehrteilige oder
                montierte Werkstücke sollten unbedingt vorab beschrieben werden.
              </li>
              <li>
                <strong>Kontaktier- und Aufhängestellen:</strong> Bei galvanischen,
                elektrolytischen oder hängend ausgeführten Beschichtungsverfahren
                müssen Werkstücke kontaktiert bzw. aufgehängt werden.
              </li>
              <li>
                <strong>Reinigung:</strong> Teile dürfen nur oberflächlichen Schmutz
                aufweisen. Späne, starke Öl- oder Fettrückstände, Klebereste,
                Silikon, Anhaftungen oder Rost sind so gering wie möglich zu halten, damit keine manuelle Sonderreinigung notwendig wird.
              </li>
              <li>
                <strong>Thermische Verfahren:</strong> Bei thermischen Verfahren wie
                Pulverbeschichten oder Feuerverzinken ist darauf zu achten, dass
                die Teile der Hitzeeinwirkung standhalten.
              </li>
            </ul>

            <p className={styles.standardCompactNotice}>
              <strong>Fehlende, falsche oder nachträglich geänderte Angaben können zu
              begründeten Verzögerungen oder Mehrkosten führen.</strong>
            </p>
          </motion.div>
        </section>

        <section className={styles.libraryIntro} id="verfahren">
          <p className={styles.sectionKicker}>Verfahren & Grundlagen</p>
          <h2>Fachbibliothek Beschichtungstechnik</h2>
          <p>
            Die folgenden Inhalte geben einen Überblick über wichtige Verfahren,
            typische Anwendungen, relevante Anforderungen und technische
            Besonderheiten.
          </p>

          <div
            role="search"
            aria-label="Wissenswertes durchsuchen"
            style={{ marginTop: "24px", maxWidth: "760px", position: "relative" }}
          >
            <label htmlFor="wissenswertes-search" style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>
              Verfahren oder Fachbegriff suchen
            </label>
            <input
              id="wissenswertes-search"
              type="search"
              value={knowledgeSearch}
              onChange={(event) => setKnowledgeSearch(event.target.value)}
              placeholder="z. B. Zink-Nickel, Glanzgrad, C-33, Ra, Hartchrom …"
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 15px",
                border: "1px solid rgba(127,127,127,0.45)",
                borderRadius: "10px",
                background: "transparent",
                color: "inherit",
                font: "inherit",
              }}
            />

            {normalizedKnowledgeSearch && (
              <div
                aria-live="polite"
                style={{
                  marginTop: "10px",
                  border: "1px solid rgba(127,127,127,0.30)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {knowledgeSearchResults.length > 0 ? (
                  knowledgeSearchResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.title}-${result.target}`}
                      onClick={() => scrollToVerfahren(result.target)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "12px 15px",
                        border: 0,
                        borderBottom: "1px solid rgba(127,127,127,0.20)",
                        background: "transparent",
                        color: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "3px" }}>{result.title}</strong>
                      <span style={{ display: "block", opacity: 0.78, fontSize: "0.92em" }}>{result.description}</span>
                    </button>
                  ))
                ) : (
                  <p style={{ margin: 0, padding: "12px 15px" }}>
                    Kein passender Eintrag gefunden. Versuche einen allgemeineren Begriff.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <div className={styles.verfahrenGroups}>
          {verfahrensGruppen.map((group) => (
            <section key={group.title} className={styles.verfahrenGroup}>
              <h3 className={styles.verfahrenGroupTitle}>{group.title}</h3>

              <div className={styles.verfahrenGrid}>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className={styles.verfahrenCard}
                    onClick={() => scrollToVerfahren(item.target)}
                  >
                    <span className={styles.verfahrenCardTitle}>{item.name}</span>
                    <span className={styles.verfahrenCardText}>{item.description}</span>
                    <span className={styles.verfahrenCardLink}>Mehr erfahren →</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={styles.pageContainer}>
          {containerHeadings.map((_, index) => (
            <div key={index} className={styles.container} id={`container-${index}`}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={styles.header}
                onClick={() => toggleContainer(index)}
                id={`header-${index}`}
              >
                <div className={styles.headerTextContainer}>
                  <p className={styles.headerText}>{containerHeadings[index]}</p>
                  <span className={styles.arrow}>{openContainers[index] ? "▲" : "▼"}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, maxHeight: 0 }}
                animate={{
                  opacity: openContainers[index] ? 1 : 0,
                  maxHeight: openContainers[index] ? "10000px" : 0,
                }}
                transition={{
                  duration: 0.45,
                  type: "spring",
                  stiffness: 110,
                  damping: 26,
                }}
                className={`${styles.content} ${openContainers[index] ? styles.open : ""}`}
                id={`content-${index}`}
              >
                <p dangerouslySetInnerHTML={{ __html: containerTexts[index] }}></p>
              </motion.div>
            </div>
          ))}
        </div>

        <section className={styles.visionWrap} id="vision-mission">
          <div className={styles.sectionHeaderLeft}>
            <p className={styles.sectionKicker}>Unsere Haltung</p>
            <h2>Oberflächentechnik transparenter machen</h2>
            <p>
              Beschichter Scout soll Wissen, Anbieter, Aufträge und Materialien
              zusammenführen und dadurch Entscheidungen in der
              Beschichtungstechnik einfacher machen.
            </p>
          </div>
          <Vision />
        </section>
      </main>
    </>
  );
};

export default Wissenswertes;
