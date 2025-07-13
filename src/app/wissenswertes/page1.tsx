"use client";

import { useState, useEffect } from "react";
import styles from "./wissenswertes.module.css";
import Pager from "./navbar/pager";
import { motion } from 'framer-motion';

const TypingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const speed = 45;

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    if (isDesktop) {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }
  }, [text, isDesktop]);

  return (
    <motion.p 
      className={styles.typing} 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 1 }}
    >
      {displayedText}
    </motion.p>
  );
};

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
      <div
        className={styles.scrollProgressBar}
        style={{ width: `${scrollProgress}%` }}
      ></div>
    </div>
  );
};

// Neuer Container für das Ausklappen
const Wissenswertes = () => {
  const [isOpen, setIsOpen] = useState(false); // Zustand für das Öffnen/Schließen des Containers

  const toggleContainer = () => {
    setIsOpen(prevState => !prevState);
  };

  

  return (
    <>
          <Pager />
          <ScrollProgress />
          

    <div className={styles.container}>
      
      <div className={styles.container}>
      {/* 1. Container (Linker Container mit Text) */}
      <div className={styles["container-left"]}>
        <div className={styles["text-container"]}>
          <h2 className={styles["h2-vision"]}>Unsere Vision</h2>
          <TypingText text='
            "Wir sehen eine Welt, in der die Beschichtungstechnik einfacher, nachhaltiger und für alle zugänglich ist. 
            Unser Ziel ist es, Innovation mit Verantwortung zu verbinden, um eine bessere Zukunft für alle Akteure in der 
            Beschichtungstechnik zu schaffen. Mit Leidenschaft, Kreativität und Technologie wollen wir neue Maßstäbe setzen 
            und die Art und Weise, wie die Prozesse in der Beschichtungstechnik funktionieren, revolutionieren."
          ' />
        </div>
      </div>

      {/* 2. Container (Rechter Container mit Bild) */}
      <div className={styles["container-right"]}>
        <div className={styles["image-container"]}>
          <img src="/images/vision.jpg" alt="Vision" className={styles["image"]} />
        </div>
      </div>

      {/* 3. Container (Linker Container mit Bild) */}
      <div className={styles["container-left"]}>
        <div className={styles["image-container"]}>
          <img src="/images/mission.jpg" alt="Mission" className={styles["image"]} />
        </div>
      </div>

      {/* 4. Container (Rechter Container mit Text) */}
      <div className={styles["container-right"]}>
        <div className={styles["text-container"]}>
          <h2 className={styles["h2-mission"]}>Unsere Mission</h2>
          <TypingText text='
            "Unsere Mission ist es, die Prozesse so zu gestalten, dass sie nicht nur neu gedacht und innovativ, sondern 
            auch nachhaltig und nutzerfreundlich sind. Wir glauben daran, den Status Quo in der Beschichtungstechnik 
            herauszufordern. Wir glauben daran, dass wir anders denken. Wir machen das, indem wir auf Nachhaltigkeit, 
            Nutzerfreundlichkeit und Wirtschaftlichkeit setzen. Wir freuen uns, besondere Lösungen anzubieten. Wollen 
            Sie auch Teil davon sein?"
          ' />
        </div>
      </div>
      
    </div>
    <br></br>
    <div id="UeberUns" className={styles["werwirsind"]}>
      
          <p>Über uns</p>      
        <div className={styles["ober"]}>
          <p>Wir sind die erste für Beschichtungstechnik zugeschnittene Plattform. Eine Plattform:</p>
          <p>Die es Metallverarbeitern ermöglicht innerhalb kürzester Zeit Angebote für ihren Auftrag zu erhalten und den passenden Beschichter dafür zu finden</p>
          <p>Die es Metallverarbeitern durch eigenständige Lackbeschaffung ermöglicht, bares Geld zu sparen</p>
          <p>Die Metallverarbeiter bei Reklamationen nicht im Regen stehen lässt</p>                             
          <p>Die alle Arbeitsmittel für Beschichter aus einer Hand bietet</p>
          <p>Die es Beschichtern ermöglicht ihren Absatz zu steigern</p> 
          <br></br>
        </div>
     </div>
     
    <br></br>
    <div id="Beschichtungstechnik" className={styles["werwirsind1"]}>
        {/* Schaltfläche für das Öffnen/Schließen */}
        <button onClick={toggleContainer} className={styles.toggleButton}>
          {isOpen ? "Schließen" : "Mehr Erfahren"}
        </button>

        {/* Der ausfahrbare Container */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: isOpen ? 1 : 0,
            height: isOpen ? "auto" : 0,
          }}
          transition={{ duration: 0.5 }}
          className={styles["werwirsind1-content"]}
        >
          <p>Beschichtungstechnik</p>
          <div className={styles["ober1"]}>
            <p>
              Die Beschichtungstechnik (bzw. Oberflächentechnik) ist ein
              Teilbereich der Materialwissenschaften, der sich mit der gezielten
              Modifikation von Oberflächen beschäftigt, um deren Eigenschaften
              zu verbessern. Ziel ist es, Materialien oder Bauteile funktionaler,
              langlebiger und ästhetisch ansprechender zu gestalten. Die Anwendungen
              reichen von Korrosions- und Verschleißschutz bis hin zur Optimierung
              chemischer, elektrischer und mechanischer Eigenschaften sowie der
              visuellen Gestaltung. Dabei wird ausschließlich die Oberfläche
              behandelt, während das Grundmaterial unverändert bleibt. Diese
              Technologie spielt eine essenzielle Rolle in zahlreichen Industrien,
              darunter die Automobilbranche, Luft- und Raumfahrt, der Maschinenbau,
              die Medizintechnik und die Elektronik.
            </p>
            <br />
          </div>
        </motion.div>
        
        <div id="ziele" className={styles["werwirsind1"]}>
        <p>Die wichtigsten Ziele sind</p>
        </div>
        <div className={styles["ober2"]}>
          <p><u>Dekoration:</u> Lackieren oder Pulverbeschichten mit verschiedenen Lacken verändern Farbe, Glanz und Textur der Oberfläche<br></br>
                <u>Schutz:</u> Geringere Umwelteinflüsse durch Korrosion, Abrieb, Kratzer oder UV-Strahlung<br></br>
                <u>Funktionalität:</u> Die Oberfläche wird mit spezifischen Eigenschaften ausgestattet, etwa durch Verbesserung der Haftung, Gleitfähigkeit, elektrischen Leitfähigkeit oder Wärmeleitfähigkeit<br></br>
                <u>Hygiene und Reinheit:</u> Spezielle Beschichtungen können Schmutzanhaftungen reduzieren und die Reinigung erleichtern. Dies ist besonders in der Lebensmittelindustrie und der Medizintechnik von großem Nutzen<br></br>
          </p>
            
        </div>
        <div className={styles["ober1"]}>
          <p>Die Verfahren in der Beschichtungstechnik sind vielfältig und können in vier verschiedene Verfahrenstypen eingeteilt werden.</p> 
          <br></br>
        </div>
        <div className={styles["ober2"]}>
          <p><u>Thermische Verfahren:</u> Durch Hitzezufuhr wird auf dem Werkstück eine Beschichtung erzeugt. Verzinken durch Flammspritzen oder Lackieren durch Pulverbeschichten, sind häufig eingesetzte Techniken. <br></br>
                <u>Chemische Verfahren:</u> Durch Chemikalien werden Oberflächenstruktur und -beschaffenheit verändert. Zu den bekanntesten Prozessen zählen das Beizen (entfernen von Oxidschichten / Rost), das Passivieren (Überziehen einer Schutzschicht) und das Anodisieren (Eloxieren), also das Bilden einer stabilen Oxidschicht.<br></br>
                <u>Galvanische oder elektrolytische Verfahren:</u> In einer Lösung mit Metallionen (meist Zink, Chrom oder Nickel) welche auf die Oberfläche eines Werkstücks abgeschieden werden, bildet sich eine Korrosionsschutzschicht, welche die Lebensdauer des Werkstücks gegen Korrosion erhöht.<br></br>
                <u>Mechanische Verfahren:</u> Nasslackieren, Schleifen, Polieren, Bürsten, mechanisches Entlacken oder Strahlen zählen zu den Verfahren, bei denen die Oberfläche durch mechanische Einwirkung strukturiert wird. <br></br>
          </p>            
        </div>
        <div id="Pulverbeschichten" className={styles["werwirsind1"]}>
          <p>Die Prozesse im Detail</p>        
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }}>Pulverbeschichten</span> auch bekannt als Thermo- oder Pulverlackierung, 
          ist ein Verfahren zur Oberflächenbeschichtung, das auf elektrisch leitfähigen Materialien angewendet wird. Typischerweise kommen dabei Metalle wie 
          Aluminium, Stahl, verzinkter Stahl, Edelstahl oder Messing zum Einsatz, doch auch andere Werkstoffe lassen sich auf diese Weise beschichten.
          Damit die Beschichtung optimal haftet und ihren Zweck erfüllt, ist eine sorgfältige Vorbehandlung erforderlich. Diese umfasst in der Regel eine Entfettung, 
          Beizung sowie eine Passivierung – je nach Grundmaterial können dabei unterschiedliche Verfahren und Chemikalien zum Einsatz kommen. Nach der Vorbehandlung 
          werden die Werkstücke getrocknet und anschließend mit Pulverlack besprüht.
          Im nächsten Schritt erfolgt das Einbrennen des Pulvers im Ofen bei Temperaturen zwischen 110 und 250 °C. Dabei vernetzt sich das Pulver und bildet eine 
          widerstandsfähige, optisch ansprechende Schutzschicht. Die Pulverbeschichtung ist auch für großformatige Bauteile geeignet – Werkstücke mit einer Größe von 
          bis zu 10 x 5 x 3 Metern (HxBxT) lassen sich problemlos bearbeiten, in Sonderfällen sogar noch größere.
          Die Dicke der Beschichtung variiert je nach Anwendungsbereich und liegt in der Regel zwischen 60 und 120 µm, wobei sowohl dünnere als auch dickere Schichten 
          realisierbar sind.
          Für Pulverbeschichtungen existieren verschiedene Normen. Die DIN 55633 definiert Anforderungen an den Korrosionsschutz sowie Prüfverfahren für beschichtete 
          Stahlkonstruktionen. Besonders für dünnwandige Bauteile (Materialstärke ≤ 3 mm) sind in der DIN 55634-1 spezifische Vorgaben festgelegt. Zudem regelt 
          die EN 15773 die Pulverbeschichtung von feuerverzinkten und sherardisierten Stahlteilen. Darüber hinaus existieren Standards für das Pulverbeschichten 
          von Aluminium- und Stahlbauteilen, welche über GSB oder Qualicoat Siegel zertifiziert werden.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Pulverlacke</span> sind in sehr vielen verschiedenen Variationen 
          kommerziell erhältlich. Die meisten Pulverlacke haben Polyamid, Polyesterharz oder Epoxidharz als Basis. Pulverlacke unterscheiden sich je nach 
          Zusammensetzung in Farben & Erscheinung, Glanzgraden, Oberflächenstrukturen, Verarbeitung, Einsatzzwecken und Eigenschaften gegenüber äußeren Einflüssen. 
          Es sind kratzresistente, elektrisch ableitfähige, hochwetterfeste, anti-Graffiti, fluoreszierende, metallic, anti-Quietsch, anti-Rutsch, anti-Ausgasung und 
          weitere Variationen erhältlich, je nach geforderter Anwendung. Pulverlacke sind auf Kundenwunsch auch nach Vorlage oder individuellen Bedürfnissen 
          produzierbar. Ebenso gibt es GSB und Qualicoat zertifizierte Pulverlacke welche bestimmte Mindeststandards jedenfalls erfüllen müssen.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "80px", color: "#333" }}>Thermoplaste</span> Thermoplastische Pulverlacke sind 
          spezielle Korrosionsschutzbeschichtungen für Metall, die sich durch sehr hohe Beständigkeit gegenüber Korrosion, UV-Strahlung und vielen Chemikalien 
          wie Säuren, Laugen, Salzen, Lösungsmitteln oder Erdreich auszeichnen. Sie bieten abriebfeste und mechanisch belastbare Oberflächen, sind zäh, stark 
          und schlagfest, können Schichtstärken von bis zu 2000 µm erreichen und sind elektrisch isolierend. Zudem überzeugen sie durch eine hervorragende 
          Kantendeckung ohne Schichtstärkenverlust und sind für den Kontakt mit Trinkwasser und Lebensmitteln zugelassen. Thermoplastische Pulverlacke sind 
          extrem widerstandsfähig gegen niedrige Temperaturen bis -100 °C, lassen sich einfach ausbessern und sind in verschiedenen Farben und haptischen 
          Varianten wie Soft Touch erhältlich. Außerdem wirken sie schalldämmend und hemmen Pilz- sowie Bakterienwachstum. 
          Typische Anwendungsbereiche umfassen Bau- und Straßenverkehrsobjekte wie Stahlgeländer, Zäune, Lichtmasten, Lärmschutzwände, Fassaden und Parkmöbel,
           wo sie bessere Kantendeckung bieten als herkömmliche Nasslacke oder zweischichtige Beschichtungen. Im Maschinen- und Anlagenbau werden sie bei hohen 
           Anforderungen in Galvanikanlagen, Elektroinstallationen, Batteriekästen und Transportschutz eingesetzt, da sie biegsam, UV-beständig und chemikalienresistent 
           sind. Im Lebensmittel- und Wasserbereich werden sie für Rohrleitungen, Behälter und Armaturen verwendet, da sie nicht brechen, lebensmitteltauglich sind und 
           gegen Salz- und Seewasser sowie Erdreich resistent sind. Auch für Design- und Möbelanwendungen bieten sie eine angenehme Haptik, gute Griffigkeit, Isolation, 
           Reinigungsmittelresistenz sowie antimikrobielle Eigenschaften und sind sterilisiert verwendbar. Zusammengefasst sind thermoplastische Pulverlacke 
           langlebige, vielseitige und widerstandsfähige Schutzbeschichtungen für Metall mit hoher Funktionalität und angenehmer Haptik.


          </p><br></br>                     
        </div>
        <div id="Nasslackieren" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Das Nasslackieren</span> ist eine Technik zur Oberflächenbeschichtung mit flüssigem Lack. Dieses Verfahren dient nicht nur der optischen Aufwertung von Bauteilen, sondern schützt sie auch vor äußeren Einflüssen wie Korrosion, chemischen Belastungen oder UV-Strahlung. Dabei entsteht eine geschlossene und haftfeste Lackschicht, die sowohl funktionale als auch dekorative Eigenschaften besitzen kann.
          Der verwendete Lack setzt sich aus Bindemitteln, Pigmenten, Additiven und Lösungsmitteln zusammen. Nach dem Auftragen verdunsten die Lösungsmittel, 
          wodurch die Schicht aushärtet, und eine widerstandsfähige Oberfläche entsteht. Je nach Anforderungen kommen unterschiedliche Lacke zum Einsatz – 
          beispielsweise hitzebeständige, besonders kratzfeste oder chemikalienresistente Varianten.
          Das Nasslackieren findet in zahlreichen Branchen Anwendung, darunter der Automobil- und Maschinenbau, die Möbelindustrie und die Elektronik. Es eignet sich 
          für eine Vielzahl von Materialien wie Metall, Kunststoff, Holz oder Glas und bietet durch die große Auswahl an Farben und Glanzgraden eine hohe gestalterische 
          Vielfalt.
          Damit der Lack optimal haftet, wird die Oberfläche vorab gereinigt, entfettet und gegebenenfalls aufgeraut oder grundiert. Anschließend erfolgt das Auftragen 
          in dünnen Schichten – je nach Verfahren mit Spritzpistolen, Bürsten oder Walzen. Zwischen den einzelnen Lackschichten muss in der Regel eine Trockenzeit 
          eingehalten werden, um ein gleichmäßiges und hochwertiges Ergebnis zu erzielen.
          Es gibt verschiedene Methoden des Nasslackierens, darunter das Airless-Spritzen, elektrostatische Spritzen oder das klassische Spritzlackieren mit Druckluft. 
          Jede Technik hat ihre spezifischen Vorteile und wird je nach Bauteilgröße, Form und Anwendungsbereich gewählt.
          Zu den Stärken des Nasslackierens zählen seine Flexibilität, die Möglichkeit, selbst komplexe Geometrien zu beschichten, und die breite Palette an 
          Oberflächeneffekten. Allerdings ist dieses Verfahren oft arbeitsintensiver als andere Beschichtungsmethoden und erfordert eine kontrollierte Umgebung, 
          insbesondere für die Trocknung und das Ablüften der Lösungsmittel.

          </p><br></br>                     
        </div>
        <div id="Entlacken" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Das Entlacken </span> ist ein Verfahren zum Entfernen von alten 
          Lackschichten. Je nachdem, welcher Werkstoff und welche Beschichtung eingesetzt wurden, stehen verschiedene Verfahren und Mittel zur Verfügung. Entscheidend 
          für den Kunden oder Dienstleister ist, wie die gewünschte Qualität am günstigsten erreicht werden kann. Mittlerweile gibt es auch für Entlacker ein Gütesiegel 
          (Qualistrip) welches sicherstellt, dass die zertifizierten Betriebe vorgegebene Standards einhalten. Ziel beim Entlacken ist es, wieder eine 
          beschichtungsfähige Oberfläche zu erhalten. Entlackungsmethoden lassen sich unterteilen in chemische, thermische und mechanische Entlackung. Es sind 
          jeweils unterschiedliche Varianten im Einsatz mit unterschiedlichem Ergebnis.
          </p><br></br>                     
        </div>
        <div id="Verzinken" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Beim Schmelztauchen  </span> wird ein Metallwerkstück in ein 
          Bad mit geschmolzenem Metall eingetaucht. Damit das Werkstück dabei nicht schmilzt, muss sein Schmelzpunkt deutlich höher liegen als der des flüssigen 
          Metalls. Zudem muss das geschmolzene Metall gut an der Oberfläche haften, damit eine gleichmäßige Beschichtung entsteht. Nach dem Herausziehen aus dem 
          Bad kühlt die Metallüberzugs-Schicht ab und bildet eine feste Schutzschicht.
          Dieses Verfahren wird hauptsächlich eingesetzt, um Werkstücke widerstandsfähiger gegen Korrosion zu machen, ihre Lebensmittelverträglichkeit zu verbessern, die 
          elektrische Leitfähigkeit anzupassen oder die Lötbarkeit zu optimieren. Zu den gängigsten Schmelztauchverfahren zählen das 
          <span style={{ fontSize: "22px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> Feuerverzinken,  </span> 
          <span style={{ fontSize: "22px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> Feuerverzinnen,  </span> 
          <span style={{ fontSize: "22px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> Feuerverbleien  </span> und 
          <span style={{ fontSize: "22px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> Feueraluminieren</span>.
          Im Vergleich zu galvanischen Beschichtungsmethoden bietet das Schmelztauchen eine wesentlich stärkere Haftung zwischen Metallüberzug und Werkstück. 
          Zudem sind die erzielbaren Schichtdicken deutlich höher, was den Korrosionsschutz zusätzlich verbessert. Eine weitere Möglichkeit ist die sogenannte 
          Duplex-Beschichtung, bei der eine Lackschicht auf die Zinkbeschichtung aufgetragen wird – entweder aus dekorativen Gründen oder zur zusätzlichen 
          Schutzverstärkung.
          Ein weiterer Vorteil des Verfahrens ist seine Nachhaltigkeit, da beispielsweise Zink recycelt werden kann.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Verzinken & Entzinken: </span> Beim Verzinken wird meistens 
          Stahl mit einer dünnen Schicht Zink überzogen, um ihn vor Korrosion zu schützen. Dafür gibt es verschiedene Verfahren mit unterschiedlichen Parametern.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Beim Feuerverzinken </span> werden Metallwerkstücke 
          in ein Bad mit geschmolzenem Zink getaucht. Damit die Beschichtung optimal haftet, müssen die Werkstücke zuvor gründlich gereinigt werden. Dabei 
          werden Öl-, Fett- und Rostrückstände sowie andere Verunreinigungen entfernt. Der Reinigungsprozess umfasst mehrere Schritte: Entfetten, Beizen – 
          bei dem Oxidschichten mithilfe von Säure beseitigt werden – sowie das Auftragen eines Flussmittels, das die Oberfläche auf die Zinkbeschichtung vorbereitet.
          Nach der Vorbehandlung erfolgt das Eintauchen der Werkstücke in das etwa 450°C heiße Zinkbad. Dabei reagiert das flüssige Zink mit dem Eisen oder
           Stahl und bildet eine fest verbundene Schutzschicht. Anschließend kühlt das verzinkte Bauteil langsam ab, wodurch eine gleichmäßige und widerstandsfähige 
           Beschichtung entsteht.
          Je nach Umgebung und Belastung schützt die Zinkschicht das Werkstück über mehrere Jahrzehnte hinweg – oft bis zu 50 Jahre – vor Korrosion.

          </p><br></br>                     
        </div>
        
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Beim Spritzverzinken  </span> wird die Schutzschicht nicht 
          durch Eintauchen in geschmolzenes Zink aufgebracht, sondern durch das Aufspritzen des Materials. Vor der Beschichtung erfolgt eine mechanische Reinigung 
          der Oberfläche – beispielsweise durch Sand- oder Kugelstrahlen –, um Rost, Schmutz und Oxidschichten zu entfernen.
          Das Zink wird anschließend in einem Brenner oder Lichtbogen erhitzt, bis es schmilzt. Mithilfe von Druckluft wird das flüssige Zink in feine Tröpfchen 
          zerstäubt und gleichmäßig auf die vorbereitete Oberfläche gespritzt. Beim Kontakt mit dem Werkstück kühlen die Zinkpartikel sofort ab und haften an der 
          Oberfläche, wodurch eine schützende Beschichtung entsteht.
          Ein großer Vorteil dieses Verfahrens ist seine Mobilität, da es direkt vor Ort eingesetzt werden kann – ideal für große oder komplex geformte Strukturen. 
          Zudem ist es besonders materialschonend, da die Werkstücke keiner starken Hitze ausgesetzt werden, was es auch für temperaturempfindliche Bauteile geeignet 
          macht.
          Die Schichtdicke kann je nach Anforderung individuell angepasst werden, und beschädigte Bereiche lassen sich gezielt nachbessern. Allerdings ist die 
          mechanische Widerstandsfähigkeit der Beschichtung geringer als bei metallurgisch gebundenen Zinkschichten, und die Haltbarkeit ist im Vergleich zum 
          Feuerverzinken kürzer.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Das Diffusionsverzinken (Sherardisieren) </span> ist ein Verfahren,
           bei dem Zink in fester Form auf die Oberfläche von Stahl oder Eisen übertragen wird. Dabei entsteht durch Diffusion eine fest verbundene Zink-Eisen-Legierung.
          Vor der Beschichtung müssen die Werkstücke gründlich gereinigt werden, um Fett, Schmutz und Oxidrückstände zu entfernen. Anschließend werden sie zusammen mit 
          Zinkpulver oder einer speziellen Zinkpulver-Mischung in einen geschlossenen, rotierenden Behälter gegeben. Oft enthält die Mischung zusätzliche Stoffe wie 
          Quarzsand, um eine gleichmäßige Verteilung zu gewährleisten. Der Behälter wird dann auf Temperaturen zwischen 300 und 400°C erhitzt, wodurch das Zink in 
          die Oberfläche des Stahls diffundiert, und eine widerstandsfähige Legierung bildet. Nach Abschluss des Prozesses werden die Werkstücke abgekühlt und von 
          überschüssigem Zinkpulver befreit.
          Dieses Verfahren bietet zahlreiche Vorteile: Es sorgt für eine äußerst widerstandsfähige Beschichtung, die mechanischen Belastungen sehr gut standhält. 
          Zudem ermöglicht es eine gleichmäßige Beschichtung auch bei komplexen Geometrien und bietet einen hervorragenden Korrosionsschutz – selbst in aggressiven 
          Umgebungen.
          Allerdings sind mit diesem Verfahren auch höhere Kosten verbunden, da es technisch aufwendiger ist. Zudem gibt es Einschränkungen hinsichtlich der maximalen 
          Größe der zu beschichtenden Bauteile.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Das galvanische Verzinken </span> wird bevorzugt eingesetzt, 
          wenn neben einem gewissen Korrosionsschutz auch eine ansprechende Optik und hohe Maßgenauigkeit gefragt sind – beispielsweise bei Bauteilen für Innenbereiche
           oder weniger aggressive Umgebungen. Je nach Anforderungen kann es eine Ergänzung zu anderen Verzinkungsverfahren wie dem Feuer- oder Spritzverzinken 
           darstellen.
            Im Gegensatz zum Feuerverzinken, das bei hohen Temperaturen abläuft, basiert das galvanische Verzinken auf einem elektrochemischen Prozess. Dabei wird 
            das Werkstück in ein elektrolytisches Zinkbad getaucht, in dem es als Kathode dient. Eine Zinkanode gibt dabei Zinkionen in die Lösung ab. Durch Anlegen 
            eines Gleichstroms wandern diese Ionen zur Werkstückoberfläche, wo sie sich als dünne Zinkschicht abscheiden.
            Nach dem Verzinkungsprozess kann die Oberfläche zusätzlich durch Lackierung oder Pulverbeschichtung veredelt werden. Die aufgebrachten Schichten sind mit 
            5 bis 30 µm deutlich dünner als beim Feuerverzinken, wodurch der Korrosionsschutz begrenzter ist. Dafür bietet dieses Verfahren eine besonders glatte, 
            optisch ansprechende Oberfläche.
            Galvanisches Verzinken eignet sich besonders für Bauteile mit komplexen Geometrien, kleinere Werkstücke oder Anwendungen, bei denen keine extrem hohe 
            Korrosionsbeständigkeit erforderlich ist. Es bietet zudem eine hohe Präzision und eine gleichmäßige Beschichtung, ist jedoch nicht so widerstandsfähig 
            gegenüber mechanischer Belastung wie andere Verzinkungsverfahren.
          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Das Lamellenverzinken  </span> ist ein spezielles 
          Korrosionsschutzverfahren, bei dem eine schützende Zinklamellenschicht in mehreren Schritten auf ein Werkstück aufgebracht wird. Besonders 
          geeignet ist es für kleine, filigrane oder komplex geformte Bauteile wie Schrauben, Muttern und Verbindungselemente.
          Der Prozess beginnt mit einer gründlichen Oberflächenvorbereitung, die durch Strahlen oder chemische Reinigung erfolgt. Anschließend wird eine Suspension 
          aus feinen Zink- und Aluminiumplättchen, eingebettet in ein Bindemittel, auf das Bauteil aufgetragen – meist durch Sprühen oder Tauchschleudern. Danach härtet 
          die Beschichtung bei Temperaturen zwischen 200 und 300 °C im Ofen aus. Um einen besonders hohen Korrosionsschutz zu erzielen, werden oft mehrere Schichten 
          aufgetragen und jeweils einzeln ausgehärtet.
          Durch die Kombination aus Zink- und Aluminiumlamellen entsteht eine äußerst widerstandsfähige Schutzbarriere. Die aufgebrachte Schicht ist mit einer Dicke von 
          etwa 8 bis 20 Mikrometern sehr dünn, haftet jedoch hervorragend – besonders an Bauteilen mit Gewinden. Das Verfahren zeichnet sich durch eine hohe Beständigkeit 
          gegenüber Korrosion aus, selbst in aggressiven Umgebungen. Zudem ist es umweltfreundlich, da es ohne den Einsatz von Chrom VI auskommt.
          Ein weiterer Vorteil des Lamellenverzinkens ist, dass es keine Wasserstoffversprödung verursacht, was es besonders für hochfeste Stähle attraktiv macht. Zudem 
          hält die Beschichtung Temperaturen von bis zu 300 °C stand. Allerdings sind die mechanische Belastbarkeit der Schicht und die Stoßfestigkeit etwas begrenzt, und die 
          Kosten sind im Vergleich zu anderen Verzinkungsverfahren etwas höher.
          Eingesetzt wird das Lamellenverzinken vor allem in der Automobilindustrie, im Maschinenbau sowie bei Befestigungselementen für den Außenbereich – überall dort, 
          wo ein hoher Korrosionsschutz bei gleichzeitig engen Toleranzen gefordert ist.

          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Das mechanische Verzinken  </span> ist ein Verfahren, bei 
          dem eine Zinkschicht durch mechanische Energie auf Stahl- oder Eisenoberflächen aufgetragen wird. Besonders häufig wird es für kleinere Bauteile wie 
          Schrauben, Muttern oder Nägel verwendet, da es zuverlässigen Korrosionsschutz bietet, ohne das Risiko einer Wasserstoffversprödung einzugehen.
          Der Prozess erfolgt in einem rotierenden Behälter, in den die Werkstücke zusammen mit Zinkpulver, Glasperlen und einem speziellen Haftmittel gegeben werden. 
          Durch die ständige Bewegung schlagen die Glasperlen die Zinkpartikel auf die Oberfläche der Bauteile, wodurch eine gleichmäßige Schutzschicht entsteht. Die Dicke 
          der Beschichtung lässt sich präzise steuern und liegt in der Regel zwischen 10 und 50 Mikrometern.
          Ein wesentlicher Vorteil dieses Verfahrens ist seine Umweltfreundlichkeit, da keine chemischen Reaktionen erforderlich sind, wie es beispielsweise beim galvanischen 
          Verzinken der Fall ist. Zudem eignet sich das mechanische Verzinken besonders für hochfeste Bauteile, da es deren Materialeigenschaften nicht beeinträchtigt. Allerdings
          ist es für große oder stark strukturierte Werkstücke weniger geeignet, da das Verfahren primär für kleinere und einfach geformte Bauteile entwickelt wurde.
          </p><br></br>                     
        </div>
        <div id="Eloxieren" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Das Anodisieren</span> ist ein elektrochemisches Verfahren zur 
          gezielten Oxidation von Metallen, das eine schützende und veredelnde Oxidschicht auf der Materialoberfläche erzeugt. Allerdings eignet sich nicht jedes 
          Metall für diesen Prozess. Neben Aluminium und seinen Legierungen können auch Titan, Magnesium, Zink, Niob und Tantal anodisiert werden.
          Ähnlich wie beim Eloxieren erfolgt zunächst eine gründliche Vorbehandlung, bei der die Werkstücke gereinigt, entfettet und gegebenenfalls gebeizt werden. Diese 
          Schritte sind entscheidend für eine gleichmäßige und hochwertige Oxidschicht. Anschließend werden die Bauteile elektrochemisch behandelt, wodurch sich die gewünschte 
          Schutzschicht bildet. Die Schichtdicke hängt unter anderem von der angelegten Spannung und der Dauer des Prozesses ab.
          Zusätzlich besteht die Möglichkeit, die Oberfläche in verschiedenen Farben zu färben, bevor die poröse Oxidschicht in einem abschließenden Schritt versiegelt wird. 
          Dies erhöht die Widerstandsfähigkeit und sorgt für eine lange Haltbarkeit. Das Anodisieren verbessert nicht nur den Korrosionsschutz und die Abriebfestigkeit gegenüber 
          mechanischer Beanspruchung, sondern bietet auch vielfältige gestalterische Möglichkeiten. Zudem ist das Verfahren umweltfreundlich, da es – im Gegensatz zu galvanischen 
          Beschichtungen – ohne den Einsatz schädlicher Metalle auskommt.


          </p><br></br>                     
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "60px", color: "#333" }}>Das Eloxieren  </span> ist ein Verfahren zur elektrolytischen 
          Oxidation von Aluminium, bei dem eine schützende Oxidschicht auf der Oberfläche gebildet wird. Diese Schicht bewahrt das Material vor Korrosion und 
          verbessert seine Widerstandsfähigkeit. Dabei wird die oberste Metallschicht gezielt in Aluminiumoxid bzw. Hydroxid umgewandelt, wodurch eine widerstandsfähige 
          und gleichmäßige Schutzschicht entsteht.
            Die Dicke der Eloxalschicht beträgt in der Regel zwischen 5 und 25 Mikrometern, kann jedoch für spezielle Anwendungen auch dicker ausgeführt werden. Eine 
            fehlerfreie, geschlossene Struktur ist essenziell, um die Schutzfunktion vollständig zu gewährleisten. Neben der Korrosionsbeständigkeit bietet das 
            Verfahren weitere Vorteile: Die Oberfläche wird deutlich härter (Standard: 200–350 HV, Harteloxal: bis zu 600 HV), das Material erhält eine elektrische 
            Isolierung und die Reibungseigenschaften werden verbessert.
            Ein besonderer Vorteil des Eloxierens ist die gleichmäßige Beschichtung selbst bei komplexen Geometrien. Die entstehende Oxidschicht besitzt zunächst 
            Mikroporen, die durch ein abschließendes Verdichten oder Versiegeln verschlossen werden. Die Qualität der Schicht hängt stark von der Reinheit des 
            Aluminiums ab – während reines Aluminium ideale Ergebnisse liefert, können bestimmte Legierungen zu Unregelmäßigkeiten führen. Daher sollte die 
            Materialzusammensetzung sorgfältig auf die Anforderungen abgestimmt und die Empfehlungen des Eloxalbetriebs berücksichtigt werden.
            Der Prozess beginnt mit einer gründlichen Vorbehandlung, bei der die Werkstücke entfettet und gebeizt werden. Anschließend erfolgt die elektrolytische 
            Oxidation. Danach kann das eloxierte Material in verschiedenen Farben eingefärbt oder mit speziellen Verfahren partiell behandelt werden. Zudem lassen 
            sich Eloxalschichten bei Bedarf auch wieder entfernen.
          </p><br></br>                     
        </div>
        <div id="Strahlen" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Beim Strahlen </span> wird ein Strahlmittel mit hoher 
          Geschwindigkeit (bis zu 160 m/s) auf die Oberfläche eines Werkstücks gelenkt. Je nach Ziel des Verfahrens kann dies entweder zu einem Materialabtrag 
          führen – beispielsweise zum Entfernen von Rost oder Lackschichten – oder zur schonenden Reinigung von Fett- und Ölfilmen, ohne dabei das Grundmaterial 
          zu beschädigen.
          </p>                    
        </div>
        <div className={styles["werwirsind"]}>
          <p><span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Typische Anwendungsbereiche des Strahlens </span></p>      
        <div className={styles["ober"]}>
          <p>Glätten und Polieren: Reduzierung von Bearbeitungsspuren für eine homogenere Oberfläche</p>          
          <p>Putzen: Reinigung von Gussteilen zur Entfernung von Formsand oder anderen Rückständen</p>
          <p>Aufrauen: Verbesserung der Haftung für nachfolgende Lackierungen oder Beschichtungen</p>
          <p>Entgraten und Verrunden: Beseitigung von scharfen Schnittgraten nach der Bearbeitung</p>
          <p>Umformen: Anpassung von Metallstrukturen, etwa zur Herstellung gewölbter Bauteile</p>
          <p>Entzundern: Beseitigung von Oxidschichten nach dem Schmieden oder Schweißen</p>
          <p>Reinigung: Entfetten, Entfernen von Formrückständen oder Kokillenreinigung</p> 
          <p>Mattieren: Vorbereitung für galvanische oder andere metallische Überzüge</p> 
          <p>Materialabtrag: Entfernen von Rost, Lack oder anderen Beschichtungen</p>       
          <br></br>
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          Das passende Strahlmittel hängt von verschiedenen Faktoren ab, darunter das zu behandelnde Material, die gewünschte Oberflächenrauheit, der 
          Verwendungszweck sowie wirtschaftliche Überlegungen. Unterschiedliche Strahlmittel erfordern auch spezifische Strahlanlagen. Häufig eingesetzte 
          Strahlmittel sind:
          </p>                    
        </div>
        <div className={styles["ober"]}>
          <p>Organische Strahlmittel: Kunststoffgranulat, zermahlene Nussschalen (z. B. für sensible Oberflächen)</p>          
          
          
          
          <p>Mineralische Strahlmittel: Granatsand, Korund, Schmirgel, Hochofenschlacke, Kalk</p>
          <p>Metallische Strahlmittel: Stahlkies, Stahlkugeln, Drahtkorn, Bronzekies</p>
          <p>Glasbasierte Strahlmittel: Glasperlen, Glasbruch</p> 
          <p>Trockeneis (schonende Reinigung ohne Rückstände)</p>
          <p>Keramische Strahlmittel</p>      
          <br></br>
        </div>
        <div className={styles["ober2"]}>
          
          <p>
          Je nach Anforderung gibt es verschiedene Strahltechniken<br></br>
          Druckluftstrahlen: Hoher Materialabtrag, ideal für das Sandstrahlen grober Oberflächen<br></br>
          Niedrigdruckstrahlen: Schonender als das klassische Druckluftstrahlen, für empfindliche Oberflächen<br></br>
          Hochdruckwasserstrahlen: Besonders materialschonende Methode zur Entfernung weicher Beläge<br></br>
          Verdichtungsstrahlen: Zur gezielten Oberflächenverfestigung und Verbesserung mechanischer Eigenschaften<br></br>
          Vakuum-Saugstrahlen: Staubfreies Verfahren, häufig für die Reinigung von empfindlichen Oberflächen eingesetzt<br></br>
          Durch die Wahl des richtigen Strahlverfahrens und des passenden Strahlmittels lassen sich unterschiedlichste Anforderungen an die Oberflächenbearbeitung 
          effizient erfüllen.
          </p>                    
        </div>
        <div id="Folieren" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Industrielles Folieren </span> ist ein automatisierter Prozess, 
          bei dem Folien auf verschiedene Materialien wie Metall, Kunststoff, Holz oder Glas aufgebracht werden. Ziel ist es, diese zu schützen, zu dekorieren oder 
          ihre funktionalen Eigenschaften zu verbessern. Dieser Prozess wird großflächig in Fertigungsanlagen durchgeführt und kommt in vielen Branchen zum Einsatz, 
          darunter Bauwesen, Automobilindustrie, Verpackungsbranche und Möbelproduktion.
          Zum Schutz empfindlicher Oberflächen wie Glas, Edelstahl oder lackierter Metalle werden spezielle Schutzfolien verwendet. Diese verhindern Kratzer, 
          Schmutzablagerungen und Korrosion. Dekorative Folien finden Anwendung bei Möbeln, Türen oder Paneelen, um optische Effekte wie Holzimitationen oder 
          Metalloberflächen zu erzielen. In funktionalen Bereichen können die Folien Eigenschaften wie Hitzebeständigkeit, elektrische Isolierung oder 
          Chemikalienbeständigkeit bieten, was besonders in der Elektroindustrie von Bedeutung ist.
          Verpackungsfolien wiederum schützen Produkte während des Transports oder verlängern deren Haltbarkeit, wie es beispielsweise bei Lebensmitteln der Fall ist. 
          In der Automobilindustrie wird Folieren genutzt, um Fahrzeugteile zu schützen oder zu gestalten, etwa durch Carbon-Look-Folien.
          Vor dem Aufbringen der Folie wird die Oberfläche gründlich gereinigt und vorbereitet. Anschließend wird die Folie durch Maschinen mit Hilfe von Wärme, 
          Druck oder speziellen Klebstoffen dauerhaft fixiert. Industriegerechte Anlagen, wie Kaschieranlagen oder Vakuumpressen, sorgen dabei für eine gleichmäßige 
          und präzise Anwendung.
          Das industrielle Folieren ist ein effizientes, flexibles und kostengünstiges Verfahren, das nicht nur die Oberfläche schützt, sondern auch vielfältige 
          Gestaltungsmöglichkeiten bietet. Es ermöglicht die Veredelung verschiedenster Materialien und wird in zahlreichen Bereichen erfolgreich eingesetzt.
          </p><br></br>                     
        </div>
        <div id="Isolierstegverpressung" className={styles["ober2"]}>
          
          <p>
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}>Die Isoliersteg-Verpressung</span>, auch bekannt als  
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> Isolierverbund </span>oder
          <span style={{ fontSize: "28px", fontWeight: "bold", marginLeft: "00px", color: "#333" }}> thermische Trennung</span>
          , ist ein Verfahren, bei dem zwei Aluminiumprofile über einen Kunststoffsteg miteinander verbunden und unter Druck verpresst werden. Dieser Prozess findet 
          vor allem Anwendung im Fenster-, Türen- und Fassadenbau, um Aluminiumprofile thermisch zu trennen. Ziel ist es, die Wärmedämmung zu verbessern und den 
          Wärmefluss zwischen der Innen- und Außenseite des Profils zu verringern.
          In diesem Verfahren wird ein speziell geformter Isoliersteg aus einem wärmedämmenden Kunststoff, meist Polyamid, in die vorgesehenen Kammern der beiden 
          Aluminiumprofile eingelegt. Anschließend werden die Profile und der Isoliersteg in einer Verpressmaschine unter hohem Druck zusammengepresst. Dabei verformt 
          sich das Aluminium leicht und umschließt den Kunststoffsteg, was eine stabile mechanische Verbindung erzeugt.
          Nach dem Verpressen bleibt die Verbindung stabil, und die Profile bleiben thermisch voneinander getrennt, ohne die mechanische Stabilität zu beeinträchtigen. 
          Zu den Vorteilen dieses Verfahrens zählen eine verbesserte Wärmedämmung, die Aufrechterhaltung der Stabilität und die Vielseitigkeit des Verfahrens, da 
          unterschiedliche Profildesigns und Farben realisiert werden können.

          </p><br></br>                     
        </div>
     </div>

        
     </div>
    
    </div>
    </>
  );
};

export default Wissenswertes;
