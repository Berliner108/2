"use client";

import { useState, useEffect } from "react";
import styles from "./wissenswertes.module.css";
import Navbar from '../components/navbar/Navbar'
import { motion } from "framer-motion";
import Vision from "./Vision";  // Importiere die Komponente


const Wissenswertes = () => {
  const [openContainers, setOpenContainers] = useState<{ [key: number]: boolean }>({});

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
      "#Nasslackieren": 2,
      "#Pulverbeschichten": 3,
      "#Verzinken": 4,
      "#Eloxieren": 5,
      "#Anodisieren": 6,
      "#KTL-Beschichten": 7,
      "#Zinkphosphatieren": 8,
      "#Strahlen": 9,
      "#Entlacken": 10,
      "#Brünieren": 11,
      "#Verzinnen": 12,
      "#Aluminieren": 13,
      "#Vernickeln": 14,
      "#Aluminium-Passivieren": 15,
      "#Elektropolieren": 16,
      "#Verchromen": 17,
      "#Vermessingen": 18,
      "#Verkupfern": 19,
      "#Vergolden": 20,
      "#Folieren": 21,
      "#Isolierstegverpressen": 22,
      "#Einlagern": 23,
      "#Entzinken": 24,
      "#Enteloxieren": 25,
      "#Entanodisieren": 26,
      "#Entzinnen": 27,
      "#Entaluminieren": 28,
      "#Entnickeln": 29,
      "#Mn-Phosphatieren": 30,
      "#Beizen": 31,
      "#Entgraten": 32,
      "#Verrunden": 33,
      "#Glätten": 34,
      "#Mattieren": 35,
      "#Schleifen": 36,
      "#Polieren": 37,
      "#Bürsten": 38,
      "#Trowalisieren": 39,
      "#Chemisches-Glänzen": 40,
      "#Versilbern": 41,
      "#Lacke-Beschichtungsstoffe": 42,
      "#Lackrecycling-Restlackverwertung": 43,
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

  const verfahrensGruppen = [
    {
      title: "Lackieren",
      items: [
        { name: "Nasslackieren", description: "Flüssiglacke für dekorative, funktionelle und korrosionsschützende Oberflächen.", target: "container-2" },
        { name: "Pulverbeschichten", description: "Pulverlack wird elektrostatisch aufgebracht und anschließend eingebrannt.", target: "container-3" },
        { name: "KTL-Beschichten", description: "Kathodische Tauchlackierung für gleichmäßigen und widerstandsfähigen Korrosionsschutz.", target: "container-7" },
      ],
    },
    {
      title: "Galvanische & chemische Oberflächen",
      items: [
        { name: "Verzinken", description: "Korrosionsschutz durch Feuerverzinken, galvanisches Verzinken, Zinklamellenbeschichtung oder mechanisches Verzinken.", target: "container-4" },
        { name: "Eloxieren", description: "Elektrochemische Oxidschicht auf Aluminium für Schutz, Optik und technische Eigenschaften.", target: "container-5" },
        { name: "Anodisieren", description: "Anodische Oxidation, insbesondere von Aluminium, zur Erzeugung einer definierten Oxidschicht.", target: "container-6" },
        { name: "Zinkphosphatieren", description: "Phosphatschicht als Korrosionsschutz und als Haftgrund für nachfolgende Beschichtungen.", target: "container-8" },
        { name: "Mn-Phosphatieren", description: "Manganphosphatschicht für Verschleißschutz, Einlaufverhalten und als Haftgrund für Öle oder weitere Beschichtungen.", target: "container-30" },
        { name: "Brünieren", description: "Dünne dunkle Konversionsschicht auf Eisenwerkstoffen, häufig mit anschließender Konservierung.", target: "container-11" },
        { name: "Verzinnen", description: "Zinnschichten für Korrosionsschutz, Lötbarkeit und funktionelle Oberflächeneigenschaften.", target: "container-12" },
        { name: "Aluminieren", description: "Aluminiumschichten für Korrosions- und Hochtemperaturschutz.", target: "container-13" },
        { name: "Vernickeln", description: "Nickelschichten für Korrosionsschutz, Verschleißschutz, Optik oder als Zwischenschicht.", target: "container-14" },
        { name: "Aluminium-Passivieren", description: "Chemische Passivierung von Aluminium zur Verbesserung von Korrosionsschutz und Lackhaftung.", target: "container-15" },
        { name: "Elektropolieren", description: "Elektrochemisches Glätten und Reinigen metallischer Oberflächen, besonders bei Edelstahl.", target: "container-16" },
        { name: "Verchromen", description: "Chromschichten für dekorative oder technische Anforderungen, beispielsweise Hartchrom.", target: "container-17" },
        { name: "Vermessingen", description: "Messingfarbene Metallbeschichtung für dekorative und funktionelle Anwendungen.", target: "container-18" },
        { name: "Verkupfern", description: "Kupferschichten als Funktions-, Haft- oder Zwischenschicht sowie für dekorative Anwendungen.", target: "container-19" },
        { name: "Vergolden", description: "Goldschichten für hochwertige Optik, Kontaktflächen und besondere technische Anforderungen.", target: "container-20" },
        { name: "Versilbern", description: "Silberschichten für elektrische Leitfähigkeit, Kontaktflächen, Korrosionsschutz und dekorative Anwendungen.", target: "container-41" },
      ],
    },
    {
      title: "Vorbehandlung & Entschichtung",
      items: [
        { name: "Beizen", description: "Chemisches Entfernen von Oxiden, Zunder, Rost oder Verunreinigungen zur Vorbereitung der Oberfläche.", target: "container-31" },
        { name: "Entgraten", description: "Entfernen scharfer Grate und Bearbeitungsrückstände an Kanten, Bohrungen und Konturen.", target: "container-32" },
        { name: "Verrunden", description: "Gezieltes Abrunden scharfer Kanten zur Verbesserung von Sicherheit, Beschichtbarkeit und Bauteilfunktion.", target: "container-33" },
        { name: "Glätten", description: "Reduzieren von Rauheit und Bearbeitungsspuren für eine gleichmäßigere technische oder optische Oberfläche.", target: "container-34" },
        { name: "Mattieren", description: "Erzeugen einer gleichmäßig matten Oberfläche durch mechanische, chemische oder strahltechnische Bearbeitung.", target: "container-35" },
        { name: "Schleifen", description: "Spanende Feinbearbeitung zur Formkorrektur, Rauheitsreduzierung und Vorbereitung weiterer Oberflächenprozesse.", target: "container-36" },
        { name: "Polieren", description: "Feinstbearbeitung zur Verringerung der Rauheit und Erzeugung glatter bis hochglänzender Oberflächen.", target: "container-37" },
        { name: "Bürsten", description: "Mechanische Bearbeitung für Reinigung, Strukturierung oder ein definiertes Schliffbild auf Metalloberflächen.", target: "container-38" },
        { name: "Trowalisieren", description: "Gleitschleifen von Werkstücken zum Entgraten, Glätten, Polieren oder Reinigen in einem Arbeitsbehälter.", target: "container-39" },
        { name: "Chemisches Glänzen", description: "Chemisches Einebnen und Aufhellen einer Oberfläche ohne mechanische Polierbearbeitung.", target: "container-40" },
        { name: "Strahlen", description: "Mechanische Oberflächenbehandlung zur Reinigung, Aufrauung oder Erzeugung definierter Oberflächen.", target: "container-9" },
        { name: "Entlacken", description: "Entfernen vorhandener Lack- und Beschichtungssysteme als Vorbereitung für die Weiterbearbeitung.", target: "container-10" },
        { name: "Entzinken", description: "Gezieltes Entfernen vorhandener Zinkschichten vor Reparatur oder Neubeschichtung.", target: "container-24" },
        { name: "Enteloxieren", description: "Entfernen bestehender Eloxalschichten von Aluminiumoberflächen.", target: "container-25" },
        { name: "Entanodisieren", description: "Entfernen anodisch erzeugter Oxidschichten als Vorbereitung für eine neue Oberflächenbehandlung.", target: "container-26" },
        { name: "Entzinnen", description: "Chemisches oder elektrochemisches Entfernen vorhandener Zinnschichten.", target: "container-27" },
        { name: "Entaluminieren", description: "Entfernen vorhandener Aluminiumschichten vor einer erneuten Oberflächenbehandlung.", target: "container-28" },
        { name: "Entnickeln", description: "Chemisches oder elektrochemisches Entfernen von Nickelschichten.", target: "container-29" },
      ],
    },
    {
      title: "Lacke, Restlacke & Recycling",
      items: [
        { name: "Lacke & Beschichtungsstoffe", description: "Grundlagen zu Nass- und Pulverlacken, Lackaufbau, Eigenschaften, Auswahl, Lagerung und wichtigen technischen Angaben.", target: "container-42" },
        { name: "Lackrecycling & Restlackverwertung", description: "Möglichkeiten, geeignete Restlacke weiterzuverwenden, aufzubereiten oder einer sinnvollen Verwertung zuzuführen, statt sie vorschnell zu entsorgen.", target: "container-43" },
      ],
    },
    {
      title: "Weitere Leistungen",
      items: [
        { name: "Folieren", description: "Aufbringen technischer oder dekorativer Folien für Innen- und Außenanwendungen.", target: "container-21" },
        { name: "Isolierstegverpressen", description: "Verbinden von Aluminiumprofilen mit thermisch trennenden Isolierstegen.", target: "container-22" },
        { name: "Einlagern", description: "Zwischen- oder Fertigwarenlagerung als ergänzende Leistung innerhalb der Auftragsabwicklung.", target: "container-23" },
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

  const legacyContainerHeadings = [
    "Beschichtungstechnik",
    "Verfahren",
    "Nasslackieren",
    "Pulverbeschichten",
    "Eloxieren / Anodisieren & Enteloxieren / Entanodisieren",
    "Verzinken & Entzinken",
    "Verzinnen & Entzinnen",
    "Aluminieren & Entaluminieren",
    "Vernickeln & Entnickeln",
    "Entlacken",
    "Strahlen",
    "Folieren",
    "Isolierstegverpressen",
  ];

  const legacyContainerTexts = [
    "Die <strong>Beschichtungstechnik</strong> (bzw. Oberflächentechnik) ist ein Teilbereich der Materialwissenschaften, der sich mit der <span class='highlight'>gezielten Modifikation von Oberflächen</span> beschäftigt, um deren Eigenschaften zu verbessern. Ziel ist es, Materialien oder Bauteile <strong>funktionaler</strong>, <strong>langlebiger</strong> und <strong>ästhetisch ansprechender</strong> zu gestalten. Die Beschichtungstechnik leistet somit einen wesentlichen Beitrag zur Langlebigkeit und Umweltfreundlichkeit metallischer Produkte. Die Anwendungen reichen von <strong>Korrosions-</strong> und <strong>Verschleißschutz</strong> bis hin zur Optimierung <span class='highlight'>chemischer</span>, <span class='highlight'>elektrischer</span> und <span class='highlight'>mechanischer</span> Eigenschaften sowie der visuellen Gestaltung. Dabei wird ausschließlich die Oberfläche behandelt, während das Grundmaterial unverändert bleibt. Diese Technologie spielt eine essenzielle Rolle in zahlreichen Industrien, darunter die <strong>Automobilbranche</strong>, <strong>Luft- und Raumfahrt</strong>, <strong>Maschinenbau</strong>, <strong>Medizintechnik</strong> und <strong>Elektronik</strong>.<br><br><h4>Ziele der Beschichtung:</h4><ul><li><strong>Dekoration:</strong> Lackieren oder Pulverbeschichten mit verschiedenen Lacken verändern Farbe, Glanz und Textur der Oberfläche.</li><li><strong>Schutz:</strong> Reduktion von Korrosion, Abrieb, Kratzer und UV-Strahlung.</li><li><strong>Funktionalität:</strong> Die Oberfläche wird mit spezifischen Eigenschaften ausgestattet, etwa durch Verbesserung der Haftung, Gleitfähigkeit, elektrischen Leitfähigkeit oder Wärmeleitfähigkeit</span>.</li><li><strong>Hygiene:</strong> Spezielle Beschichtungen können Schmutzanhaftungen reduzieren und die Reinigung erleichtern. Dies ist besonders in der Lebensmittelindustrie und der Medizintechnik von großem Nutzen.</li></ul>",

    
    "Die <strong>Verfahren in der Beschichtungstechnik</strong> sind vielfältig und können in vier verschiedene Verfahrenstypen eingeteilt werden:<br><br><strong>Thermische Verfahren:</strong> Durch Hitzezufuhr wird auf dem Werkstück eine Beschichtung erzeugt. <span class='highlight'>Verzinken durch Flammspritzen</span> oder <span class='highlight'>Lackieren durch Pulverbeschichten</span>, sind häufig eingesetzte Techniken.<br><br><strong>Chemische Verfahren:</strong> Durch Chemikalien werden Oberflächenstruktur und -beschaffenheit verändert. Zu den bekanntesten Prozessen zählen das <span class='highlight'>Beizen</span> (entfernen von Oxidschichten / Rost), das <span class='highlight'>Passivieren</span> (Überziehen einer Schutzschicht) und das <span class='highlight'>Anodisieren</span> (Eloxieren), also das Bilden einer stabilen Oxidschicht.<br><br><strong>Galvanische oder elektrolytische Verfahren:</strong> In einer Lösung mit Metallionen (meist Zink, Chrom oder Nickel) welche auf die Oberfläche eines Werkstücks abgeschieden werden, bildet sich eine <span class='highlight'>Korrosionsschutzschicht</span>, welche die Lebensdauer des Werkstücks gegen Korrosion erhöht.<br><br><strong>Mechanische Verfahren:</strong> <span class='highlight'>Nasslackieren</span>, <span class='highlight'>Schleifen</span>, <span class='highlight'>Polieren</span>, <span class='highlight'>Bürsten</span>, <span class='highlight'>mechanisches Entlacken</span> oder <span class='highlight'>Strahlen</span> zählen zu den Verfahren, bei denen die Oberfläche durch mechanische Einwirkung strukturiert wird.",

   "Das <strong>Nasslackieren</strong> ist ein Beschichtungsverfahren, bei dem flüssiger Lack auf die Oberfläche eines Werkstücks aufgetragen wird, um es zu schützen oder ästhetisch zu gestalten. Der Prozess umfasst das Auftragen des Lacks mit verschiedenen Methoden und endet mit einer Trocknung oder Aushärtung des Lacks. Nasslackieren wird in vielen Industrien eingesetzt, um eine <strong>korrosionsbeständige</strong>, <strong>dekorative</strong> oder <strong>funktionelle</strong> Oberfläche zu erzielen.<br><br><strong>Spritzlackieren</strong> ist eine der häufigsten Methoden des Nasslackierens. Dabei wird der flüssige Lack mit einem Sprühgerät auf das Werkstück aufgetragen. Diese Methode wird besonders für Bauteile mit komplexen Formen oder großen Oberflächen verwendet. Sie ermöglicht eine gleichmäßige Lackierung und wird in Bereichen wie der <span class='highlight'>Automobilindustrie</span>, <span class='highlight'>Möbelherstellung</span> und <span class='highlight'>Maschinenbau</span> eingesetzt.<br><br>Beim <strong>Tauchlackieren</strong> wird das Werkstück in ein Bad aus flüssigem Lack getaucht. Dieses Verfahren eignet sich gut für Bauteile mit komplexen Geometrien, da der Lack gleichmäßig auf der Oberfläche haftet. Tauchlackieren findet oft in der <span class='highlight'>Automobilindustrie</span> Anwendung. <strong>Rolllackieren</strong> wird eingesetzt, indem der Lack mit einer Walze auf das Werkstück aufgetragen wird. Diese Methode eignet sich gut für große flache Oberflächen wie Türen oder Möbelplatten und ist weniger präzise als das Spritzlackieren. Für kleinere Flächen oder in Bereichen, in denen Präzision weniger wichtig ist, wird auch <strong>Pinsel- und Rollenlackierung</strong> eingesetzt. Diese traditionelle Methode erlaubt es, den Lack direkt auf das Werkstück aufzutragen.<br><br><strong>KTL (Kathodische Tauchlackierung)</strong> ist ein spezielles Verfahren, das in der <span class='highlight'>Automobilindustrie</span> und anderen Bereichen verwendet wird, um eine besonders korrosionsbeständige Lackschicht zu erzeugen. Bei KTL wird das Werkstück in ein Lackbad getaucht, das elektrisch geladen ist. Durch Anlegen eines elektrischen Stroms wird das Werkstück zur Kathode, und der Lack wird elektrochemisch aufgetragen, wodurch eine sehr gleichmäßige und strapazierfähige Schicht entsteht. KTL ist besonders effektiv für den Schutz von Bauteilen vor Rost und Korrosion, da die Schicht besonders dick und widerstandsfähig ist.<br><br>Das <strong>Nasslackieren</strong> bietet den Vorteil einer gleichmäßigen Beschichtung, die besonders schwer zu erzielen wäre, wenn man andere Verfahren wie das Pulverbeschichten verwendet. Es gibt eine breite Auswahl an Farben und Effekten, die mit Nasslack erreicht werden können, und es eignet sich für viele verschiedene Materialien wie <span class='highlight'>Holz</span>, <span class='highlight'>Metall</span> und <span class='highlight'>Kunststoff</span>. Zudem lässt sich eine Beschichtung aus Nasslack relativ einfach reparieren, wenn Schäden auftreten. Das Verfahren ist sehr vielseitig und findet in zahlreichen Branchen Anwendung. Auf der anderen Seite hat Nasslackieren auch einige Nachteile. Die Trocknungszeit ist relativ lang, besonders im Vergleich zu anderen Verfahren wie dem Pulver- oder UV-Lackieren, was die Produktionsgeschwindigkeit verlangsamen kann. Viele flüssige Lacke enthalten Lösungsmittel oder flüchtige organische Verbindungen (VOCs), die schädlich für die Umwelt sein können, weshalb zunehmend <strong>wasserbasierte</strong> oder <strong>umweltfreundlichere Lacke</strong> verwendet werden. Ein weiteres Problem ist der <strong>Materialverlust</strong>, der besonders beim Spritzlackieren auftreten kann, wenn ein Teil des Lacks durch Overspray verloren geht. Dies führt zu einem höheren Materialverbrauch und einer geringeren Effizienz. Obwohl Nasslack eine gleichmäßige Beschichtung ermöglicht, können ungewollte Tropfenbildung oder Lufteinschlüsse entstehen, wenn das Verfahren nicht ordnungsgemäß ausgeführt wird. Nasslackieren wird in vielen Industrien wie der <span class='highlight'>Automobilindustrie</span>, <span class='highlight'>Möbelproduktion</span> und bei <span class='highlight'>Haushaltsgeräten</span> eingesetzt. Es bietet eine hohe Flexibilität bei der Farbgestaltung und Oberflächenveredelung. Besonders bei Bauteilen, die hohen mechanischen Belastungen ausgesetzt sind oder spezifische dekorative Anforderungen erfüllen müssen, ist Nasslackieren eine gängige Wahl. Das Verfahren ist eine bewährte und vielseitige Lösung für die Oberflächenbehandlung, obwohl es einige Herausforderungen hinsichtlich der Effizienz und Umweltaspekte gibt.<br><br><strong>Relevante Zertifizierungen und Normen:</strong><br>Beim Nasslackieren sind je nach Einsatzbereich vor allem Korrosionsschutzanforderungen, Schichtaufbau, Schichtdicke, Haftung, Glanzgrad, Farbton, Beständigkeit und Prüfzeugnisse relevant. Für Stahlbauteile im Korrosionsschutz ist <strong>DIN EN ISO 12944</strong> ein wichtiger Orientierungspunkt. In regulierten Branchen können außerdem kundenspezifische Vorgaben, Werksnormen sowie Qualitäts- und Umweltmanagementsysteme wie <strong>ISO 9001</strong> oder <strong>ISO 14001</strong> relevant sein. Für das Beschichtungsergebnis bedeutet das: Der gewünschte Schutzgrad, die Optik und die technische Beständigkeit werden klarer definiert und können besser geprüft werden.<br><br><strong>Korrosionsschutzklassen:</strong><br>Bei Bauteilen aus Stahl oder beschichtetem Metall können Korrosivitätskategorien nach <strong>DIN EN ISO 12944</strong> relevant sein. Sie beschreiben, wie stark die spätere Umgebung das Bauteil korrosiv belastet. <strong>C1</strong> steht für sehr geringe Belastung, z. B. trockene Innenräume. <strong>C2</strong> steht für geringe Belastung, z. B. unbeheizte Innenräume oder ländliche Außenbereiche. <strong>C3</strong> beschreibt mittlere Belastung, z. B. Stadtbereiche, leichte Industrie oder feuchtere Produktionsräume. <strong>C4</strong> steht für hohe Belastung, z. B. Industrieumgebung oder Küstennähe. <strong>C5</strong> und <strong>CX</strong> stehen für sehr hohe bis extreme Belastung, z. B. starke Industrie-, Meeres- oder Offshore-Umgebungen. Für das Ergebnis bedeutet das: Je höher die Klasse, desto genauer müssen Vorbehandlung, Schichtaufbau, Schichtdicke und Beschichtungssystem auf den Einsatzbereich abgestimmt werden.<br><br><strong>Nasslacke</strong><br><br>Nasslacke sind flüssige Beschichtungen, die auf Werkstücke aufgetragen werden, um deren Oberflächen zu schützen, zu verschönern oder funktionelle Eigenschaften zu verleihen. Sie bestehen aus verschiedenen Bestandteilen wie <span class='highlight'>Bindemitteln</span>, <span class='highlight'>Pigmenten</span>, <span class='highlight'>Lösungsmitteln</span> und <span class='highlight'>Additiven</span>. Die Beschichtung wird in flüssiger Form aufgebracht und trocknet anschließend, um eine feste, schützende Schicht zu bilden. Nasslacke werden in einer Vielzahl von Branchen verwendet, von der <span class='highlight'>Automobilindustrie</span> über <span class='highlight'>Möbelherstellung</span> bis hin zur <span class='highlight'>Elektroindustrie</span>.<br>Nasslacke bestehen hauptsächlich aus <strong>Bindemitteln</strong> (Harze oder Kunststoffe), die für die Haftung auf der Oberfläche verantwortlich sind, <strong>Pigmenten</strong>, die Farbe und Deckkraft liefern, und <strong>Lösungsmitteln</strong>, die die Viskosität des Lacks anpassen und die Anwendung erleichtern. Zusatzstoffe wie <span class='highlight'>UV-Stabilisatoren</span>, <span class='highlight'>Antioxidantien</span> oder <span class='highlight'>Flammschutzmittel</span> können ebenfalls hinzugefügt werden, um bestimmte Eigenschaften zu verbessern, wie etwa <strong>Wetterbeständigkeit</strong> oder <strong>Brandverhalten</strong>.<br>Es gibt verschiedene Arten von Nasslacken, die je nach Anwendungsbereich und den gewünschten Eigenschaften des Endprodukts ausgewählt werden:<br> <strong>Lösemittelhaltige Nasslacke:</strong> Diese Lacke enthalten Lösungsmittel, die beim Trocknen verdampfen und die Lackschicht hinterlassen. Sie sind einfach zu verarbeiten und bieten eine hohe Beständigkeit gegenüber Umwelteinflüssen. Aufgrund der enthaltenen flüchtigen organischen Verbindungen (VOCs) gelten sie jedoch als weniger umweltfreundlich und müssen unter besonderen Vorsichtsmaßnahmen eingesetzt werden.<br> <strong>Wasserbasierte Nasslacke:</strong> Diese Lacke enthalten Wasser als Hauptverdünnungsmittel anstelle von Lösungsmitteln. Sie sind umweltfreundlicher, da sie weniger VOCs freisetzen und weniger schädlich für die Luftqualität sind. Wasserbasierte Lacke bieten dennoch eine gute Leistung und werden zunehmend in der <span class='highlight'>Automobilindustrie</span>, bei <span class='highlight'>Möbeln</span> und in der <span class='highlight'>Bauindustrie</span> eingesetzt.<br> <strong>2K-Nasslacke (Zweikomponentenlacke):</strong> Diese Lacke bestehen aus zwei Komponenten – dem Basislack und einem Härter. Beide werden erst kurz vor der Anwendung gemischt. Diese Art von Lack bietet eine besonders hohe Widerstandsfähigkeit und Beständigkeit gegenüber mechanischen Belastungen, was sie ideal für industrielle Anwendungen wie <span class='highlight'>Maschinenbau</span>, <span class='highlight'>Fahrzeugbau</span> oder <span class='highlight'>Korrosionsschutz</span> macht. Nasslacke bieten eine hohe Flexibilität in der Anwendung. Sie können auf nahezu jede Art von Oberfläche aufgetragen werden, darunter <strong>Metall</strong>, <strong>Holz</strong>, <strong>Kunststoff</strong> und <strong>Glas</strong>. Sie ermöglichen die Erstellung von glatten, gleichmäßigen Beschichtungen mit einer breiten Auswahl an Farben und Oberflächenstrukturen (glänzend, matt, satin). Darüber hinaus bieten sie eine hohe Beständigkeit gegen Umwelteinflüsse wie <strong>UV-Strahlung</strong>, <strong>Feuchtigkeit</strong> und <strong>Temperaturunterschiede</strong>. Ein weiterer Vorteil von Nasslacken ist ihre Vielseitigkeit. Sie können in verschiedenen Anwendungen eingesetzt werden, von <strong>dekorativen Beschichtungen</strong> bis hin zu <strong>funktionellen Schutzschichten</strong>. Sie sind besonders geeignet für Anwendungen, bei denen eine hohe Farbvielfalt, eine gute Deckkraft und eine gleichmäßige Oberfläche gewünscht sind.<br>Ein großer Nachteil von Nasslacken ist die <strong>Trocknungszeit</strong>. Im Vergleich zu anderen Beschichtungsverfahren wie dem Pulver- oder UV-Lackieren benötigen Nasslacke deutlich mehr Zeit, um vollständig zu trocknen oder auszuhärten. Dies kann die Produktionsgeschwindigkeit in industriellen Anwendungen verlangsamen. Viele Nasslacke enthalten <strong>flüchtige organische Verbindungen (VOCs)</strong>, die umweltschädlich sein können und spezielle Sicherheitsvorkehrungen erfordern. Um diesem Problem entgegenzuwirken, werden zunehmend <span class='highlight'>wasserbasierte Nasslacke</span> verwendet, die weniger VOCs freisetzen und umweltfreundlicher sind. Trotz ihrer geringeren Umweltbelastung haben wasserbasierte Lacke oft eine geringere Widerstandsfähigkeit gegenüber extremen Witterungsbedingungen und mechanischen Belastungen als lösemittelbasierte Lacke. Außerdem kann das Nasslackieren aufgrund von <strong>Materialverlusten</strong> durch Overspray oder Überlackierung weniger effizient sein. Beim Sprühen von Lack entsteht feiner Sprühnebel, der nicht auf der Oberfläche landet, sondern in der Luft verbleibt oder sich auf anderen Oberflächen absetzt, was zu einem höheren Materialverbrauch führt. Nasslacke finden in einer Vielzahl von Bereichen Anwendung. Sie werden in der <span class='highlight'>Automobilindustrie</span> zur Lackierung von Fahrzeugen und Fahrzeugteilen eingesetzt, in der <span class='highlight'>Möbelherstellung</span> zur Veredelung von Holzoberflächen sowie im <span class='highlight'>Bau</span> für Fensterrahmen, Türen und Stahlkonstruktionen. Zudem finden sie Anwendung in der <span class='highlight'>Elektronikindustrie</span> für Leiterplatten und in der <span class='highlight'>Maschinenbauindustrie</span>, um Maschinenbauteile vor Korrosion zu schützen. Insgesamt bieten Nasslacke eine sehr vielseitige und weit verbreitete Lösung für eine Vielzahl von Oberflächenbehandlungsanforderungen. Sie sind besonders geeignet für Anwendungen, bei denen eine hohe <strong>Farbgenauigkeit</strong> und eine gleichmäßige, <strong>dauerhafte Beschichtung</strong> gewünscht sind.",

    "Das <strong>Pulverbeschichten</strong>, auch bekannt als <strong>Thermo-</strong> oder <strong>Pulverlackierung</strong>, ist ein Verfahren zur Oberflächenbeschichtung, das auf <span class='highlight'>elektrisch leitfähigen Materialien</span> angewendet wird. Typischerweise kommen dabei <span class='highlight'>Metalle</span> wie Aluminium, Stahl, verzinkter Stahl, Edelstahl oder Messing zum Einsatz, doch auch andere Werkstoffe lassen sich auf diese Weise beschichten. Damit die Beschichtung optimal haftet und ihren Zweck erfüllt, ist eine <strong>sorgfältige Vorbehandlung</strong> erforderlich. Diese umfasst in der Regel eine <span class='highlight'>Entfettung</span>, <span class='highlight'>Beizung</span> sowie eine <span class='highlight'>Passivierung</span> – je nach Grundmaterial können dabei unterschiedliche Verfahren und Chemikalien zum Einsatz kommen. Nach der Vorbehandlung werden die Werkstücke getrocknet und anschließend mit <strong>Pulverlack</strong> besprüht. Im nächsten Schritt erfolgt das <strong>Einbrennen</strong> des Pulvers im Ofen bei Temperaturen zwischen <span class='highlight'>110 und 250 °C</span>. Dabei vernetzt sich das Pulver und bildet eine <strong>widerstandsfähige, optisch ansprechende Schutzschicht</strong>.<br><br>Die Pulverbeschichtung ist auch für <span class='highlight'>großformatige Bauteile</span> geeignet – Werkstücke mit einer Größe von bis zu <strong>10 × 5 × 3 Metern</strong> (HxBxT) lassen sich problemlos bearbeiten, in Sonderfällen sogar noch größere. Die <strong>Dicke der Beschichtung</strong> variiert je nach Anwendungsbereich und liegt in der Regel zwischen <span class='highlight'>60 und 120 µm</span>, wobei sowohl dünnere als auch dickere Schichten realisierbar sind.<br><br><strong>Relevante Zertifizierungen und Normen:</strong><br>Für Pulverbeschichtungen können je nach Material, Einsatzbereich und Qualitätsanforderung unterschiedliche Zertifizierungen, Qualitätslabels oder Normen relevant sein. <strong>QUALICOAT</strong> ist vor allem bei beschichtetem Aluminium für architektonische Anwendungen relevant und steht für Anforderungen an Vorbehandlung, Beschichtungsstoffe, Anlagen und fertige Produkte. <strong>GSB</strong> steht ebenfalls für geprüfte Qualität bei hochwertigen Beschichtungen von Aluminium und Stahl. Bei beschichtetem Stahl kann <strong>QUALISTEELCOAT</strong> relevant sein, insbesondere wenn Anforderungen an Korrosionsschutz, Vorbehandlung, Beschichtungssysteme und Qualitätskontrolle bestehen. Für Korrosionsschutz an Stahlbauteilen sind außerdem <strong>DIN EN ISO 12944</strong> sowie bei Pulverbeschichtung von Stahlbauteilen <strong>DIN 55633</strong> und <strong>DIN 55634</strong> wichtige Orientierungspunkte. Bei feuerverzinkten und anschließend pulverbeschichteten Bauteilen können zusätzlich Anforderungen an Duplex-Systeme relevant sein. Für das Beschichtungsergebnis bedeutet das: Vorbehandlung, Haftung, Schichtaufbau, Schichtdicke, Korrosionsschutz, Beständigkeit und regelmäßige Qualitätsprüfungen werden klarer geregelt. Die Oberfläche soll dadurch gleichmäßiger, beständiger und besser auf den vorgesehenen Einsatzbereich abgestimmt sein.<br><br><strong>Korrosionsschutzklassen:</strong><br>Bei Bauteilen aus Stahl oder beschichtetem Metall können Korrosivitätskategorien nach <strong>DIN EN ISO 12944</strong> relevant sein. Sie beschreiben die spätere Belastung durch die Umgebung. <strong>C1</strong> bedeutet sehr geringe Belastung, z. B. trockene Innenräume. <strong>C2</strong> bedeutet geringe Belastung, z. B. unbeheizte Innenräume oder ländliche Außenbereiche. <strong>C3</strong> bedeutet mittlere Belastung, z. B. Stadtbereiche, leichte Industrie oder feuchtere Produktionsräume. <strong>C4</strong> bedeutet hohe Belastung, z. B. Industrieumgebung oder Küstennähe. <strong>C5</strong> und <strong>CX</strong> bedeuten sehr hohe bis extreme Belastung, z. B. starke Industrie-, Meeres- oder Offshore-Umgebungen. Für das Ergebnis bedeutet das: Je höher die Korrosionsschutzklasse, desto wichtiger sind passende Vorbehandlung, Pulverlack-System, Schichtdicke, Kantenabdeckung und Qualitätsprüfung.<br><br><strong>Pulverlacke</strong> sind in sehr vielen verschiedenen Variationen kommerziell erhältlich. Die meisten Pulverlacke haben <span class='highlight'>Polyamid</span>, <span class='highlight'>Polyesterharz</span> oder <span class='highlight'>Epoxidharz</span> als Basis. Pulverlacke unterscheiden sich je nach Zusammensetzung in <strong>Farben & Erscheinung</strong>, <strong>Glanzgraden</strong>, <strong>Oberflächenstrukturen</strong>, <strong>Verarbeitung</strong>, <strong>Einsatzzwecken</strong> und <strong>Eigenschaften gegenüber äußeren Einflüssen</strong>. Es sind <span class='highlight'>kratzresistente</span>, <span class='highlight'>elektrisch ableitfähige</span>, <span class='highlight'>hochwetterfeste</span>, <span class='highlight'>anti-Graffiti</span>, <span class='highlight'>fluoreszierende</span>, <span class='highlight'>metallic</span>, <span class='highlight'>anti-Quietsch</span>, <span class='highlight'>anti-Rutsch</span>, <span class='highlight'>anti-Ausgasung</span> und weitere Variationen erhältlich, je nach geforderter Anwendung. Pulverlacke sind auf Kundenwunsch auch <strong>nach Vorlage oder individuellen Bedürfnissen</strong> produzierbar. Ebenso gibt es <span class='highlight'>GSB</span> und <span class='highlight'>Qualicoat</span> zertifizierte Pulverlacke, welche bestimmte Mindeststandards jedenfalls erfüllen müssen.",

    "Das <strong>Eloxieren</strong> ist ein Verfahren zur <span class='highlight'>elektrolytischen Oxidation von Aluminium</span>, bei dem eine schützende Oxidschicht auf der Oberfläche gebildet wird. Diese Schicht bewahrt das Material vor Korrosion und verbessert seine Widerstandsfähigkeit. Dabei wird die oberste Metallschicht gezielt in Aluminiumoxid bzw. Hydroxid umgewandelt, wodurch eine <strong>widerstandsfähige</strong> und <strong>gleichmäßige Schutzschicht</strong> entsteht. Die Dicke der Eloxalschicht beträgt in der Regel zwischen <span class='highlight'>5 und 25 Mikrometern</span>, kann jedoch für spezielle Anwendungen auch dicker ausgeführt werden. Eine <strong>fehlerfreie, geschlossene Struktur</strong> ist essenziell, um die Schutzfunktion vollständig zu gewährleisten. Neben der <strong>Korrosionsbeständigkeit</strong> bietet das Verfahren weitere Vorteile: Die Oberfläche wird deutlich <strong>härter</strong> (Standard: 200–350 HV, Harteloxal: bis zu 600 HV), das Material erhält eine <strong>elektrische Isolierung</strong> und die <strong>Reibungseigenschaften</strong> werden verbessert. Ein besonderer Vorteil des Eloxierens ist die <span class='highlight'>gleichmäßige Beschichtung selbst bei komplexen Geometrien</span>. Die entstehende Oxidschicht besitzt zunächst Mikroporen, die durch ein <strong>abschließendes Verdichten oder Versiegeln</strong> verschlossen werden. Die Qualität der Schicht hängt stark von der <span class='highlight'>Reinheit des Aluminiums</span> ab – während reines Aluminium ideale Ergebnisse liefert, können bestimmte Legierungen zu Unregelmäßigkeiten führen. Daher sollte die <strong>Materialzusammensetzung</strong> sorgfältig auf die Anforderungen abgestimmt und die <span class='highlight'>Empfehlungen des Eloxalbetriebs</span> berücksichtigt werden. Der Prozess beginnt mit einer gründlichen <strong>Vorbehandlung</strong>, bei der die Werkstücke <span class='highlight'>entfettet</span> und <span class='highlight'>gebeizt</span> werden. Anschließend erfolgt die <strong>elektrolytische Oxidation</strong>. Danach kann das eloxierte Material in <span class='highlight'>verschiedenen Farben eingefärbt</span> oder mit speziellen Verfahren partiell behandelt werden. Zudem lassen sich Eloxalschichten bei Bedarf auch wieder <strong>entfernen</strong>.<br><br><strong>Relevante Zertifizierungen und Normen:</strong><br>Beim Eloxieren bzw. Anodisieren von Aluminium kann <strong>QUALANOD</strong> relevant sein. QUALANOD ist ein Qualitätslabel für anodisierte bzw. eloxierte Aluminiumoberflächen und steht für Anforderungen an Prozessüberwachung, Schichtqualität und Ausführung durch lizenzierte Betriebe. Je nach Anwendung können zusätzlich Schichtdickenvorgaben, Prüfzeugnisse, Farbvorgaben, Anforderungen an Verdichtung, Abriebfestigkeit, Korrosionsbeständigkeit oder kundenspezifische Werksnormen wichtig sein. Für das Beschichtungsergebnis bedeutet das: Schichtdicke, Verdichtung, Farbgleichmäßigkeit und Beständigkeit werden besser nachvollziehbar und prüfbar. Gerade bei sichtbaren Aluminiumteilen, Fassadenprofilen oder technischen Funktionsflächen sollte der gewünschte Qualitätsstandard vorab angegeben werden.<br><br>Das <strong>Anodisieren</strong> ist ein <span class='highlight'>elektrochemisches Verfahren</span> zur gezielten Oxidation von Metallen, das eine <strong>schützende</strong> und <strong>veredelnde Oxidschicht</strong> auf der Materialoberfläche erzeugt. Allerdings eignet sich nicht jedes Metall für diesen Prozess. Neben <span class='highlight'>Aluminium</span> und seinen Legierungen können auch <span class='highlight'>Titan</span>, <span class='highlight'>Magnesium</span>, <span class='highlight'>Zink</span>, <span class='highlight'>Niob</span> und <span class='highlight'>Tantal</span> anodisiert werden. Ähnlich wie beim Eloxieren erfolgt zunächst eine gründliche <strong>Vorbehandlung</strong>, bei der die Werkstücke <span class='highlight'>gereinigt</span>, <span class='highlight'>entfettet</span> und gegebenenfalls <span class='highlight'>gebeizt</span> werden. Diese Schritte sind entscheidend für eine <strong>gleichmäßige</strong> und <strong>hochwertige Oxidschicht</strong>. Anschließend werden die Bauteile <strong>elektrochemisch behandelt</strong>, wodurch sich die gewünschte Schutzschicht bildet. Die <span class='highlight'>Schichtdicke</span> hängt unter anderem von der <span class='highlight'>angelegten Spannung</span> und der <span class='highlight'>Dauer des Prozesses</span> ab. Zusätzlich besteht die Möglichkeit, die Oberfläche in <strong>verschiedenen Farben zu färben</strong>, bevor die poröse Oxidschicht in einem abschließenden Schritt <strong>versiegelt</strong> wird. Dies erhöht die <strong>Widerstandsfähigkeit</strong> und sorgt für eine <strong>lange Haltbarkeit</strong>. Das Anodisieren verbessert nicht nur den <span class='highlight'>Korrosionsschutz</span> und die <span class='highlight'>Abriebfestigkeit</span> gegenüber mechanischer Beanspruchung, sondern bietet auch vielfältige <strong>gestalterische Möglichkeiten</strong>. Zudem ist das Verfahren <strong>umweltfreundlich</strong>, da es – im Gegensatz zu galvanischen Beschichtungen – ohne den Einsatz <span class='highlight'>schädlicher Metalle</span> auskommt.<br><br><br><strong>Enteloxieren bzw. Entanodisieren</strong> bezieht sich auf das <span class='highlight'>Entfernen der anodisierten Schicht</span> von Metalloberflächen, die durch das Anodisieren eine schützende Oxidschicht erhalten haben. Enteloxieren wird nur im Bezug auf <strong>Aluminium</strong> verwendet, Entanodisieren wird für andere Materialien angewendet, die anodisiert wurden. Das Ziel des Enteloxierens bzw. Entanodisierens ist es, die <strong>schützende Oxidschicht zu entfernen</strong>, um die Oberfläche für eine weitere Bearbeitung oder ein anderes Finish vorzubereiten.<br><br><strong>Aluminium:</strong> Wie bereits erwähnt, ist das Entanodisieren von Aluminium am häufigsten. Dabei wird die Schicht, die durch den elektrolytischen Prozess entsteht, <strong>entfernt</strong>, um das ursprüngliche Material freizulegen oder eine erneute Anodisierung zu ermöglichen.<br><br><strong>Andere Metalle:</strong> Auch andere <span class='highlight'>Metalle oder Legierungen</span> können anodisiert und anschließend entanodisiert werden. Zu diesen Materialien gehören <strong>Titan</strong> und <strong>Magnesium</strong>. Titan wird häufig in <span class='highlight'>medizinischen</span> und <span class='highlight'>industriellen Anwendungen</span> anodisiert, wobei eine schützende Oxidschicht entsteht. Das Entanodisieren von Titan kann erforderlich sein, um bestimmte <strong>Eigenschaften des Materials freizulegen</strong> oder seine <strong>Oberflächenstruktur</strong> für spezifische Anwendungen zu verändern. Magnesium wird in einigen Fällen anodisiert, um <strong>Korrosionsbeständigkeit</strong> zu erhöhen, und das Entanodisieren wird angewendet, wenn eine <span class='highlight'>Veränderung der Oberflächenbeschaffenheit</span> oder die <span class='highlight'>Wiederherstellung des ursprünglichen Aussehens</span> gewünscht wird.<br><br>Für das <strong>Enteloxieren</strong> bzw. <strong>Entanodisieren</strong> stehen <span class='highlight'>chemische</span>, <span class='highlight'>mechanische</span> und <span class='highlight'>galvanische Methoden</span> zur Verfügung, wobei die <strong>chemische Methode</strong> mit Abstand am häufigsten Anwendung findet.",

   "Beim <strong>Verzinken</strong> wird meistens <span class='highlight'>Stahl</span> mit einer dünnen Schicht <span class='highlight'>Zink</span> überzogen, um ihn vor <strong>Korrosion</strong> zu schützen. Dafür gibt es verschiedene Verfahren mit unterschiedlichen Parametern. Die häufigsten Verfahren sind das <strong>Feuerverzinken</strong> und das <strong>galvanische Verzinken</strong>, wobei beide Methoden ihre eigenen Vorteile bieten:<br><br> Beim <strong>Feuerverzinken</strong> werden Werkstücke in ein Bad aus geschmolzenem Zink getaucht. Vorab werden <span class='highlight'>Öl-, Fett-, Rost- und Schmutzrückstände</span> durch <strong>Entfetten</strong>, <strong>Beizen</strong> und das Auftragen eines <strong>Flussmittels</strong> entfernt. Nach der Reinigung erfolgt das Eintauchen der Werkstücke in das etwa <span class='highlight'>450°C heiße Zinkbad</span>. Das flüssige Zink reagiert mit dem Stahl und bildet eine <strong>dauerhaft haftende Schutzschicht</strong>. Diese Schicht schützt über Jahre, oft bis zu <strong>50 Jahre</strong>, vor Korrosion.<br><br><strong>Relevante Zertifizierungen und Normen:</strong><br>Beim Feuerverzinken von Stahlteilen ist <strong>DIN EN ISO 1461</strong> eine zentrale Norm. Sie beschreibt Anforderungen und Prüfungen für durch Stückverzinken hergestellte Zinküberzüge auf Eisen- und Stahlteilen. Bei tragenden feuerverzinkten Stahlbauteilen können zusätzlich bauaufsichtliche oder projektspezifische Anforderungen relevant sein, etwa die <strong>DASt-Richtlinie 022</strong>. Bei Duplex-Systemen, also Feuerverzinken mit zusätzlicher Nass- oder Pulverbeschichtung, sollten die Anforderungen vorab klar angegeben werden. Für das Beschichtungsergebnis bedeutet das: Mindestanforderungen an Zinküberzug, Ausführung, Prüfung und Eignung für den Einsatzbereich werden klarer definiert.<br><br><strong>Korrosionsschutzklassen:</strong><br>Auch beim Verzinken ist die spätere Korrosionsbelastung wichtig. Innenbereiche, ländliche Außenbereiche, Stadt- und Industrieumgebung, Küstennähe oder stark aggressive Atmosphären stellen unterschiedliche Anforderungen an Zinkschicht, Nachbehandlung oder zusätzliche Beschichtung. Bei höheren Anforderungen kann ein <strong>Duplex-System</strong> sinnvoll sein, also Feuerverzinken mit zusätzlicher Nass- oder Pulverbeschichtung. Für das Ergebnis bedeutet das: Der Auftraggeber sollte angeben, ob das Teil innen, außen, in Industrieumgebung, in Küstennähe oder unter besonders korrosiver Belastung eingesetzt wird.<br><br>Beim <strong>galvanischen Verzinken</strong> wird Zink <strong>elektrochemisch</strong> in einem Zinkbad aufgebracht. Das Verfahren erzeugt eine <strong>dünne Zinkschicht</strong>, die vor allem für Anwendungen mit <span class='highlight'>hoher Maßgenauigkeit</span> und <span class='highlight'>ästhetischen Anforderungen</span> geeignet ist. Es bietet einen guten Korrosionsschutz, ist aber <strong>weniger widerstandsfähig</strong> gegenüber mechanischen Belastungen als andere Verfahren.<br><br>Beim <strong>Lamellenverzinken</strong> wird eine <strong>Zink-Aluminium-Lamellenschicht</strong> aufgetragen, die besonders <strong>korrosionsbeständig</strong> ist. Es eignet sich für <strong>kleine oder komplex geformte Bauteile</strong> wie <span class='highlight'>Schrauben</span> und ist besonders in der <strong>Automobilindustrie</strong> und im <strong>Maschinenbau</strong> verbreitet. Die Beschichtung ist <span class='highlight'>dünn</span>, haftet jedoch hervorragend, selbst an Bauteilen mit <strong>Gewinden</strong>. Die <strong>mechanische Belastbarkeit</strong> ist jedoch begrenzt.<br><br>Beim <strong>mechanischen Verzinken</strong> wird durch <span class='highlight'>mechanische Energie</span> auf die Werkstücke aufgetragen. Es eignet sich vor allem für <strong>kleine Bauteile</strong> wie <span class='highlight'>Schrauben</span> und <span class='highlight'>Nägel</span>. Die Zinkschicht wird durch <strong>Glasperlen</strong> und <strong>Zinkpulver</strong> aufgebracht und bietet <strong>zuverlässigen Korrosionsschutz</strong>. Das Verfahren ist <strong>umweltfreundlich</strong>, da keine chemischen Reaktionen erforderlich sind, ist jedoch für <strong>große Bauteile weniger geeignet</strong>.<br><br><br><br><strong>Das Entzinken</strong> ist der Prozess, bei dem eine <span class='highlight'>Zinkbeschichtung</span> von einem Werkstück entfernt wird, um es wieder in seinen ursprünglichen Zustand zu versetzen oder für eine weitere Behandlung vorzubereiten. Es gibt verschiedene Methoden, die je nach Art der Zinkschicht und den Anforderungen des Werkstücks eingesetzt werden können:<br><br><strong>Mechanisches Entzinken:</strong> Hierbei wird die Zinkschicht durch <strong>Schleifen</strong>, <strong>Strahlen</strong> oder <strong>Bürsten</strong> mechanisch entfernt. Diese Methode eignet sich besonders für <span class='highlight'>Bauteile mit dünnen Zinkschichten</span> und ist <strong>umweltfreundlich</strong>, da keine chemischen Substanzen verwendet werden. Sie ist jedoch <strong>arbeitsintensiv</strong> und nicht immer für <strong>komplex geformte Teile</strong> geeignet.<br><br><strong>Chemisches Entzinken:</strong> In dieser Methode wird die Zinkschicht durch <strong>chemische Reaktionen</strong> mit Säuren oder speziellen Lösungsmitteln entfernt. Häufig werden <strong>Salzsäure</strong> oder <strong>Schwefelsäure</strong> verwendet, die die Zinkschicht auflösen, ohne das darunterliegende Material zu beschädigen. Dies ist eine <span class='highlight'>effiziente Methode</span>, besonders für <strong>große Mengen von Bauteilen</strong>, jedoch kann die chemische Behandlung das Material beanspruchen und erfordert eine <strong>sorgfältige Handhabung</strong> der Chemikalien.<br><br><strong>Thermisches Entzinken:</strong> Bei dieser Methode wird die Zinkschicht durch <strong>hohe Temperaturen</strong> entfernt. Das Zink wird durch Erwärmen auf Temperaturen über dem <span class='highlight'>Schmelzpunkt</span> (etwa 420°C) verflüssigt und kann dann abgewaschen oder abgezogen werden. Diese Methode wird <strong>seltener angewendet</strong>, ist jedoch effektiv bei <strong>dickeren Zinkschichten</strong>.",

    "<strong>Verzinnen</strong> ist der Prozess, bei dem eine Schicht Zinn auf die Oberfläche eines Werkstücks aufgebracht wird, um es vor Korrosion zu schützen oder die Lötfähigkeit zu verbessern. Es wird häufig auf Metalle wie Stahl, Kupfer und Messing angewendet und bietet sowohl ästhetische Vorteile als auch eine verbesserte Widerstandsfähigkeit gegenüber Umwelteinflüssen.<br><br><strong>Das am häufigsten angewendete Verfahren ist das galvanische Verzinnen.</strong> Dabei wird das Werkstück in ein elektrolytisches Bad getaucht, das Zinnsalze enthält. Durch Anlegen eines elektrischen Stroms wird das Zinn an der Oberfläche des Werkstücks abgeschieden. Dieses Verfahren ermöglicht eine präzise und gleichmäßige Schichtdicke und ist besonders für Bauteile mit komplexen Geometrien geeignet. Das galvanische Verzinnen wird vor allem in der Elektronikindustrie für Leiterplatten und Bauteile genutzt, aber auch in der Lebensmittelindustrie für Konservendosen und in der Maschinenbauindustrie für Bauteile, die Korrosion ausgesetzt sind.<br><br><strong>Ein weiteres gängiges Verfahren ist das Feuerverzinnen,</strong> bei dem das Werkstück in ein Bad aus geschmolzenem Zinn getaucht wird, das sich bei etwa 450°C befindet. Vor dem Eintauchen muss das Werkstück gründlich gereinigt werden, um Öl, Fett und Rost zu entfernen. Sobald das Werkstück in das Zinnbad getaucht wird, bildet sich eine Zink-Eisen-Legierung, die eine starke und langlebige Schutzschicht gegen Korrosion bietet. Feuerverzinnen wird häufig in der Bauindustrie für Stahlkonstruktionen, Rohre und Zäune sowie in der Automobilindustrie für Unterbodenschutz und korrosionsanfällige Bauteile verwendet.<br><br><strong>Das Spritzverzinnen</strong> ist eine weitere Methode, bei der Zinn in einem Brenner erhitzt und als Sprühnebel auf das Werkstück aufgebracht wird. Dies ist besonders nützlich für große oder komplexe Bauteile, die nicht in ein Zinnbad getaucht werden können. Das Verfahren ist direkt vor Ort anwendbar und ermöglicht eine flexible, schnelle und kostengünstige Verzinnung, ohne dass spezielle Anlagen erforderlich sind. Es wird häufig in der Bauindustrie und im Maschinenbau eingesetzt, um große Bauteile vor Ort zu verzinnen.<br><br><strong>Weiters gibt es noch das Vakuum-Verzinnen,</strong> auch als PVD-Verfahren bekannt, welches jedoch seltener Anwendung findet.<br><br><strong>Relevante Anforderungen:</strong><br>Beim Verzinnen sind häufig Schichtdicke, Korrosionsbeständigkeit, Lötfähigkeit, Haftung, Optik, Kontaktierstellen, Prüfzeugnisse und kundenspezifische Vorgaben entscheidend. Je nach Branche können außerdem Qualitäts- und Umweltmanagementsysteme des Betriebs, z. B. <strong>ISO 9001</strong> oder <strong>ISO 14001</strong>, relevant sein. Für das Beschichtungsergebnis bedeutet das: Die gewünschte Funktion, z. B. Lötbarkeit, Korrosionsschutz oder elektrische Eigenschaften, sollte klar beschrieben werden, weil Schichtdicke, Kontaktierung und Nachbehandlung das Ergebnis sichtbar und technisch beeinflussen können.<br><br><strong>Verzinnen bietet zahlreiche Vorteile,</strong> darunter eine hohe Korrosionsbeständigkeit, insbesondere in feuchter Umgebung oder bei chemischen Angriffen, sowie die Verbesserung der Lötbarkeit von Bauteilen. Es ist eine kostengünstige Möglichkeit, die Lebensdauer von Bauteilen zu verlängern und ihre Widerstandsfähigkeit gegenüber Umwelteinflüssen zu erhöhen. Auch die ästhetischen Aspekte spielen eine Rolle, da verzinnte Oberflächen häufig eine glänzende, attraktive Erscheinung haben. Allerdings gibt es auch Nachteile, insbesondere in Bezug auf die Schichtdicke, die bei Verfahren wie dem galvanischen Verzinnen begrenzt sein kann. In diesen Fällen ist Feuerverzinnen die bevorzugte Methode, da es dickere und widerstandsfähigere Schichten liefert.<br><br><strong>Entzinnen</strong> ist der Prozess, bei dem die Zinnbeschichtung von einem Werkstück entfernt wird, um das ursprüngliche Material freizulegen oder es für eine weitere Bearbeitung vorzubereiten. Es wird häufig durchgeführt, wenn eine Zinnschicht beschädigt, abgenutzt oder nicht mehr benötigt wird, oder wenn das Werkstück für eine neue Beschichtung oder Oberflächenbehandlung vorbereitet werden muss.<br><br><strong>Ein häufig verwendetes Verfahren ist das chemische Entzinnen,</strong> bei dem das Werkstück in eine Lösung aus Säuren oder speziellen Chemikalien getaucht wird, die das Zinn auflösen. Salpetersäure oder Schwefelsäure werden häufig verwendet, um die Zinnschicht zu entfernen. Dieser Prozess wird in der Regel in der Elektronikindustrie angewendet, wenn Leiterplatten oder andere Bauteile gereinigt und von Zinnbefleckungen befreit werden müssen.<br><br><strong>Das mechanische Entzinnen</strong> wird in der Regel angewendet, wenn das Werkstück nicht in eine chemische Lösung getaucht werden kann oder eine präzisere Bearbeitung erforderlich ist. Hierbei wird die Zinnschicht durch Schleifen, Bürsten oder Strahlen entfernt. Diese Methode wird häufig verwendet, um kleinere Bauteile oder Bauteile mit empfindlichen Geometrien zu reinigen, bei denen eine chemische Behandlung möglicherweise nicht möglich ist.<br><br><strong>Ein weiteres Verfahren ist das elektrolytische Entzinnen,</strong> das ähnlich wie galvanisches Verzinnen funktioniert, jedoch mit dem Ziel, das Zinn von der Oberfläche abzutragen. Dabei wird das Werkstück in ein Bad getaucht, das Zinnionen enthält. Durch Anlegen eines elektrischen Stroms wird das Zinn von der Oberfläche abgelöst und in die Lösung zurückgeführt. Entzinnen wird hauptsächlich verwendet, um Bauteile, die mit Zinn beschichtet wurden, wieder für eine andere Behandlung oder für die Wiederverwendung vorzubereiten. In der Elektronikindustrie wird es eingesetzt, um beschädigte oder überschüssige Zinnbeschichtungen von Leiterplatten oder Bauteilen zu entfernen, um eine saubere Oberfläche für Reparaturen oder eine neue Beschichtung zu gewährleisten.<br><br><strong>Ein wesentlicher Vorteil des Entzinnens</strong> ist, dass es die Wiederverwendbarkeit von Bauteilen ermöglicht, die mit Zinn beschichtet wurden. Dies spart Materialkosten und trägt zur Nachhaltigkeit bei. Darüber hinaus stellt es sicher, dass die Werkstücke vor einer erneuten Bearbeitung oder Beschichtung sauber und frei von Zinnrückständen sind. Besonders bei mechanischem Entzinnen kann das Verfahren sehr präzise durchgeführt werden, wodurch die Zinnschicht ohne Beschädigung des darunterliegenden Materials entfernt wird.<br><br><strong>Ein weiterer Vorteil von Entzinnen</strong> ist, dass es eine wichtige Rolle bei der Reinigung von Bauteilen spielt. In der Elektronikindustrie wird das Verfahren oft angewendet, um überschüssiges oder beschädigtes Zinn von Leiterplatten zu entfernen, um so eine saubere Grundlage für Reparaturen oder eine neue Beschichtung zu schaffen. In vielen Fällen ermöglicht es eine effiziente Vorbereitung von Bauteilen für eine weitere Bearbeitung.<br><br><strong>Jedoch gibt es auch einige Nachteile.</strong> Bei unsachgemäßer Anwendung, insbesondere beim chemischen Entzinnen, kann das darunterliegende Material angegriffen oder beschädigt werden. Dies erfordert eine präzise Kontrolle des Prozesses, um eine unerwünschte Materialbeschädigung zu vermeiden. Ein weiterer Nachteil ist, dass chemisches Entzinnen oft teuer sein kann, da spezielle Chemikalien und eine kontrollierte Prozessführung erforderlich sind. Schließlich kann das mechanische Entzinnen, insbesondere bei großen oder komplexen Bauteilen, schwieriger sein, da die Zinnschicht nicht immer gleichmäßig und ohne Kratzer entfernt werden kann.",

    "<strong>Aluminieren</strong> ist ein Verfahren, bei dem eine Aluminiumschicht auf die Oberfläche eines Werkstücks aufgebracht wird, um die Korrosionsbeständigkeit zu erhöhen und die thermischen sowie mechanischen Eigenschaften zu verbessern. Dies wird oft auf Stahl, Eisen und andere Metalle angewendet, um deren Widerstandsfähigkeit gegen hohe Temperaturen, Abrieb und chemische Angriffe zu steigern.<br><br><strong>Beim Schmelztauchaluminieren</strong> wird das gereinigte Werkstück direkt in ein flüssiges Aluminium‑ oder Aluminium‑Silizium‑Bad getaucht. Typische Temperaturbereiche liegen zwischen 700 °C und 760 °C. Durch den direkten Kontakt diffundieren Aluminium- und Siliziumatome in die Oberfläche des Grundmetalls, während gleichzeitig Stahl- oder Eisenteilchen in das flüssige Bad gelangen. An der Grenzfläche bildet sich so eine mikrostrukturell vorgereinigte, metallurgisch gebundene Intermetallisch‑Schicht (vor allem Fe₂Al₅ und FeAl₃), typischerweise 50 µm bis 200 µm dick. Vorteile dieses Verfahrens sind eine gleichmäßige und dichte Schicht, dichte Korrosions- und Hitzebeständigkeit bereits nach kurzer Eintauchdauer, gut für großflächige oder seriengefertigte Bauteile. Nachteile sind der hohe Materialverbrauch der Aluminiumbads, aufwändige Badpflege (Abzug von Stahlablagerungen), nicht ideal für sehr komplexe Innengeometrien.<br><br><strong>Ein weiteres Verfahren ist das Spritzaluminieren,</strong> bei dem Aluminium durch einen Brenner oder Lichtbogen erhitzt wird und als Sprühnebel auf das Werkstück aufgebracht wird. Diese Methode ist besonders nützlich für große oder komplex geformte Bauteile, die nicht in ein Aluminierungsbad getaucht werden können. Das Spritzaluminieren ist weniger präzise und führt zu einer ungleichmäßigen Schichtdicke, was in einigen Fällen problematisch sein kann.<br><br><strong>Feueraluminieren</strong>, auch Packaluminieren genannt, ist ein Feststoff‑Diffusionsverfahren. Das Werkstück wird in einem dicht verschlossenen Behälter („Pack“) aus Aluminiumpulver, Aktivatoren (z. B. Ammoniumchlorid) und Inertstoffen (z. B. Aluminiumoxid) eingebettet. Bei Temperaturen von 700 °C bis 1000 °C reagiert das Aktivatorsalz und setzt Aluminium‑Gasteilchen frei, die in die Oberfläche des Bauteils diffundieren. Dort entsteht in Abhängigkeit von Prozessparameter (Temperatur, Zeit, Pack‑Zusammensetzung) eine Eisen‑Aluminium‑Legierungsschicht (vor allem Fe₂Al₅ und FeAl₃) mit einer typischen Dicke von 10 µm bis 50 µm. Vorteile sind der geringe Verbrauch von Ausgangsaluminium, exakte Steuerung der Schichtdicke durch Pack-Zusatz und Haltezeit, gute Haftfestigkeitauch auf komplizierten Bauteilformen. Nachteile sind die längere Prozessdauer, hohe Ofentemperaturen und spezielle Ausrüstung welche notwendig ist und Herausforderungen bei sehr großen Werkstücken durch homogene Pack-Verteilung.<br><br><strong>Entaluminieren</strong> ist der Prozess, bei dem eine Aluminiumschicht von einem Werkstück entfernt wird, um das ursprüngliche Material freizulegen oder es für eine weitere Bearbeitung vorzubereiten. Dies wird oft angewendet, wenn die Aluminiumbeschichtung beschädigt oder nicht mehr erforderlich ist oder wenn das Werkstück für eine neue Oberflächenbehandlung vorbereitet werden soll.<br><br><strong>Ein gängiges Verfahren des Entaluminierens</strong> ist das chemische Entaluminieren, bei dem das Werkstück in eine Lösung aus Säuren oder speziellen Chemikalien getaucht wird, die das Aluminium von der Oberfläche auflösen. In der Regel werden Natronlauge (NaOH) oder Salzsäure (HCl) verwendet, um das Aluminium zu entfernen. Dieser Prozess ist besonders effektiv, wenn eine gleichmäßige Entfernung der Aluminiumschicht erforderlich ist.<br><br><strong>Ein weiteres Verfahren ist das mechanische Entaluminieren,</strong> bei dem die Aluminiumschicht durch Schleifen, Bürsten oder Strahlen entfernt wird. Diese Methode wird häufig verwendet, wenn das Werkstück nicht in eine chemische Lösung getaucht werden kann oder eine präzise Bearbeitung erforderlich ist. Mechanisches Entaluminieren eignet sich gut für kleinere Bauteile oder Bauteile mit komplexen Geometrien, die chemisch schwer zu behandeln sind.<br><br><strong>Das elektrolytische Entaluminieren</strong> ist eine weniger häufig angewandte Methode, bei der das Werkstück in eine Lösung getaucht wird, die Aluminiumionen enthält, und ein elektrischer Strom angelegt wird, um die Aluminiumschicht abzutragen. Diese Methode wird hauptsächlich in spezialisierten Anwendungen eingesetzt, wenn eine genaue Kontrolle über die Entfernung der Aluminiumschicht erforderlich ist.<br><br><strong>Relevante Anforderungen:</strong><br>Beim Aluminieren sind häufig Schichtdicke, Temperaturbeständigkeit, Korrosionsbeständigkeit, Haftung, Materialverträglichkeit und kundenspezifische Vorgaben entscheidend. Je nach Branche können Prüfzeugnisse, Werkstoffvorgaben sowie Qualitäts- und Umweltmanagementsysteme wie <strong>ISO 9001</strong> oder <strong>ISO 14001</strong> relevant sein. Für das Beschichtungsergebnis bedeutet das: Die Aluminiumschicht muss zum späteren Einsatz passen, z. B. bei hoher Temperatur, Korrosionsbelastung oder funktionellen Anforderungen. Deshalb sollten Einsatztemperatur, Umgebung und gewünschte Schutzwirkung vorab angegeben werden.<br><br><strong>Entaluminieren wird in der Regel durchgeführt,</strong> um Bauteile für eine erneute Bearbeitung oder Beschichtung vorzubereiten. In der Luft- und Raumfahrtindustrie kann es beispielsweise erforderlich sein, Aluminiumbeschichtungen zu entfernen, um das darunterliegende Material zu reparieren oder eine neue Beschichtung anzubringen.<br><br><strong>Das Entaluminieren ermöglicht die Wiederverwendung</strong> von Bauteilen, die mit Aluminium beschichtet wurden, und spart somit Materialkosten. Es stellt auch sicher, dass die Werkstücke für eine neue Bearbeitung oder Beschichtung sauber sind, was insbesondere für die Qualität der Endprodukte wichtig ist.<br><br><strong>Ein Nachteil des chemischen Entaluminierens</strong> ist, dass die Chemikalien das darunterliegende Material beeinträchtigen oder angreifen können, insbesondere wenn der Prozess nicht richtig kontrolliert wird. Das mechanische Entaluminieren erfordert oft viel manuelle Arbeit und kann zu einer ungleichmäßigen Entfernung der Schicht führen, insbesondere bei komplexeren Geometrien. In einigen Fällen kann auch das Entfernen von großen Aluminiumflächen sehr zeitaufwendig und teuer sein.",

    "<strong>Vernickeln</strong> bezeichnet den Prozess, bei dem eine dünne Schicht Nickel auf die Oberfläche eines Metallbauteils aufgebracht wird, um es vor Korrosion zu schützen, die Haltbarkeit zu verbessern oder die Optik zu verschönern. Nickel kann auf verschiedene Weisen aufgebracht werden:<br><br><strong>Galvanisches Vernickeln:</strong> Dies ist der häufigste Prozess, bei dem das Werkstück in ein elektrolytisches Bad aus Nickel und einem anderen chemischen Zusatzstoff getaucht wird. Durch Anlegen eines elektrischen Stroms wird das Nickel an der Oberfläche des Werkstücks abgeschieden. Diese Methode ist präzise und ermöglicht das Vernickeln von Bauteilen mit komplexen Formen und feinen Details.<br><br><strong>Chemisches Vernickeln:</strong> Bei diesem Verfahren wird Nickel durch eine chemische Reaktion auf die Werkstückoberfläche abgelagert, ohne dass ein elektrischer Strom erforderlich ist. Stattdessen wird das Werkstück in eine Lösung getaucht, die Nickelionen enthält, die durch eine katalytische Reaktion an der Oberfläche des Werkstücks abgeschieden werden. Das chemische Vernickeln ist besonders geeignet für Bauteile mit komplexen Geometrien oder unregelmäßigen Oberflächen und sorgt für eine gleichmäßige Beschichtung ohne Strom.<br><br><strong>Darüber hinaus</strong> gibt es das Spritzvernickeln und das Vakuum-Vernickeln (PVD), welche jedoch viel seltener Anwendung finden.<br><br><strong>Relevante Anforderungen:</strong><br>Beim Vernickeln sind häufig Schichtdicke, Korrosionsprüfung, Haftung, Verschleißbeständigkeit, Optik, Kontaktierstellen, Prüfzeugnisse und kundenspezifische Normen entscheidend. Je nach Einsatzbereich können auch Anforderungen an Dokumentation, Rückverfolgbarkeit sowie Qualitäts- und Umweltmanagementsysteme des Betriebs, z. B. <strong>ISO 9001</strong> oder <strong>ISO 14001</strong>, relevant sein. Für das Beschichtungsergebnis bedeutet das: Je nach geforderter Funktion kann die Nickelschicht eher dekorativ, korrosionsschützend, verschleißfest oder technisch funktional ausgelegt werden. Kontaktierstellen, Schichtdicke und Prüfanforderungen sollten daher vorab definiert werden.<br><br><strong>Das Entnickeln</strong> ist der Prozess, bei dem die Nickelschicht von einem Werkstück entfernt wird. Dies kann notwendig sein, wenn die Nickelbeschichtung beschädigt, abgenutzt oder nicht mehr benötigt wird. Es gibt verschiedene Methoden des Entnickelns:<br><br><strong>Chemisches Entnickeln:</strong> Die Nickelschicht wird durch den Einsatz von Säuren, wie etwa Salpetersäure oder Schwefelsäure, entfernt. Die chemische Behandlung löst das Nickel von der Oberfläche, ohne das darunterliegende Material zu beschädigen. Diese Methode ist effektiv und kann auch für größere Bauteile angewendet werden.<br><br><strong>Elektrolytisches Entnickeln:</strong> Diese Methode funktioniert ähnlich wie das galvanische Vernickeln, allerdings wird der Elektrolytprozess so angepasst, dass das Nickel von der Oberfläche abgezogen wird. Die Werkstücke werden in eine Lösung getaucht, und durch Anlegen eines Stroms wird das Nickel entfernt.<br><br><strong>Mechanisches Entnickeln:</strong> Hierbei wird die Nickelschicht durch Schleifen, Bürsten oder Strahlen entfernt. Diese Methode eignet sich für kleinere Bauteile oder wenn eine präzise Bearbeitung erforderlich ist. Es kann jedoch das darunterliegende Material beschädigen, wenn nicht vorsichtig vorgegangen wird.",

    "Das Entlacken ist ein Verfahren zum Entfernen von alten Lackschichten. Je nachdem, welcher Werkstoff und welche Beschichtung eingesetzt wurden, stehen verschiedene Verfahren und Mittel zur Verfügung. Entscheidend für den Kunden oder Dienstleister ist, wie die gewünschte Qualität am günstigsten erreicht werden kann. Beim Entlacken kann <strong>QUALISTRIP</strong> als Qualitätslabel relevant sein. Es dient als Hinweis darauf, dass ein Entlackungsbetrieb nach definierten Anforderungen arbeitet. Für das Ergebnis bedeutet das: Die alte Beschichtung soll kontrolliert entfernt werden, ohne das Grundmaterial unnötig zu beschädigen. Wichtig sind außerdem Angaben zur gewünschten Oberflächenqualität nach dem Entlacken, zur Weiterbeschichtung, zum Materialschutz und dazu, ob das Werkstück nach dem Entlacken erneut beschichtet, geprüft oder dokumentiert werden soll. Ziel beim Entlacken ist es, wieder eine beschichtungsfähige Oberfläche zu erhalten. Entlackungsmethoden lassen sich unterteilen in chemische, thermische und mechanische Entlackung. Es sind jeweils unterschiedliche Varianten im Einsatz mit unterschiedlichem Ergebnis.<br><br><strong>Typische Entlackungsmethoden:</strong><ul><li><strong>Chemische Entlackung:</strong> Einsatz von Lösemitteln oder alkalischen/sauren Medien zum Auflösen der Lackschicht. Besonders geeignet für komplexe Bauteile und temperaturempfindliche Werkstoffe.</li><li><strong>Thermische Entlackung:</strong> Hier wird der Lack durch Hitzeeinwirkung verbrannt oder pyrolysiert. Dazu zählen Verfahren wie das Pyrolyseofen-Verfahren oder die Infrarotentlackung.</li><li><strong>Mechanische Entlackung:</strong> Die Beschichtung wird durch Schleifen, Bürsten oder Strahlen abgetragen. Diese Methode ist besonders präzise, aber aufwendiger und nicht für jede Geometrie bzw. Materialgüte und -dicke geeignet.</li><li><strong>Kombinierte Verfahren:</strong> Kombination aus z. B. thermischer und chemischer Entlackung zur effektiveren und schonenderen Bearbeitung.</li></ul><br>Je nach Material, Geometrie und Beschichtungsart kann die geeignete Entlackungsmethode gewählt werden, um eine saubere, beschädigungsfreie Oberfläche für eine neue Beschichtung zu erzielen.",

    "Beim Strahlen wird ein Strahlmittel mit hoher Geschwindigkeit (bis zu 160 m/s) auf die Oberfläche eines Werkstücks gelenkt. Je nach Ziel des Verfahrens kann dies entweder zu einem Materialabtrag führen – beispielsweise zum Entfernen von Rost oder Lackschichten – oder zur schonenden Reinigung von Fett- und Ölfilmen, ohne dabei das Grundmaterial zu beschädigen.<br><br><strong>Typische Anwendungsbereiche des Strahlens</strong><ul><li><strong>Glätten und Polieren:</strong> Reduzierung von Bearbeitungsspuren für eine homogenere Oberfläche</li><li><strong>Putzen:</strong> Reinigung von Gussteilen zur Entfernung von Formsand oder anderen Rückständen</li><li><strong>Aufrauen:</strong> Verbesserung der Haftung für nachfolgende Lackierungen oder Beschichtungen</li><li><strong>Entgraten und Verrunden:</strong> Beseitigung von scharfen Schnittgraten nach der Bearbeitung</li><li><strong>Umformen:</strong> Anpassung von Metallstrukturen, etwa zur Herstellung gewölbter Bauteile</li><li><strong>Entzundern:</strong> Beseitigung von Oxidschichten nach dem Schmieden oder Schweißen</li><li><strong>Reinigung:</strong> Entfetten, Entfernen von Formrückständen oder Kokillenreinigung</li><li><strong>Mattieren:</strong> Vorbereitung für galvanische oder andere metallische Überzüge</li><li><strong>Materialabtrag:</strong> Entfernen von Rost, Lack oder anderen Beschichtungen</li></ul><br><strong>Häufig eingesetzte Strahlmittel:</strong><ul><li>Organische Strahlmittel: Kunststoffgranulat, zermahlene Nussschalen</li><li>Mineralische Strahlmittel: Granatsand, Korund, Schmirgel, Hochofenschlacke, Kalk</li><li>Metallische Strahlmittel: Stahlkies, Stahlkugeln, Drahtkorn, Bronzekies</li><li>Glasbasierte Strahlmittel: Glasperlen, Glasbruch</li><li>Keramische Strahlmittel</li><li>Trockeneis</li></ul><br><strong>Strahltechniken:</strong><ul><li>Druckluftstrahlen: Hoher Materialabtrag</li><li>Niedrigdruckstrahlen: Schonender für empfindliche Oberflächen</li><li>Hochdruckwasserstrahlen: Materialschonend, entfernt weiche Beläge</li><li>Verdichtungsstrahlen: Verfestigung und Verbesserung mechanischer Eigenschaften</li><li>Vakuum-Saugstrahlen: Staubfrei, ideal für empfindliche Oberflächen</li></ul><br>Durch die Wahl des richtigen Strahlverfahrens und des passenden Strahlmittels lassen sich unterschiedlichste Anforderungen an die Oberflächenbearbeitung effizient erfüllen.<br><br><strong>Relevante Anforderungen:</strong><br>Beim Strahlen sind vor allem der gewünschte Reinheitsgrad, die Oberflächenrauheit, das Strahlmittel und die spätere Weiterbeschichtung wichtig. Je nach Auftrag können Vorgaben wie <strong>ISO 8501</strong> für den Oberflächenvorbereitungsgrad oder Anforderungen an Rauheit und Dokumentation relevant sein. Für das Beschichtungsergebnis bedeutet das: Die gestrahlte Oberfläche muss zur geplanten Beschichtung passen. Wird zu stark, zu schwach oder mit ungeeignetem Strahlmittel gestrahlt, kann das Haftung, Optik, Korrosionsschutz oder Maßhaltigkeit beeinflussen.",

    "<strong>Industrielles Folieren</strong> ist ein automatisierter Prozess bei dem Folien auf verschiedene Materialien wie Metall, Kunststoff, Holz oder Glas aufgebracht werden. Ziel ist es, diese zu schützen, zu dekorieren oder ihre funktionalen Eigenschaften zu verbessern. Dieser Prozess wird großflächig in Fertigungsanlagen durchgeführt und kommt in vielen Branchen zum Einsatz, darunter Bauwesen, Automobilindustrie, Verpackungsbranche und Möbelproduktion.<br><br>Zum Schutz empfindlicher Oberflächen wie Glas, Edelstahl oder lackierter Metalle werden spezielle Schutzfolien verwendet. Diese verhindern Kratzer, Schmutzablagerungen und Korrosion. Dekorative Folien finden Anwendung bei Möbeln, Türen oder Paneelen, um optische Effekte wie Holzimitationen oder Metalloberflächen zu erzielen.<br><br>In funktionalen Bereichen können die Folien Eigenschaften wie Hitzebeständigkeit, elektrische Isolierung oder Chemikalienbeständigkeit bieten, was besonders in der Elektroindustrie von Bedeutung ist. Verpackungsfolien wiederum schützen Produkte während des Transports oder verlängern deren Haltbarkeit, wie es beispielsweise bei Lebensmitteln der Fall ist. In der Automobilindustrie wird Folieren genutzt, um Fahrzeugteile zu schützen oder zu gestalten, etwa durch Carbon-Look-Folien.<br><br>Vor dem Aufbringen der Folie wird die Oberfläche gründlich gereinigt und vorbereitet. Anschließend wird die Folie durch Maschinen mit Hilfe von Wärme, Druck oder speziellen Klebstoffen dauerhaft fixiert. Industriegerechte Anlagen, wie Kaschieranlagen oder Vakuumpressen, sorgen dabei für eine gleichmäßige und präzise Anwendung.<br><br>Das industrielle Folieren ist ein effizientes, flexibles und kostengünstiges Verfahren, das nicht nur die Oberfläche schützt, sondern auch vielfältige Gestaltungsmöglichkeiten bietet. Es ermöglicht die Veredelung verschiedenster Materialien und wird in zahlreichen Bereichen erfolgreich eingesetzt.",

    "<strong>Die Isoliersteg-Verpressung</strong>, auch bekannt als Isolierverbund oder thermische Trennung, ist ein Verfahren, bei dem zwei Aluminiumprofile über einen Kunststoffsteg miteinander verbunden und unter Druck verpresst werden. Dieser Prozess findet vor allem Anwendung im Fenster-, Türen- und Fassadenbau, um Aluminiumprofile thermisch zu trennen. Ziel ist es, die Wärmedämmung zu verbessern und den Wärmefluss zwischen der Innen- und Außenseite des Profils zu verringern.<br><br>In diesem Verfahren wird ein speziell geformter Isoliersteg aus einem wärmedämmenden Kunststoff, meist Polyamid, in die vorgesehenen Kammern der beiden Aluminiumprofile eingelegt. Anschließend werden die Profile und der Isoliersteg in einer Verpressmaschine unter hohem Druck zusammengepresst. Dabei verformt sich das Aluminium leicht und umschließt den Kunststoffsteg, was eine stabile mechanische Verbindung erzeugt.<br><br>Nach dem Verpressen bleibt die Verbindung stabil, und die Profile bleiben thermisch voneinander getrennt, ohne die mechanische Stabilität zu beeinträchtigen. Zu den Vorteilen dieses Verfahrens zählen eine verbesserte Wärmedämmung, die Aufrechterhaltung der Stabilität und die Vielseitigkeit des Verfahrens, da unterschiedliche Profildesigns und Farben realisiert werden können."
  ];


  const containerHeadings = [
    legacyContainerHeadings[0],
    legacyContainerHeadings[1],
    "Nasslackieren",
    "Pulverbeschichten",
    "Verzinken",
    "Eloxieren",
    "Anodisieren",
    "KTL-Beschichten",
    "Zinkphosphatieren",
    "Strahlen",
    "Entlacken",
    "Brünieren",
    "Verzinnen",
    "Aluminieren",
    "Vernickeln",
    "Aluminium-Passivieren",
    "Elektropolieren",
    "Verchromen",
    "Vermessingen",
    "Verkupfern",
    "Vergolden",
    "Folieren",
    "Isolierstegverpressen",
    "Einlagern",
    "Entzinken",
    "Enteloxieren",
    "Entanodisieren",
    "Entzinnen",
    "Entaluminieren",
    "Entnickeln",
    "Mn-Phosphatieren",
    "Beizen",
    "Entgraten",
    "Verrunden",
    "Glätten",
    "Mattieren",
    "Schleifen",
    "Polieren",
    "Bürsten",
    "Trowalisieren",
    "Chemisches Glänzen",
    "Versilbern",
    "Lacke & Beschichtungsstoffe",
    "Lackrecycling & Restlackverwertung",
  ];

  const ktlText = `
    <strong>KTL-Beschichten</strong> steht für kathodische Tauchlackierung. Dabei wird ein elektrisch leitfähiges Werkstück vollständig in ein wasserbasiertes Lackbad eingetaucht und als Kathode geschaltet. Durch das elektrische Feld lagern sich die Lackbestandteile gleichmäßig auf der Oberfläche ab. Nach dem Spülen wird die Beschichtung eingebrannt und ausgehärtet.<br><br>
    <h4>Wann wird KTL eingesetzt?</h4>
    <ul>
      <li><strong>Korrosionsschutz:</strong> KTL wird häufig als Grundbeschichtung eingesetzt, besonders bei Stahlbauteilen und komplexen Geometrien.</li>
      <li><strong>Serienteile:</strong> Das Verfahren eignet sich besonders für wiederkehrende Stückzahlen und industrielle Serienprozesse.</li>
      <li><strong>Hohlräume und schwer zugängliche Bereiche:</strong> Durch das Tauchverfahren werden auch Bereiche erreicht, die beim reinen Spritzauftrag schwierig zu beschichten wären.</li>
      <li><strong>Mehrschichtsysteme:</strong> KTL kann als Grundierung für anschließendes Pulverbeschichten oder Nasslackieren dienen.</li>
    </ul>
    <h4>Typische Angaben für eine Anfrage</h4>
    <ul>
      <li>Werkstoff, Abmessungen, Gewicht und Stückzahl</li>
      <li>gewünschte <strong>Schichtdicke in µm</strong></li>
      <li>gewünschter Farbton: <strong>Schwarz, Grau oder andere Vorgabe</strong></li>
      <li>spätere Weiterbeschichtung und gewünschter Korrosionsschutz</li>
      <li>Bereiche, die frei von Beschichtung bleiben müssen</li>
      <li>Anforderungen an Prüfungen, Dokumentation oder Zertifizierungen</li>
    </ul>
    <h4>Relevante Qualitätsanforderungen</h4>
    Je nach Auftrag können Qualitäts- und Umweltmanagement sowie branchenspezifische Anforderungen eine Rolle spielen. Bei einer Anfrage können für KTL unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>IATF 16949</strong> sowie <strong>RoHS / REACH</strong> als Anforderungen angegeben werden.<br><br>
    <strong>Praxis-Hinweis:</strong> Für ein belastbares Angebot sollte der Beschichter wissen, ob KTL als Endoberfläche oder als Grundierung für ein weiteres Beschichtungssystem vorgesehen ist.
  `;

  const verchromenText = `
    Beim <strong>Verchromen</strong> wird eine Chromschicht auf ein metallisches Werkstück aufgebracht. Je nach Ziel kann die Schicht vor allem dekorative Eigenschaften liefern oder gezielt technische Funktionen wie Verschleißschutz, Härte oder verbesserte Gleiteigenschaften erfüllen.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    <strong>Für dekoratives Hochglanzverchromen ist die Oberflächenvorbereitung entscheidend.</strong> Chrom gleicht Schleifriefen, Kratzer oder Unebenheiten nicht aus. Sichtflächen werden deshalb je nach Ausgangszustand zunächst <strong>geschliffen und anschließend poliert</strong>. Bürsten wird vor allem eingesetzt, wenn bewusst eine satinierte oder gebürstete Optik gewünscht ist. Danach folgen die chemische Reinigung und Aktivierung sowie der galvanische Schichtaufbau.<br><br>
    <strong>Typische Kette bei Hochglanz:</strong> Schleifen → Polieren → Reinigen / Entfetten → Aktivieren → ggf. Verkupfern → Vernickeln → dekorativ Verchromen.<br><br>
    <strong>Wichtig:</strong> Bei Hartverchromen ist diese dekorative Hochglanzkette nicht grundsätzlich erforderlich. Dort stehen Funktionsmaß, Schichtdicke und eine gegebenenfalls anschließende Schleif- oder Polierbearbeitung im Vordergrund.<br><br>
    <h4>Varianten</h4>
    <ul>
      <li><strong>Glanzverchromen:</strong> dekorative, glänzende Oberfläche; häufig Teil eines mehrschichtigen galvanischen Aufbaus.</li>
      <li><strong>Mattverchromen:</strong> matte bis satinierte Optik für dekorative oder funktionelle Anwendungen.</li>
      <li><strong>Hartverchromen:</strong> technische Chromschicht für stark beanspruchte Bauteile, beispielsweise zur Erhöhung von Verschleißfestigkeit oder zur Wiederherstellung von Funktionsmaßen.</li>
    </ul>
    <h4>Typische Anwendungen</h4>
    <ul>
      <li>Maschinen- und Anlagenbau</li>
      <li>Wellen, Kolbenstangen, Walzen und Führungen</li>
      <li>Werkzeuge und verschleißbeanspruchte Funktionsflächen</li>
      <li>dekorative Metallteile und sichtbare Bauteile</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>gewünschte Ausführung: <strong>Glanz-, Matt- oder Hartverchromen</strong></li>
      <li>Werkstoff und Ausgangszustand der Oberfläche</li>
      <li>Maße, Gewicht, Stückzahl und zulässige Maßänderungen</li>
      <li>Funktions-, Pass- und Sichtflächen</li>
      <li>gewünschte Schichtdicke bzw. technische Funktion</li>
      <li>Nachbearbeitung wie Schleifen oder Polieren, falls erforderlich</li>
    </ul>
    <strong>Praxis-Hinweis:</strong> Gerade bei Hartchrom sind Maßhaltigkeit, Ausgangsmaß, spätere Bearbeitung und die tatsächlich zu beschichtenden Funktionsflächen vor Angebotsabgabe eindeutig festzulegen.
  `;

  const bruenierenText = `
    <strong>Brünieren</strong> ist eine chemische Oberflächenbehandlung für Eisenwerkstoffe, bei der eine sehr dünne dunkle Konversionsschicht erzeugt wird. Das charakteristische schwarze bis schwarzblaue Erscheinungsbild entsteht nicht durch eine dick aufgetragene Lack- oder Metallschicht, sondern durch eine gezielte Umwandlung der Werkstückoberfläche.<br><br>
    <h4>Varianten</h4>
    <ul>
      <li><strong>Heißbrünieren:</strong> industriell häufig eingesetztes Verfahren mit beheizten Prozessbädern.</li>
      <li><strong>Kaltbrünieren:</strong> Behandlung bei niedrigerer Temperatur, häufig für kleinere Bauteile, Reparaturen oder besondere Anwendungen.</li>
      <li><strong>Schwarzoxidieren:</strong> Bezeichnung für Verfahren zur Erzeugung einer schwarzen Oxidschicht auf geeigneten Eisenwerkstoffen.</li>
    </ul>
    <h4>Eigenschaften und Anwendungen</h4>
    <ul>
      <li>dunkle, technisch-dekorative Oberfläche</li>
      <li>nur geringe Veränderung der Bauteilmaße</li>
      <li>geeignet für Werkzeuge, Vorrichtungen, Verbindungselemente, Maschinenbauteile und sichtbare Metallteile</li>
      <li>Korrosionsschutz wird üblicherweise durch eine anschließende Konservierung, beispielsweise Ölen, verbessert</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Werkstoff bzw. genaue Stahlgüte</li>
      <li>gewünschtes Verfahren: <strong>Heißbrünieren, Kaltbrünieren oder Schwarzoxidieren</strong></li>
      <li>Stückzahl, Maße und Gewicht</li>
      <li>optische Anforderungen und Sichtflächen</li>
      <li>gewünschte Nachbehandlung oder Konservierung</li>
      <li>notwendige Zertifizierungen oder Dokumentationsanforderungen</li>
    </ul>
    Bei einer Anfrage können beim Brünieren unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong> als Anforderungen ausgewählt werden.<br><br>
    <strong>Praxis-Hinweis:</strong> Die genaue Stahlgüte sollte möglichst angegeben werden, weil Werkstoffzusammensetzung und Wärmebehandlungszustand das optische Ergebnis beeinflussen können.
  `;

  const nasslackierenText = `
    <strong>Nasslackieren</strong> ist ein Beschichtungsverfahren, bei dem flüssiger Lack auf ein Werkstück aufgetragen und anschließend getrocknet oder ausgehärtet wird. Das Verfahren eignet sich für dekorative, funktionelle und korrosionsschützende Beschichtungen und kann auf unterschiedlichen Werkstoffen eingesetzt werden.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Die genaue Vorbehandlung hängt von Werkstoff, Ausgangszustand und gefordertem Korrosionsschutz ab. Typisch ist: <strong>Reinigen / Entfetten → ggf. Entrosten, Strahlen, Schleifen oder chemische Vorbehandlung → Grundierung → Zwischenbeschichtung → Decklack → Trocknen / Aushärten</strong>. Nicht jeder Auftrag benötigt alle Stufen. Entscheidend ist, dass der Untergrund sauber, tragfähig und für das gewählte Lacksystem geeignet ist.<br><br>
    <h4>Auswahlmöglichkeiten in der Auftragserfassung</h4>
    <ul>
      <li><strong>Farbpalette:</strong> unter anderem RAL, NCS, DB, Pantone, Sonderfarbe / nach Vorlage oder Klarlack</li>
      <li><strong>Farbton:</strong> genaue Farbtonbezeichnung oder Artikelnummer</li>
      <li><strong>Glanzgrad:</strong> Hochglanz, Seidenglanz, Glanz, Matt, Seidenmatt oder Stumpfmatt</li>
      <li><strong>Oberfläche:</strong> glatt, Feinstruktur oder Grobstruktur</li>
      <li><strong>Effekte:</strong> Metallic oder fluoreszierend</li>
      <li><strong>Extras:</strong> zweifärbig, Duplexbeschichtung oder beigestellter Lack</li>
    </ul>
    <h4>Typische Anwendungen</h4>
    <ul>
      <li>Maschinen- und Anlagenbauteile</li>
      <li>Stahl- und Metallkonstruktionen</li>
      <li>Fahrzeug- und Gerätebauteile</li>
      <li>Bauteile mit speziellen Farb-, Optik- oder Korrosionsschutzanforderungen</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Werkstoff, Maße, Gewicht und Stückzahl</li>
      <li>Farbpalette und exakte Farbtonbezeichnung bzw. Artikelnummer</li>
      <li>gewünschter Glanzgrad und Oberflächenstruktur</li>
      <li>besondere Effekte oder Extras</li>
      <li>gewünschter Schichtaufbau, Korrosionsschutz und zu maskierende Bereiche</li>
    </ul>
    Bei einer Anfrage können unter anderem <strong>GSB</strong>, <strong>ISO 9001</strong>, <strong>ISO 12944</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong> als Anforderungen angegeben werden.
  `;

  const pulverbeschichtenText = legacyContainerTexts[3] + `
    <br><br><h4>Typische Prozesskette / Vorbehandlung</h4>
    Eine belastbare Pulverbeschichtung beginnt mit einer zum Werkstoff passenden Vorbehandlung. Typisch ist: <strong>Reinigen / Entfetten → ggf. Strahlen oder Beizen → Konversionsbehandlung bzw. geeignete Vorbehandlung → Spülen → Trocknen → Pulverbeschichten → Einbrennen</strong>. Bei verzinkten Bauteilen oder Duplexsystemen können zusätzliche abgestimmte Vorbehandlungsschritte notwendig sein.
    <br><br><h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Farbpalette, Farbtonbezeichnung bzw. Artikelnummer</li>
      <li>Glanzgrad: von Hochglanz bis Stumpfmatt</li>
      <li>Oberfläche: glatt, Feinstruktur oder Grobstruktur</li>
      <li>gewünschte Pulverlack-Qualität, z. B. Polyester, Epoxy-Polyester, Polyurethan, Thermoplast oder Qualität für Feuerverzinkung</li>
      <li>besondere Effekte, zweifärbige Ausführung oder Duplexbeschichtung</li>
      <li>Werkstoff, Bauteilabmessungen, Gewicht, Stückzahl und zu maskierende Bereiche</li>
    </ul>
    Als mögliche Anforderungen kommen unter anderem <strong>GSB</strong>, <strong>Qualicoat</strong>, <strong>Qualisteelcoat</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong>.
  `;

  const eloxierenText = `
    <strong>Eloxieren</strong> ist die elektrochemische Oxidation von Aluminium. Dabei wird die Oberfläche des Werkstücks gezielt in eine schützende Oxidschicht umgewandelt. Diese kann den Korrosionsschutz, die Härte, die Verschleißbeständigkeit und die Optik verbessern.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Das spätere Erscheinungsbild wird stark durch die mechanische und chemische Vorbehandlung bestimmt. Typisch ist: <strong>Reinigen / Entfetten → ggf. Schleifen, Bürsten oder Polieren für die gewünschte Optik → Beizen → Spülen → Neutralisieren / Dekapieren → Eloxieren → ggf. Färben → Verdichten</strong>. Für glänzende oder besonders gleichmäßige Sichtoberflächen kann zusätzlich chemisches Glänzen eingesetzt werden.<br><br>
    <h4>Farbvarianten in der Auftragserfassung</h4>
    <ul>
      <li>C-0 (Natureloxal)</li>
      <li>C-31 bis C-34 (Bronzetöne)</li>
      <li>C-35 (Schwarz)</li>
      <li>C-36 bis C-38 (Grautöne)</li>
    </ul>
    <h4>Typische Anwendungen</h4>
    <ul>
      <li>Aluminiumprofile und Fassadenbauteile</li>
      <li>Maschinen- und Präzisionsteile</li>
      <li>Sicht- und Designteile</li>
      <li>Bauteile mit Anforderungen an Korrosions- oder Verschleißschutz</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Aluminiumlegierung bzw. genaue Werkstoffangabe</li>
      <li>gewünschter Eloxalfarbton</li>
      <li>Maße, Gewicht, Stückzahl und Sichtflächen</li>
      <li>Funktionsflächen, Passungen, Gewinde und Bereiche, die frei bleiben müssen</li>
      <li>Anforderungen an Optik, Korrosionsschutz und Dokumentation</li>
    </ul>
    Als Anforderungen können unter anderem <strong>Qualanod</strong>, <strong>GSB</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>ISO 45001</strong> sowie <strong>RoHS / REACH</strong> angegeben werden.
  `;

  const verzinkenText = `
    <strong>Verzinken</strong> bezeichnet das Aufbringen einer Zinkschicht auf Stahl oder andere geeignete Eisenwerkstoffe, um insbesondere den Korrosionsschutz zu verbessern. Je nach Bauteil, Einsatzbereich und gewünschter Schichteigenschaft stehen unterschiedliche Verfahren zur Verfügung.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Die Prozesskette unterscheidet sich je nach Verzinkungsverfahren. Beim <strong>Feuerverzinken</strong> ist typisch: Entfetten → Beizen → Spülen → Flussmittelbehandlung → Trocknen → Feuerverzinken → Nachbearbeitung / Kontrolle. Beim <strong>galvanischen Verzinken</strong> ist typisch: Reinigen / Entfetten → Beizen bzw. Aktivieren → Spülen → galvanisch Verzinken → Passivieren → ggf. Versiegeln und Trocknen. Bei starkem Zunder oder besonderen Oberflächenzuständen kann eine zusätzliche mechanische Vorbehandlung erforderlich sein.<br><br>
    <h4>Unterverfahren</h4>
    <ul>
      <li><strong>Feuerverzinken:</strong> Das Werkstück wird in ein Bad aus geschmolzenem Zink getaucht. Dabei entsteht eine metallurgisch gebundene Zinkschicht mit robustem Korrosionsschutz.</li>
      <li><strong>Galvanisches Verzinken:</strong> Zink wird elektrochemisch abgeschieden. Das Verfahren eignet sich besonders für dünnere, gleichmäßige Schichten und maßhaltige Bauteile.</li>
      <li><strong>Zinklamellenbeschichtung:</strong> Zinkhaltige Lamellensysteme erzeugen dünne Korrosionsschutzschichten und werden häufig bei Verbindungselementen und geometrisch anspruchsvollen Teilen eingesetzt.</li>
      <li><strong>Mechanisches Verzinken:</strong> Zink wird mechanisch auf die Oberfläche aufgebracht. Das Verfahren wird vor allem bei kleineren Bauteilen eingesetzt.</li>
    </ul>
    <h4>Zusätzliche Angaben bei galvanischem Verzinken</h4>
    Wird <strong>Galvanisches Verzinken</strong> gewählt, können zusätzlich das Zinksystem <strong>Zink-Standard, Zink-Nickel oder Zink-Eisen</strong>, die Ausführung als <strong>Trommel- oder Gestellverfahren</strong> sowie optionale Nachbehandlungen wie <strong>Versiegelung, Gleitmittelbeschichtung oder Tempern</strong> angegeben werden. Diese Angaben sind Spezifikationen des galvanischen Verzinkens und keine zusätzlichen Unterverfahren.<br><br>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Werkstoff, Maße, Gewicht und Stückzahl</li>
      <li>gewünschtes Unterverfahren</li>
      <li>beim galvanischen Verzinken gegebenenfalls Zinksystem, Trommel-/Gestellverfahren und Nachbehandlung</li>
      <li>Funktionsflächen, Gewinde, Hohlräume und Bereiche, die frei bleiben müssen</li>
      <li>Einsatzbedingungen und gewünschter Korrosionsschutz</li>
    </ul>
    Als Anforderungen können unter anderem <strong>RAL-GZ</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong> angegeben werden.
  `;

  const vernickelnText = `
    <strong>Vernickeln</strong> bezeichnet das Aufbringen einer Nickelschicht auf ein Werkstück. Nickelschichten können dem Korrosions- und Verschleißschutz dienen, technische Oberflächeneigenschaften verbessern oder für dekorative Zwecke eingesetzt werden.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Für dekorative Nickelschichten ist die gewünschte Endoptik bereits vor dem Beschichten vorzubereiten. Je nach Ausgangszustand kann die Kette <strong>Schleifen → Polieren → Reinigen / Entfetten → Aktivieren → ggf. Verkupfern → Vernickeln</strong> umfassen. Für technische oder chemisch abgeschiedene Nickelschichten kann der mechanische Hochglanzaufbau entfallen; dort stehen Sauberkeit, Aktivierung, Maßhaltigkeit und die geforderte Funktion der Schicht im Vordergrund.<br><br>
    <h4>Unterverfahren</h4>
    <ul>
      <li><strong>Chemisch:</strong> Nickel wird durch eine chemische Reaktion ohne externen elektrischen Strom abgeschieden. Dadurch lassen sich auch komplexe Geometrien vergleichsweise gleichmäßig beschichten.</li>
      <li><strong>Galvanisch:</strong> Nickel wird elektrolytisch auf der Werkstückoberfläche abgeschieden. Das Verfahren ermöglicht definierte Schichtaufbauten und wird für technische wie dekorative Anwendungen eingesetzt.</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>gewünschtes Verfahren: chemisch oder galvanisch</li>
      <li>Werkstoff, Ausgangszustand und Geometrie</li>
      <li>Maße, Gewicht und Stückzahl</li>
      <li>optische bzw. technische Funktion der Nickelschicht</li>
      <li>Funktions-, Pass- und Sichtflächen sowie gegebenenfalls nachfolgende Beschichtungen</li>
    </ul>
    Als Anforderungen können unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>ISO 45001</strong> sowie <strong>RoHS / REACH</strong> angegeben werden.
  `;

  const entlackenText = `
    <strong>Entlacken</strong> dient dazu, vorhandene Lack- oder Beschichtungsschichten kontrolliert zu entfernen. Welches Verfahren geeignet ist, hängt insbesondere vom Grundwerkstoff, der vorhandenen Beschichtung, der Bauteilgeometrie und der geplanten Weiterbearbeitung ab.<br><br>
    <h4>Unterverfahren</h4>
    <ul>
      <li><strong>Chemisch:</strong> Die Beschichtung wird mit geeigneten chemischen Medien angelöst oder entfernt.</li>
      <li><strong>Elektrochemisch:</strong> Die Entschichtung wird durch einen elektrochemischen Prozess unterstützt.</li>
      <li><strong>Thermisch:</strong> Die Beschichtung wird durch Wärmeeinwirkung zersetzt oder abgelöst.</li>
      <li><strong>Mechanisch:</strong> Die Beschichtung wird beispielsweise durch Schleifen, Bürsten oder Strahlen abgetragen.</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Grundwerkstoff</li>
      <li>Art und Zustand der vorhandenen Beschichtung</li>
      <li>gewünschtes Entlackungsverfahren</li>
      <li>Bauteilabmessungen, Gewicht und Stückzahl</li>
      <li>empfindliche Funktionsflächen und gewünschter Zustand nach dem Entlacken</li>
      <li>geplante Weiterbehandlung</li>
    </ul>
    Als Qualitätsanforderung kann insbesondere <strong>Qualistrip</strong> relevant sein.
  `;

  const strahlenText = `
    <strong>Strahlen</strong> ist eine mechanische Oberflächenbehandlung, bei der ein Strahlmittel mit hoher Geschwindigkeit auf ein Werkstück trifft. Dadurch können Oberflächen gereinigt, aufgeraut, mattiert oder für eine nachfolgende Beschichtung vorbereitet werden.<br><br>
    <h4>Unterverfahren</h4>
    <ul>
      <li><strong>Sandstrahlen:</strong> abrasive Oberflächenbehandlung zum Reinigen, Entrosten oder Aufrauen geeigneter Werkstücke.</li>
      <li><strong>Staubstrahlen:</strong> in der Auftragserfassung als eigene Strahlvariante auswählbar.</li>
      <li><strong>Glasperlen:</strong> Behandlung mit Glasperlen, häufig zur Reinigung, Mattierung oder Erzeugung einer gleichmäßigen Oberfläche.</li>
    </ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul>
      <li>Grundwerkstoff und Ausgangszustand</li>
      <li>gewünschtes Unterverfahren</li>
      <li>Ziel der Behandlung: Reinigen, Entrosten, Aufrauen, Mattieren oder Vorbereitung für eine Folgebeschichtung</li>
      <li>Bauteilabmessungen, Gewicht und Stückzahl</li>
      <li>empfindliche Flächen, Passungen, Gewinde und Bereiche mit Maßanforderungen</li>
      <li>gewünschtes Ergebnis bzw. gewünschte Rauheit, sofern vorgegeben</li>
    </ul>
  `;


  const zinkphosphatierenText = `
    <strong>Zinkphosphatieren</strong> ist eine chemische Vorbehandlung, bei der auf Stahl- oder verzinkten Oberflächen eine feinkristalline Phosphatschicht erzeugt wird. Sie dient häufig als Haftgrund für eine nachfolgende Lackierung oder Pulverbeschichtung und kann zugleich den Korrosionsschutz des Gesamtsystems verbessern.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>Vorbehandlung vor Nasslackierung oder Pulverbeschichtung</li><li>Automobil- und Maschinenbauteile</li><li>Serienteile mit definierten Anforderungen an Lackhaftung und Korrosionsschutz</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Oberflächenzustand</li><li>gewünschtes <strong>Schichtgewicht in g/m²</strong></li><li>Nachbehandlung: <strong>keine, geölt oder versiegelt</strong></li><li>geplante Folgebehandlung oder Endbeschichtung</li><li>Stückzahl, Abmessungen und Gewicht</li></ul>
    Als zusätzliche Anforderungen können <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong> angegeben werden.<br><br>
    <strong>Praxis-Hinweis:</strong> Entscheidend ist, ob die Phosphatierung als eigenständige temporäre Schutzschicht oder als Vorbehandlung für ein späteres Beschichtungssystem vorgesehen ist.
  `;

  const verzinnenText = `
    <strong>Verzinnen</strong> bezeichnet das Aufbringen einer Zinnschicht auf ein Werkstück. Zinnschichten werden unter anderem eingesetzt, wenn Korrosionsschutz, gute Lötbarkeit oder definierte elektrische und funktionelle Eigenschaften gefragt sind.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Galvanisch:</strong> Zinn wird elektrolytisch auf der Oberfläche abgeschieden.</li><li><strong>Chemisch:</strong> Zinn wird durch eine chemische Abscheidung ohne externen Strom aufgebracht.</li></ul>
    <h4>Typische Anwendungen</h4>
    <ul><li>elektrische und elektronische Bauteile</li><li>Steck- und Kontaktteile</li><li>Bauteile mit Anforderungen an Lötbarkeit</li><li>funktionelle Oberflächen auf Kupfer, Messing oder geeigneten Stählen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff</li><li>chemisches oder galvanisches Verzinnen</li><li>gewünschte Funktion und gegebenenfalls Schichtdicke</li><li>Kontakt-, Löt- und Sichtflächen</li><li>Stückzahl, Abmessungen und Prüfanforderungen</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong> und <strong>RoHS / REACH</strong> als auswählbare Anforderungen.
  `;

  const aluminierenText = `
    <strong>Aluminieren</strong> erzeugt eine aluminiumhaltige Schutzschicht auf einem Werkstück. Je nach Verfahren wird Aluminium metallurgisch, thermisch oder durch Spritzen aufgebracht. Solche Schichten werden insbesondere eingesetzt, wenn Korrosions- oder Temperaturbeständigkeit gefordert ist.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Schmelztauchaluminieren</strong></li><li><strong>Spritzaluminieren</strong></li><li><strong>Feueraluminieren</strong></li></ul>
    <h4>Typische Anwendungen</h4>
    <ul><li>Stahlbauteile in korrosiver Umgebung</li><li>Bauteile mit erhöhter Temperaturbelastung</li><li>große oder geometrisch anspruchsvolle Werkstücke beim Spritzaluminieren</li><li>Industrie- und Anlagenbau</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und gewünschtes Verfahren</li><li>Einsatztemperatur und Umgebungsbedingungen</li><li>gewünschte Schichtdicke und Schutzwirkung</li><li>Abmessungen, Gewicht und Stückzahl</li><li>Bereiche, die nicht beschichtet werden dürfen</li></ul>
    Als Anforderungen können unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>ISO 45001</strong> sowie <strong>RoHS / REACH</strong> angegeben werden.
  `;

  const aluminiumPassivierenText = `
    Beim <strong>Aluminium-Passivieren</strong> wird die Aluminiumoberfläche chemisch behandelt, um ihre Korrosionsbeständigkeit zu verbessern oder eine geeignete Grundlage für nachfolgende Beschichtungen zu schaffen. Je nach System kann zugleich die elektrische Leitfähigkeit der Oberfläche eine Rolle spielen.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chrom(III)-Passivierung</strong></li><li><strong>Chromfreie Passivierung</strong></li></ul>
    <h4>Mögliche Anforderungen</h4>
    <ul><li>Korrosionsschutz</li><li>Lackhaftung</li><li>elektrische Leitfähigkeit</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Aluminiumlegierung</li><li>gewünschte Passivierungsart</li><li>Hauptanforderung an die Oberfläche</li><li>geplante Folgebehandlung</li><li>Stückzahl, Maße und Funktionsflächen</li></ul>
    <strong>Praxis-Hinweis:</strong> Besonders wichtig ist, ob die passivierte Oberfläche später lackiert wird oder als funktionelle Endoberfläche eingesetzt wird.
  `;

  const elektropolierenText = `
    <strong>Elektropolieren</strong> ist ein elektrochemisches Abtragsverfahren. Dabei werden mikroskopische Rauheitsspitzen bevorzugt abgetragen, wodurch die Oberfläche geglättet, gereinigt und optisch verfeinert wird. Das Verfahren wird besonders häufig bei Edelstahl eingesetzt.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>Reduzierung der Oberflächenrauheit</li><li>bessere Reinigbarkeit und hygienische Eigenschaften</li><li>Entfernung von Bearbeitungsspuren und Oberflächenverunreinigungen</li><li>gleichmäßigeres, technisch sauberes Erscheinungsbild</li></ul>
    <h4>Anwendungsbereiche</h4>
    <ul><li><strong>Lebensmittel</strong></li><li><strong>Pharma</strong></li><li><strong>Medizintechnik</strong></li><li><strong>Industrie allgemein</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Werkstoffgüte</li><li>Anwendungsbereich</li><li>Ausgangsrauheit und gewünschtes Ergebnis</li><li>Sicht- und Funktionsflächen</li><li>Bauteilgröße, Stückzahl und gegebenenfalls Dokumentationsanforderungen</li></ul>
  `;

  const vermessingenText = `
    Beim <strong>Vermessingen</strong> wird eine messingfarbene Kupfer-Zink-Schicht auf ein Werkstück aufgebracht. Das Verfahren wird vor allem für dekorative Oberflächen verwendet, kann aber auch Bestandteil eines technischen Schichtaufbaus sein.<br><br>
    <h4>Ausführungen</h4>
    <ul><li><strong>Glänzend</strong></li><li><strong>Matt</strong></li><li><strong>Antik / patiniert</strong></li></ul>
    <h4>Typische Anwendungen</h4>
    <ul><li>Beschläge und dekorative Metallteile</li><li>Möbel- und Innenausbauteile</li><li>Leuchten, Sichtteile und Designkomponenten</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff</li><li>gewünschte optische Ausführung</li><li>Sichtflächen und zulässige Farbabweichungen</li><li>Stückzahl und Abmessungen</li><li>gegebenenfalls gewünschte Schutz- oder Deckschicht</li></ul>
  `;

  const verkupfernText = `
    <strong>Verkupfern</strong> bedeutet, eine Kupferschicht auf einem Werkstück abzuscheiden. Kupfer kann als dekorative Oberfläche, als funktionelle Schicht oder als Zwischen- und Haftschicht für weitere galvanische Beschichtungen eingesetzt werden.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Galvanisch</strong></li><li><strong>Chemisch</strong></li></ul>
    <h4>Typische Anwendungen</h4>
    <ul><li>Zwischenschichten vor Vernickeln oder Verchromen</li><li>elektrisch leitfähige Oberflächen</li><li>dekorative Metallteile</li><li>Aufbau oder Ausgleich definierter Oberflächen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff</li><li>galvanische oder chemische Ausführung</li><li>Funktion der Kupferschicht</li><li>gewünschte Folgebeschichtung</li><li>Schichtdicke, Stückzahl und Funktionsflächen</li></ul>
  `;

  const vergoldenText = `
    Beim <strong>Vergolden</strong> wird eine dünne Goldschicht auf ein Bauteil aufgebracht. Gold wird sowohl wegen seiner hochwertigen Optik als auch aufgrund seiner Korrosionsbeständigkeit und guten elektrischen Eigenschaften eingesetzt.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Die Goldschicht übernimmt die vorhandene Oberflächenqualität weitgehend. Für dekorative Hochglanzteile wird deshalb typischerweise bereits vorher <strong>geschliffen und poliert</strong>. Anschließend folgen Reinigen / Entfetten, Aktivieren und – abhängig von Grundwerkstoff und Anforderung – geeignete Zwischen- oder Sperrschichten, häufig Nickel. Typisch kann die Kette lauten: <strong>Schleifen → Polieren → Reinigen / Aktivieren → ggf. Verkupfern / Vernickeln → Vergolden</strong>. Bei technischen Kontaktflächen richtet sich der Schichtaufbau dagegen stärker nach elektrischer Funktion, Diffusionssperre und Verschleißanforderung.<br><br>
    <h4>Auswahlmöglichkeiten</h4>
    <ul><li>Goldart: <strong>Reingold</strong> oder <strong>Hartgold</strong></li><li>Anwendung: <strong>dekorativ</strong> oder <strong>technisch</strong></li></ul>
    <h4>Typische Anwendungen</h4>
    <ul><li>elektrische Kontakte und Steckverbinder</li><li>Elektronik- und Präzisionsbauteile</li><li>Schmuck- und Designteile</li><li>hochwertige Sichtflächen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und vorhandene Zwischenschichten</li><li>Reingold oder Hartgold</li><li>dekorative oder technische Anwendung</li><li>Kontakt- und Funktionsflächen</li><li>gewünschte Schichtdicke sowie Stückzahl</li></ul>
  `;

  const folierenText = legacyContainerTexts[11] + `
    <br><br><h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Einsatz <strong>innen oder außen</strong></li><li>Grundmaterial und vorhandene Oberfläche</li><li>gewünschte Folienart, Optik und Funktion</li><li>Bauteilabmessungen und Stückzahl</li><li>Anforderungen an Kanten, Radien, Ausschnitte und Sichtflächen</li></ul>
    Für Folieraufträge kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>RoHS / REACH</strong> und <strong>RAL-GZ 716</strong> als mögliche Anforderungen.
  `;

  const isolierstegText = legacyContainerTexts[12] + `
    <br><br><h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Profiltyp, Zeichnung und Abmessungen</li><li>Werkstoff und Oberflächenzustand der Profile</li><li>Art und Abmessung des Isolierstegs</li><li>Stückzahl bzw. laufende Meter</li><li>Anforderungen an Prüfung, Verbundfestigkeit und Dokumentation</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong>, <strong>RoHS / REACH</strong> sowie <strong>RAL-GZ 607/3</strong> als mögliche Anforderungen.
  `;

  const einlagernText = `
    <strong>Einlagern</strong> ist als ergänzende Leistung vorgesehen, wenn Bauteile zwischen Fertigung, Beschichtung, Abruf oder Auslieferung zwischengelagert werden sollen. Dadurch kann ein Beschichtungs- oder Logistikauftrag auch dann abgewickelt werden, wenn die Teile nicht unmittelbar weitertransportiert werden.<br><br>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Menge, Abmessungen und Gewicht der einzulagernden Teile</li><li>gewünschte Lagerdauer</li><li>Verpackungszustand und Stapelbarkeit</li><li>Abruf- und Ausliefermodalitäten</li><li>besondere Lagerbedingungen</li></ul>
    Als besondere Lageranforderung kann ausdrücklich <strong>„trocken lagern“</strong> angegeben werden.<br><br>
    <strong>Praxis-Hinweis:</strong> Bei beschichteten Sichtteilen sollte zusätzlich festgelegt werden, wie Verpackung, Zwischenlagen und Handhabung erfolgen müssen, damit keine Kratzer oder Druckstellen entstehen.
  `;

  const entzinkenText = `
    <strong>Entzinken</strong> bezeichnet das gezielte Entfernen einer vorhandenen Zinkschicht. Das ist beispielsweise erforderlich, wenn ein Bauteil repariert, erneut verzinkt, anders beschichtet oder auf seinen Grundwerkstoff zurückgeführt werden soll.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Elektrochemisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und vorhandenes Zinksystem</li><li>Bauteilabmessungen und Stückzahl</li><li>gewünschter Zustand nach dem Entzinken</li><li>anschließende Weiterbehandlung</li><li>empfindliche Flächen und Maßanforderungen</li></ul>
  `;

  const enteloxierenText = `
    <strong>Enteloxieren</strong> entfernt eine vorhandene Eloxalschicht von Aluminium. Das Verfahren wird eingesetzt, wenn eine Oberfläche neu eloxiert, repariert oder für eine andere Behandlung vorbereitet werden soll.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Elektrochemisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Aluminiumlegierung</li><li>vorhandene Eloxalschicht und Farbton</li><li>gewünschter Zustand nach dem Enteloxieren</li><li>Maß- und Sichtflächen</li><li>geplante Neubeschichtung oder erneute Eloxierung</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>Qualanod</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong>.
  `;

  const entanodisierenText = `
    <strong>Entanodisieren</strong> ist das Entfernen einer anodisch erzeugten Oxidschicht, um das Grundmaterial für eine Reparatur, Nacharbeit oder neue Oberflächenbehandlung freizulegen.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Galvanisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und vorhandene anodische Schicht</li><li>gewünschtes Entschichtungsverfahren</li><li>zulässiger Materialabtrag und Maßtoleranzen</li><li>Sicht- und Funktionsflächen</li><li>geplante Folgebehandlung</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>Qualanod</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong> und <strong>RoHS / REACH</strong> als mögliche Anforderungen.
  `;

  const entzinnenText = `
    <strong>Entzinnen</strong> entfernt vorhandene Zinnschichten, beispielsweise vor Reparatur, Recycling oder einer erneuten Oberflächenbehandlung.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Elektrochemisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff</li><li>Art und Zustand der vorhandenen Zinnschicht</li><li>gewünschter Zustand nach dem Entzinnen</li><li>Bauteilabmessungen, Stückzahl und empfindliche Bereiche</li><li>geplante Weiterbearbeitung oder Neubeschichtung</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong> und <strong>RoHS / REACH</strong> als mögliche Anforderungen.
  `;

  const entaluminierenText = `
    <strong>Entaluminieren</strong> bezeichnet das Entfernen einer vorhandenen Aluminiumschicht. Das Verfahren kann notwendig sein, wenn eine Beschichtung beschädigt ist, ein Bauteil repariert oder für ein neues Schichtsystem vorbereitet werden soll.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Elektrochemisch</strong></li><li><strong>Mechanisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und vorhandene Aluminiumschicht</li><li>gewünschtes Entschichtungsverfahren</li><li>zulässiger Materialabtrag</li><li>Geometrie, Abmessungen und Stückzahl</li><li>geplante Folgebeschichtung</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong> und <strong>RoHS / REACH</strong> als mögliche Anforderungen.
  `;

  const entnickelnText = `
    <strong>Entnickeln</strong> entfernt eine vorhandene Nickelschicht von einem Werkstück. Das ist beispielsweise bei fehlerhaften Schichten, Reparaturen oder vor einer erneuten galvanischen Behandlung erforderlich.<br><br>
    <h4>Varianten / Ausführungen</h4>
    <ul><li><strong>Chemisch</strong></li><li><strong>Elektrochemisch</strong></li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und vorhandene Nickelschicht</li><li>chemisches oder elektrochemisches Entnickeln</li><li>zulässiger Angriff auf den Grundwerkstoff</li><li>Maß-, Sicht- und Funktionsflächen</li><li>geplante Folgebeschichtung</li></ul>
    Als mögliche Anforderungen kommen unter anderem <strong>ISO 9001</strong>, <strong>ISO 14001</strong> und <strong>RoHS / REACH</strong>.
  `;

  const anodisierenText = `
    <strong>Anodisieren</strong> bezeichnet die elektrochemische Erzeugung einer Oxidschicht auf einer Metalloberfläche. Bei Aluminium entspricht dies im allgemeinen Sprachgebrauch dem Eloxieren. Beschichter Scout führt beide Begriffe als eigene Auswahl, damit Aufträge so erfasst werden können, wie sie vom Auftraggeber bezeichnet werden.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>Korrosionsschutz</li><li>definierte elektrische oder tribologische Eigenschaften</li><li>dekorative Oberflächen</li><li>Vorbereitung für bestimmte technische Anwendungen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Legierung</li><li>gewünschte Schichteigenschaften</li><li>Farb- und Sichtanforderungen, sofern relevant</li><li>Maß- und Funktionsflächen</li><li>Stückzahl und Abmessungen</li></ul>
    Beim Anodisieren kommen als mögliche Anforderungen unter anderem <strong>Qualanod</strong>, <strong>ISO 9001</strong>, <strong>ISO 14001</strong> sowie <strong>RoHS / REACH</strong>.
  `;
  const mnPhosphatierenText = `
    <strong>Mn-Phosphatieren (Manganphosphatieren)</strong> ist ein chemisches Konversionsverfahren für Eisen- und Stahlwerkstoffe. Dabei entsteht auf der Oberfläche eine kristalline Manganphosphatschicht. Sie wird vor allem eingesetzt, wenn Verschleiß reduziert, das Einlaufverhalten verbessert oder eine gute Aufnahme von Öl und Schmierstoffen erreicht werden soll.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>Zahnräder, Wellen und Getriebeteile</li><li>Gleit- und Reibpartner</li><li>Bauteile mit erhöhten Anforderungen an Einlauf- und Verschleißverhalten</li><li>Vorbehandlung vor Ölen oder weiteren Schutzsystemen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Materialgüte</li><li>gewünschte Schichtausführung bzw. Schichtgewicht</li><li>anschließende Beölung oder weitere Behandlung</li><li>Maß- und Funktionsflächen sowie Toleranzen</li><li>Stückzahl, Abmessungen und Bauteilgewicht</li></ul>
  `;

  const beizenText = `
    <strong>Beizen</strong> ist eine chemische Oberflächenbehandlung, bei der Oxidschichten, Zunder, Rost oder andere anorganische Verunreinigungen entfernt werden. Das Verfahren wird häufig als Vorbereitung für galvanische, chemische oder lacktechnische Folgeprozesse eingesetzt.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>Entfernen von Zunder nach Wärmebehandlung oder Schweißen</li><li>Reinigen metallischer Oberflächen vor Beschichtung</li><li>Vorbereitung vor Verzinken, Phosphatieren, Eloxieren oder galvanischen Verfahren</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Legierung</li><li>Art und Zustand der Verunreinigung bzw. Oxidschicht</li><li>gewünschter Oberflächenzustand nach dem Beizen</li><li>empfindliche Maß-, Dicht- oder Funktionsflächen</li><li>geplante Folgebehandlung</li></ul>
  `;

  const entgratenText = `
    <strong>Entgraten</strong> entfernt scharfe Kanten, Grate und Materialüberstände, die beispielsweise beim Sägen, Bohren, Fräsen, Stanzen, Lasern oder Gießen entstehen. Ziel sind sichere, funktionsgerechte und für Folgeprozesse geeignete Bauteilkanten.<br><br>
    <h4>Verfahrensmöglichkeiten</h4>
    <ul><li>mechanisches Entgraten</li><li>Gleitschleifen / Trowalisieren</li><li>Bürsten oder Schleifen</li><li>Strahlverfahren</li><li>thermische oder elektrochemische Verfahren für spezielle Anwendungen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Herstellverfahren</li><li>Art, Lage und Größe der Grate</li><li>zulässige Kantenverrundung</li><li>kritische Maß- und Funktionsflächen</li><li>Stückzahl und gewünschtes Ergebnis</li></ul>
  `;

  const verrundenText = `
    <strong>Verrunden</strong> bezeichnet das gezielte Abrunden scharfer Bauteilkanten. Dadurch können Verletzungsrisiken reduziert, Beschichtungen gleichmäßiger aufgebaut und Kerbwirkungen oder unerwünschte scharfe Übergänge vermindert werden.<br><br>
    <h4>Typische Verfahren</h4>
    <ul><li>Schleifen</li><li>Bürsten</li><li>Gleitschleifen / Trowalisieren</li><li>Strahlen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Bauteilgeometrie</li><li>gewünschter Kantenradius bzw. Verrundungsgrad</li><li>zu bearbeitende und auszunehmende Bereiche</li><li>Maßtoleranzen</li><li>geplante Folgebehandlung</li></ul>
  `;

  const glaettenText = `
    <strong>Glätten</strong> reduziert Rauheit, Spitzen und Bearbeitungsspuren auf einer Oberfläche. Je nach Ausgangszustand und Ziel können mechanische, gleitschleifende oder andere Feinbearbeitungsverfahren eingesetzt werden.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>geringere Oberflächenrauheit</li><li>verbesserte Haptik und Optik</li><li>bessere Reinigbarkeit</li><li>Vorbereitung für Polieren, Beschichten oder galvanische Verfahren</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Ausgangsoberfläche</li><li>gewünschter Rauheitswert oder Referenzoberfläche</li><li>zulässiger Materialabtrag</li><li>Maß- und Funktionsflächen</li><li>Stückzahl und Folgeprozess</li></ul>
  `;

  const mattierenText = `
    <strong>Mattieren</strong> erzeugt eine gleichmäßig matte, reflexionsarme Oberfläche. Je nach Werkstoff und gewünschter Optik kann dies beispielsweise durch Strahlen, Bürsten, Schleifen oder chemische Verfahren erfolgen.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>gleichmäßige dekorative Optik</li><li>Reduzierung von Glanz und Reflexionen</li><li>Kaschieren leichter Oberflächenunterschiede</li><li>Vorbereitung für nachfolgende Beschichtungen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff</li><li>gewünschter Mattierungsgrad bzw. Referenzmuster</li><li>Sichtflächen und nicht zu bearbeitende Bereiche</li><li>zulässige Rauheit und Materialabtrag</li><li>geplante Folgebehandlung</li></ul>
  `;

  const schleifenText = `
    <strong>Schleifen</strong> ist ein spanendes Feinbearbeitungsverfahren, bei dem mit gebundenen oder flexiblen Schleifmitteln Material abgetragen wird. Es dient der Form- und Maßkorrektur, der Verringerung der Rauheit sowie der Vorbereitung dekorativer oder technischer Oberflächen.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>Entfernen von Bearbeitungsspuren und Unebenheiten</li><li>Erzeugen definierter Schliffbilder</li><li>Vorbereitung zum Polieren, Bürsten oder Beschichten</li><li>Bearbeitung von Kanten und Übergängen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Ausgangszustand</li><li>gewünschtes Schliffbild oder Rauheit</li><li>zulässiger Materialabtrag und Toleranzen</li><li>Sicht- und Funktionsflächen</li><li>Stückzahl und Folgebehandlung</li></ul>
  `;

  const polierenText = `
    <strong>Polieren</strong> ist eine Feinbearbeitung zur deutlichen Verringerung der Oberflächenrauheit und zur Erzeugung glatter bis hochglänzender Flächen. Je nach Werkstoff und Anforderung kann das Polieren dekorativen, hygienischen oder funktionellen Zwecken dienen.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>Hochglanz oder definierter Glanzgrad</li><li>geringere Rauheit</li><li>verbesserte Reinigbarkeit</li><li>Vorbereitung für dekorative galvanische Schichten</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff</li><li>gewünschte Oberflächenqualität bzw. Referenzmuster</li><li>Rauheits- oder Glanzanforderungen</li><li>Geometrie und schwer zugängliche Bereiche</li><li>zulässiger Materialabtrag und Stückzahl</li></ul>
  `;

  const buerstenText = `
    <strong>Bürsten</strong> ist eine mechanische Oberflächenbearbeitung mit rotierenden oder linearen Bürstwerkzeugen. Das Verfahren kann zum Reinigen, Entgraten, Strukturieren oder Erzeugen eines definierten dekorativen Schliffbilds eingesetzt werden.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>Strukturieren von Edelstahl- und Aluminiumoberflächen</li><li>Entfernen leichter Oxide oder Rückstände</li><li>Entgraten kleiner Kanten</li><li>Erzeugen eines gleichmäßigen Sichtbilds</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Ausgangszustand</li><li>gewünschte Bürstrichtung und Oberflächenstruktur</li><li>Sichtflächen und Kantenanforderungen</li><li>Referenzmuster, falls vorhanden</li><li>Stückzahl und Folgebehandlung</li></ul>
  `;

  const trowalisierenText = `
    <strong>Trowalisieren</strong>, auch Gleitschleifen genannt, ist ein mechanisches Verfahren, bei dem Werkstücke zusammen mit Schleif- oder Polierkörpern und Prozessflüssigkeit in einem Arbeitsbehälter bewegt werden. Dadurch lassen sich Bauteile entgraten, verrunden, glätten, reinigen oder polieren.<br><br>
    <h4>Typische Ziele</h4>
    <ul><li>Entgraten und Kantenverrunden</li><li>Glätten und Polieren</li><li>Reinigen und Entzundern leichter Rückstände</li><li>gleichmäßige Bearbeitung großer Stückzahlen</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff, Geometrie und Bauteilgröße</li><li>gewünschtes Bearbeitungsergebnis</li><li>zulässige Kantenverrundung und Materialabtrag</li><li>empfindliche Flächen oder Gewinde</li><li>Stückzahl und Folgeprozess</li></ul>
  `;

  const chemischesGlaenzenText = `
    <strong>Chemisches Glänzen</strong> ist ein chemisches Verfahren zum Einebnen und Aufhellen metallischer Oberflächen. Durch kontrollierten chemischen Abtrag werden mikroskopische Rauheitsspitzen reduziert, wodurch eine gleichmäßigere und glänzendere Oberfläche entstehen kann.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>dekorative Oberflächen</li><li>Vorbehandlung vor Eloxieren oder anderen Veredelungen</li><li>Bearbeitung komplexer Geometrien, die mechanisch schwer zugänglich sind</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Werkstoff und Legierung</li><li>gewünschte Optik bzw. Referenzoberfläche</li><li>zulässiger Materialabtrag</li><li>Maß- und Funktionsflächen</li><li>geplante Folgebehandlung</li></ul>
  `;

  const versilbernText = `
    <strong>Versilbern</strong> bezeichnet das Aufbringen einer Silberschicht auf ein Werkstück, meist durch galvanische Abscheidung. Silber wird wegen seiner sehr guten elektrischen und thermischen Leitfähigkeit sowie für dekorative und funktionelle Oberflächen eingesetzt.<br><br>
    <h4>Typische Prozesskette / Vorbehandlung</h4>
    Vor dem Versilbern muss die Oberfläche metallisch sauber und aktiv sein. Bei dekorativen Sichtteilen wird die gewünschte Glätte häufig bereits durch <strong>Schleifen und Polieren</strong> erzeugt. Danach folgen Reinigen / Entfetten, Aktivieren und je nach Grundwerkstoff geeignete Zwischen- oder Sperrschichten. Typisch ist beispielsweise: <strong>Schleifen / Polieren → Reinigen → Aktivieren → ggf. Verkupfern oder Vernickeln → Versilbern → ggf. Anlaufschutz</strong>. Bei elektrischen Funktionsflächen stehen Leitfähigkeit, Kontaktwiderstand und Schichtdicke stärker im Vordergrund als die Hochglanzoptik.<br><br>
    <h4>Typische Anwendungen</h4>
    <ul><li>elektrische Kontakte und Stromschienen</li><li>Bauteile mit hohen Anforderungen an Leitfähigkeit</li><li>dekorative Metalloberflächen</li><li>technische Funktionsschichten</li></ul>
    <h4>Wichtige Angaben für eine Anfrage</h4>
    <ul><li>Grundwerkstoff und eventuelle Zwischenschichten</li><li>gewünschte Schichtdicke</li><li>technische oder dekorative Anforderung</li><li>Kontakt-, Maß- und Funktionsflächen</li><li>Prüfanforderungen, Stückzahl und Abmessungen</li></ul>
  `;

  const lackeBeschichtungsstoffeText = `
    <strong>Lacke und Beschichtungsstoffe</strong> schützen Oberflächen, gestalten sie optisch und können ihnen zusätzliche funktionelle Eigenschaften verleihen. Welche Beschichtung geeignet ist, hängt unter anderem vom Grundwerkstoff, der späteren Beanspruchung, dem gewünschten Erscheinungsbild und dem gewählten Applikationsverfahren ab.<br><br>
    <h4>Nasslacke</h4>
    Nasslacke werden in flüssiger Form verarbeitet. Sie bestehen je nach System unter anderem aus <strong>Bindemitteln</strong>, <strong>Pigmenten</strong>, <strong>Lösemitteln oder Wasser</strong> sowie Additiven. Nach dem Auftragen entsteht die fertige Lackschicht durch physikalische Trocknung, chemische Reaktion oder eine Kombination daraus.<br><br>
    <ul>
      <li><strong>1K-Lacke:</strong> einkomponentige Systeme, die ohne getrennten Härter verarbeitet werden.</li>
      <li><strong>2K-Lacke:</strong> Lack und Härter werden vor der Verarbeitung im vorgegebenen Verhältnis gemischt. Die Verarbeitungszeit nach dem Anmischen ist begrenzt.</li>
      <li><strong>Grundierungen:</strong> verbessern je nach System Haftung und Korrosionsschutz und bilden die Basis für weitere Schichten.</li>
      <li><strong>Decklacke:</strong> bilden die sichtbare und häufig besonders beanspruchte Abschlussbeschichtung.</li>
      <li><strong>Klarlacke:</strong> transparente Deckschichten zum Schutz oder zur gezielten Beeinflussung von Optik und Glanz.</li>
    </ul>
    <h4>Pulverlacke</h4>
    Pulverlacke sind lösemittelfreie, feste Beschichtungsstoffe in Pulverform. Sie werden typischerweise elektrostatisch auf ein leitfähiges Werkstück aufgebracht und anschließend im Ofen aufgeschmolzen und vernetzt. Häufige Systeme basieren beispielsweise auf <strong>Polyester</strong>, <strong>Epoxid</strong> oder Mischsystemen. Auswahl und Eignung richten sich unter anderem nach Außenbewitterung, Korrosionsschutz, Chemikalienbeständigkeit, Temperaturbeanspruchung und gewünschter Optik.<br><br>
    <h4>Wichtige Eigenschaften und Angaben</h4>
    <ul>
      <li><strong>Farbton:</strong> z. B. RAL, NCS, kundenspezifischer Farbton oder Muster.</li>
      <li><strong>Glanzgrad:</strong> von matt und tiefmatt bis seidenglänzend oder hochglänzend.</li>
      <li><strong>Oberflächenstruktur:</strong> glatt, Feinstruktur, Grobstruktur oder spezielle Effekte.</li>
      <li><strong>Schichtdicke:</strong> beeinflusst Optik, Schutzwirkung, Maßhaltigkeit und Materialverbrauch.</li>
      <li><strong>Beständigkeit:</strong> je nach Anwendung können UV-, Wetter-, Chemikalien-, Temperatur- oder Abriebbeständigkeit entscheidend sein.</li>
      <li><strong>Untergrund und Vorbehandlung:</strong> Werkstoff und Vorbehandlung müssen zum Beschichtungssystem passen.</li>
      <li><strong>Lagerung:</strong> Temperatur, Feuchtigkeit, Verpackung und Lagerdauer können die Verarbeitbarkeit und Qualität beeinflussen.</li>
    </ul>
    <h4>Warum die genaue Lackangabe wichtig ist</h4>
    Zwei Lacke mit gleichem Farbton können technisch völlig unterschiedliche Eigenschaften besitzen. Für eine belastbare Auswahl sollten deshalb nicht nur Farbe und Optik, sondern auch <strong>Hersteller, Produktbezeichnung, Bindemittelsystem, Charge, gewünschte Schichtdicke und spätere Einsatzbedingungen</strong> bekannt sein.<br><br>
    <strong>Praxis-Hinweis:</strong> Bei Restmengen oder einer späteren Weiterverwendung sollten Originalgebinde, Produktetikett und vorhandene technische Unterlagen möglichst erhalten bleiben. Dadurch lässt sich wesentlich besser beurteilen, wofür ein Lack noch geeignet ist.
  `;

  const lackrecyclingRestlackText = `
    <strong>Lackrecycling und Restlackverwertung</strong> zielen darauf ab, noch nutzbare Beschichtungsstoffe möglichst lange im Materialkreislauf zu halten. In Beschichtungsbetrieben entstehen Restmengen beispielsweise durch Projektüberhänge, Farbwechsel, Mindestabnahmemengen, Sortimentswechsel oder nicht vollständig verbrauchte Gebinde. Solche Bestände sind nicht automatisch Abfall: Je nach Zustand und technischer Eignung können sie weiterverwendet, weitergegeben, aufbereitet oder anderweitig verwertet werden.<br><br>
    <h4>1. Direkte Weiterverwendung</h4>
    Die einfachste Form der Restlackverwertung ist die weitere Nutzung des unveränderten Materials. Das kann im eigenen Betrieb, für Folgeaufträge oder durch einen anderen geeigneten Anwender erfolgen. Besonders wichtig sind dabei eine eindeutige Produktidentifikation und nachvollziehbare Lagerbedingungen.<br><br>
    <h4>2. Vermarktung von Restmengen</h4>
    Noch verwendbare Restbestände können für andere Beschichter interessant sein, wenn Farbe, Qualität und technische Eigenschaften zu deren Bedarf passen. Sinnvolle Angaben sind unter anderem:
    <ul>
      <li>Hersteller und genaue Produktbezeichnung</li>
      <li>Farbton, Glanzgrad und Struktur</li>
      <li>Bindemittel- bzw. Lacksystem</li>
      <li>verfügbare Menge und Gebindegröße</li>
      <li>Charge bzw. Produktionskennzeichnung, sofern vorhanden</li>
      <li>Lagerzustand und bekannte Lagerdauer</li>
      <li>Originalverpackung und Zustand des Gebindes</li>
      <li>technisches Datenblatt oder weitere Produktunterlagen, sofern vorhanden</li>
    </ul>
    <h4>3. Aufbereitung und Revitalisierung</h4>
    Je nach Materialart und Zustand kann eine fachgerechte Aufbereitung sinnvoll sein. Bei Pulverlacken kann beispielsweise geprüft werden, ob Material durch geeignete Aufbereitungs- oder Mischprozesse wieder für definierte Anwendungen nutzbar gemacht werden kann. Entscheidend ist dabei, dass <strong>Verträglichkeit, Farbton, Partikelverteilung, Verarbeitung und geforderte Beschichtungseigenschaften</strong> weiterhin ausreichend sichergestellt werden können.<br><br>
    Eine Aufbereitung ist nicht gleichbedeutend damit, dass ein Material anschließend wieder uneingeschränkt die Eigenschaften eines ursprünglichen Neuprodukts besitzt. Die tatsächliche Einsatzmöglichkeit muss deshalb immer anhand des konkreten Materials und der späteren Qualitätsanforderungen beurteilt werden.<br><br>
    <h4>4. Rückgewinnung im Beschichtungsprozess</h4>
    Beim Pulverbeschichten kann nicht auf dem Werkstück abgeschiedenes Pulver – abhängig von Anlage, Farbwechselkonzept und Qualitätsanforderungen – teilweise innerhalb des Prozesses zurückgewonnen und erneut eingesetzt werden. Dafür sind geeignete Rückgewinnungs-, Sieb- und Dosiersysteme notwendig. Bei hohen optischen oder technischen Anforderungen kann der zulässige Anteil zurückgewonnenen Pulvers begrenzt sein.<br><br>
    <h4>Wann eine Wiederverwendung kritisch sein kann</h4>
    <ul>
      <li>unklare oder nicht nachvollziehbare Produktidentität</li>
      <li>unbekannte oder offensichtlich ungeeignete Lagerbedingungen</li>
      <li>Feuchtigkeit, Verklumpung, Verschmutzung oder Fremdmaterial</li>
      <li>bereits vermischte, nicht kompatible Systeme</li>
      <li>fehlende Reproduzierbarkeit bei hohen optischen oder technischen Anforderungen</li>
      <li>Material, dessen Verarbeitbarkeit oder geforderte Eigenschaften nicht mehr sicher beurteilt werden können</li>
    </ul>
    <h4>Vorteile einer sinnvollen Restlackverwertung</h4>
    <ul>
      <li>weniger ungenutzte Lagerbestände</li>
      <li>geringere Materialverluste</li>
      <li>zusätzliche Vermarktungsmöglichkeit für vorhandene Restmengen</li>
      <li>ressourcenschonenderer Umgang mit bereits hergestellten Beschichtungsstoffen</li>
      <li>potenziell geringere Beschaffungskosten für passende Anwendungen</li>
    </ul>
    <strong>Wichtig:</strong> Ob ein Restlack tatsächlich wiederverwendet oder aufbereitet werden kann, hängt immer vom konkreten Produkt, seinem Zustand und dem vorgesehenen Einsatz ab. Bei sicherheits-, qualitäts- oder kundenspezifisch kritischen Anwendungen sollte die technische Eignung vor Verwendung eindeutig geprüft werden.
  `;

  const baseContainerTexts = [
    legacyContainerTexts[0],
    legacyContainerTexts[1],
    nasslackierenText,
    pulverbeschichtenText,
    verzinkenText,
    eloxierenText,
    anodisierenText,
    ktlText,
    zinkphosphatierenText,
    strahlenText,
    entlackenText,
    bruenierenText,
    verzinnenText,
    aluminierenText,
    vernickelnText,
    aluminiumPassivierenText,
    elektropolierenText,
    verchromenText,
    vermessingenText,
    verkupfernText,
    vergoldenText,
    folierenText,
    isolierstegText,
    einlagernText,
    entzinkenText,
    enteloxierenText,
    entanodisierenText,
    entzinnenText,
    entaluminierenText,
    entnickelnText,
    mnPhosphatierenText,
    beizenText,
    entgratenText,
    verrundenText,
    glaettenText,
    mattierenText,
    schleifenText,
    polierenText,
    buerstenText,
    trowalisierenText,
    chemischesGlaenzenText,
    versilbernText,
    lackeBeschichtungsstoffeText,
    lackrecyclingRestlackText,
  ];


  const relatedVerfahren: Record<number, { name: string; hash: string }[]> = {
    2: [{ name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "KTL-Beschichten", hash: "#KTL-Beschichten" }, { name: "Strahlen", hash: "#Strahlen" }],
    3: [{ name: "Nasslackieren", hash: "#Nasslackieren" }, { name: "Strahlen", hash: "#Strahlen" }, { name: "Zinkphosphatieren", hash: "#Zinkphosphatieren" }],
    4: [{ name: "Entzinken", hash: "#Entzinken" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Strahlen", hash: "#Strahlen" }],
    5: [{ name: "Enteloxieren", hash: "#Enteloxieren" }, { name: "Aluminium-Passivieren", hash: "#Aluminium-Passivieren" }, { name: "Strahlen", hash: "#Strahlen" }],
    6: [{ name: "Entanodisieren", hash: "#Entanodisieren" }, { name: "Eloxieren", hash: "#Eloxieren" }, { name: "Aluminium-Passivieren", hash: "#Aluminium-Passivieren" }],
    7: [{ name: "Zinkphosphatieren", hash: "#Zinkphosphatieren" }, { name: "Nasslackieren", hash: "#Nasslackieren" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }],
    8: [{ name: "KTL-Beschichten", hash: "#KTL-Beschichten" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Nasslackieren", hash: "#Nasslackieren" }],
    9: [{ name: "Entlacken", hash: "#Entlacken" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Nasslackieren", hash: "#Nasslackieren" }],
    10: [{ name: "Strahlen", hash: "#Strahlen" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Nasslackieren", hash: "#Nasslackieren" }],
    11: [{ name: "Entlacken", hash: "#Entlacken" }, { name: "Folieren", hash: "#Folieren" }, { name: "Einlagern", hash: "#Einlagern" }],
    12: [{ name: "Entzinnen", hash: "#Entzinnen" }, { name: "Vernickeln", hash: "#Vernickeln" }, { name: "Verkupfern", hash: "#Verkupfern" }],
    13: [{ name: "Entaluminieren", hash: "#Entaluminieren" }, { name: "Strahlen", hash: "#Strahlen" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }],
    14: [{ name: "Entnickeln", hash: "#Entnickeln" }, { name: "Verchromen", hash: "#Verchromen" }, { name: "Vergolden", hash: "#Vergolden" }],
    15: [{ name: "Eloxieren", hash: "#Eloxieren" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Nasslackieren", hash: "#Nasslackieren" }],
    16: [{ name: "Vernickeln", hash: "#Vernickeln" }, { name: "Verchromen", hash: "#Verchromen" }, { name: "Strahlen", hash: "#Strahlen" }],
    17: [{ name: "Vernickeln", hash: "#Vernickeln" }, { name: "Entnickeln", hash: "#Entnickeln" }, { name: "Verkupfern", hash: "#Verkupfern" }],
    18: [{ name: "Verkupfern", hash: "#Verkupfern" }, { name: "Vernickeln", hash: "#Vernickeln" }, { name: "Vergolden", hash: "#Vergolden" }],
    19: [{ name: "Vernickeln", hash: "#Vernickeln" }, { name: "Verchromen", hash: "#Verchromen" }, { name: "Vergolden", hash: "#Vergolden" }],
    20: [{ name: "Verkupfern", hash: "#Verkupfern" }, { name: "Vernickeln", hash: "#Vernickeln" }, { name: "Elektropolieren", hash: "#Elektropolieren" }],
    21: [{ name: "Isolierstegverpressen", hash: "#Isolierstegverpressen" }, { name: "Einlagern", hash: "#Einlagern" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }],
    22: [{ name: "Folieren", hash: "#Folieren" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Einlagern", hash: "#Einlagern" }],
    23: [{ name: "Folieren", hash: "#Folieren" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Nasslackieren", hash: "#Nasslackieren" }],
    24: [{ name: "Verzinken", hash: "#Verzinken" }, { name: "Strahlen", hash: "#Strahlen" }, { name: "Entlacken", hash: "#Entlacken" }],
    25: [{ name: "Eloxieren", hash: "#Eloxieren" }, { name: "Entanodisieren", hash: "#Entanodisieren" }, { name: "Aluminium-Passivieren", hash: "#Aluminium-Passivieren" }],
    26: [{ name: "Anodisieren", hash: "#Anodisieren" }, { name: "Enteloxieren", hash: "#Enteloxieren" }, { name: "Eloxieren", hash: "#Eloxieren" }],
    27: [{ name: "Verzinnen", hash: "#Verzinnen" }, { name: "Verkupfern", hash: "#Verkupfern" }, { name: "Vernickeln", hash: "#Vernickeln" }],
    28: [{ name: "Aluminieren", hash: "#Aluminieren" }, { name: "Strahlen", hash: "#Strahlen" }, { name: "Entlacken", hash: "#Entlacken" }],
    29: [{ name: "Vernickeln", hash: "#Vernickeln" }, { name: "Verchromen", hash: "#Verchromen" }, { name: "Verkupfern", hash: "#Verkupfern" }],
    30: [{ name: "Zinkphosphatieren", hash: "#Zinkphosphatieren" }, { name: "Schleifen", hash: "#Schleifen" }, { name: "KTL-Beschichten", hash: "#KTL-Beschichten" }],
    31: [{ name: "Strahlen", hash: "#Strahlen" }, { name: "Verzinken", hash: "#Verzinken" }, { name: "Eloxieren", hash: "#Eloxieren" }],
    32: [{ name: "Verrunden", hash: "#Verrunden" }, { name: "Trowalisieren", hash: "#Trowalisieren" }, { name: "Bürsten", hash: "#Bürsten" }],
    33: [{ name: "Entgraten", hash: "#Entgraten" }, { name: "Trowalisieren", hash: "#Trowalisieren" }, { name: "Schleifen", hash: "#Schleifen" }],
    34: [{ name: "Schleifen", hash: "#Schleifen" }, { name: "Polieren", hash: "#Polieren" }, { name: "Trowalisieren", hash: "#Trowalisieren" }],
    35: [{ name: "Strahlen", hash: "#Strahlen" }, { name: "Bürsten", hash: "#Bürsten" }, { name: "Schleifen", hash: "#Schleifen" }],
    36: [{ name: "Polieren", hash: "#Polieren" }, { name: "Bürsten", hash: "#Bürsten" }, { name: "Mattieren", hash: "#Mattieren" }],
    37: [{ name: "Schleifen", hash: "#Schleifen" }, { name: "Chemisches Glänzen", hash: "#Chemisches-Glänzen" }, { name: "Verchromen", hash: "#Verchromen" }],
    38: [{ name: "Schleifen", hash: "#Schleifen" }, { name: "Mattieren", hash: "#Mattieren" }, { name: "Entgraten", hash: "#Entgraten" }],
    39: [{ name: "Entgraten", hash: "#Entgraten" }, { name: "Verrunden", hash: "#Verrunden" }, { name: "Glätten", hash: "#Glätten" }],
    40: [{ name: "Polieren", hash: "#Polieren" }, { name: "Eloxieren", hash: "#Eloxieren" }, { name: "Aluminium-Passivieren", hash: "#Aluminium-Passivieren" }],
    41: [{ name: "Verkupfern", hash: "#Verkupfern" }, { name: "Vernickeln", hash: "#Vernickeln" }, { name: "Vergolden", hash: "#Vergolden" }],
    42: [{ name: "Nasslackieren", hash: "#Nasslackieren" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Lackrecycling & Restlackverwertung", hash: "#Lackrecycling-Restlackverwertung" }],
    43: [{ name: "Lacke & Beschichtungsstoffe", hash: "#Lacke-Beschichtungsstoffe" }, { name: "Pulverbeschichten", hash: "#Pulverbeschichten" }, { name: "Entlacken", hash: "#Entlacken" }],
  };

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

    const isKnowledgeTopic = index === 42 || index === 43;
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
              Ein kompakter Fachguide zu Beschichtungsverfahren, Vorbereitung,
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
                Bearbeitungsrückstände und andere Verunreinigungen können die Haftung
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
                <strong>Zertifizierungen:</strong> Auftraggeber:innen können vor der
                Auftragsvergabe benötigte Zertifizierungen, Normen oder
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
