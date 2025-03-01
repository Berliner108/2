"use client";

import React from "react";
import styles from "./wissenswertes.module.css";
import Image from "next/image";
import Link from "next/link"; // Für den Button zur Startseite

const Wissenswertes = () => {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kominiert' }] },
            { title: 'Kaufen', href: '/kaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kominiert' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Offene Lackanfragen', href: '/lackanfragen', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/about/vision', text: 'Die Vision' },{ href: '/about/vision', text: 'Oberlächentechnik' }, { href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/support/help', text: 'Eingeholte Angebote' }, { href: '/support/contact', text: 'Meine Käufe' }, { href: '/support/contact', text: 'Offene Lackanfragen' }, { href: '/support/contact', text: 'Meine Aufträge' }, { href: '/support/contact', text: 'Aktive Artikel' }, { href: '/support/contact', text: 'Verkaufte Artikel' }, { href: '/support/contact', text: 'Angebotene Artikel' }] }
          ].map((item, index) => (
            <li key={index} className={styles.navItem}>
              <Link href={item.href} className={styles.navButton}>
                {item.title}
              </Link>
              <div className={styles.dropdown}>
                {item.links.map((link, linkIndex) => (
                  <Link key={linkIndex} href={link.href} className={styles.dropdownLink}>
                    {link.text}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.container}>
      <h1>Über Uns</h1>
      
      <div className={styles.textContent}>
        
        <p>
          Wir sind die erste Plattform für reine Oberflächentechnik. Eine Plattform:</p>
          <p>Die es Kunden ermöglicht innerhalb kürzester Zeit ihren passenden Oberflächentechniker zu finden</p>
          <p>Die es Oberflächentechnikern ermöglicht ihren Absatz zu steigern</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p>          
          <p>Die es Oberflächentechnikern ermöglicht den passendsten Lieferanten für ihre Verbrauchsartikel zu finden</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p><br></br>
          <p>Alles, was wir machen, machen wir mit dem Glauben, den Status Quo in der Oberflächentechnik herauszufordern.
          Wir glauben daran, dass wir anders denken. Wir machen das, indem wir auf Nachhaltigkeit, Nutzerfreundlichkeit und Wirtschaftlichkeit setzen.
          Wir freuen uns, besondere Lösungen anzubieten. Wollen Sie auch Teil davon sein?
        </p>
      </div>
      <h1>So funktionierts</h1>

      <div className={styles.imageGallery}>
        
        
        <div className={styles.imageContainer}>
          <Image
            src="/images/sofunktionierts.jpg" // Ersetze mit deinem Bildpfad
            alt="Bild 3"
            width={400}
            height={300}
            className={styles.image}
          />
        </div>
      </div>
      <h1>Die Oberflächentechnik</h1>
      <div className={styles.textContent}>
        
        <p>
        Oberflächentechnik ist ein Bereich der Materialwissenschaften, der sich mit der Veränderung und Verbesserung der Eigenschaften von Oberflächen befasst.
          Ziel ist es, die Funktionalität, Haltbarkeit, Ästhetik und andere spezifische Eigenschaften von Werkstoffen oder Bauteilen zu optimieren.
          
          Die Anwendungen der Oberflächentechnik reichen von der Verhinderung von Korrosion und Verschleiß bis hin zur Verbesserung von chemischen, elektrischen und 
            mechanischen Eigenschaften sowie der optischen Gestaltung. In der Oberflächentechnik wird die Oberfläche eines Materials behandelt, 
            ohne das gesamte Material zu verändern. Dies ermöglicht eine gezielte Anpassung an die Bedürfnisse des jeweiligen Einsatzes. Diese Verfahren sind 
            in vielen Industrien von großer Bedeutung, z. B. in der Automobilindustrie, Luft- und Raumfahrt, Maschinenbau, Medizintechnik und Elektronik.
            <br></br><br></br>Zu den wichtigsten Zielen der Oberflächentechnik zählen:</p>
            <p>• Schutz: Die Oberfläche wird so behandelt, dass sie gegenüber Umwelteinflüssen wie Korrosion, Abrieb, Kratzern oder UV-Strahlung widerstandsfähiger wird.</p>
            <p>• Funktionalität: Die Oberfläche wird mit spezifischen Eigenschaften ausgestattet, etwa durch Verbesserung der Haftung, Gleitfähigkeit, elektrischen Leitfähigkeit oder Wärmeleitfähigkeit.</p>
            <p>• Optik: Oberflächenbehandlungen wie Lackierungen oder Beschichtungen verändern das Aussehen des Materials, etwa durch Farbgebung, Glanz oder Textur.</p>
            <p>• Hygiene und Reinheit: Die Oberflächenbehandlung kann die Reinigung erleichtern und Schmutzanhaftungen reduzieren, was besonders in der Medizintechnik oder Lebensmittelindustrie wichtig ist.
            
        </p>
        <p>        
            <br></br><br></br>Die Hauptverfahren der Oberflächentechnik sind vielfältig und reichen von mechanischen über chemische bis hin zu galvanischen und thermischen Verfahren:</p>
            <p>• Mechanische Verfahren: Hierzu zählen Techniken wie Schleifen, Polieren, Bürsten oder Strahlen, bei denen die Oberfläche durch mechanische Einwirkung geglättet oder strukturiert wird. Ein Beispiel ist das Sandstrahlen, bei dem eine abrasive Strahlung verwendet wird, um die Oberfläche zu reinigen oder eine bestimmte Rauheit zu erzeugen. Auch Nasslackieren, Folieren, verrollen mittels Isoliersteg und das mechanische Entlacken zählen zu den mechanischen Verfahren in der Oberflächentechnik.</p>
            <p>• Chemische Verfahren: Diese Verfahren beinhalten Behandlungen mit Chemikalien, die die Oberflächenstruktur oder -beschaffenheit verändern. Zu den bekanntesten chemischen Prozessen zählen das Beizen, bei dem unerwünschte Oxidschichten entfernt werden, und das Passivieren, bei dem eine Schutzschicht gebildet wird, um das Material vor Korrosion zu schützen. Ein weiteres Verfahren ist das Anodisieren, bei dem eine stabile Oxidschicht auf verschiedenen Metalloberflächen erzeugt wird.</p>
            <p>• Galvanische Verfahren: Diese Verfahren basieren auf Elektrolyseprozessen, bei denen Metallionen aus einer Lösung auf die Oberfläche eines Werkstücks abgeschieden werden. Ein bekanntes Beispiel ist das Verchromen, bei dem eine dünne Chromschicht auf ein Werkstück aufgebracht wird, um die Korrosionsbeständigkeit zu erhöhen. Weitere Verfahren sind Vernickeln oder Verzinken.</p>
            <p>• Thermische Verfahren: Bei diesen Verfahren wird das Material erhitzt, um eine Beschichtung zu erzeugen. Beispiele sind das Flammspritzen, bei dem geschmolzene Metalle auf die Oberfläche eines Bauteils aufgebracht werden, oder das Pulverbeschichten, bei dem ein Pulver durch Erhitzen zu einer dauerhaften Schicht verschmilzt.
            Oberflächentechniken verlängern die Lebensdauer von Produkten steigern deren Leistungsfähigkeit und sind gleichzeitig eine kostengünstige Lösung für die Optimierung von Bauteilen.
            
        </p>
      </div>
      <h1>Die Prozesse</h1>
      <div className={styles.textContent}>
        
        <p>
        <b>Pulverbeschichtung:</b> Die Pulverbeschichtung (oder Thermolackierung bzw. Pulverlackierung) ist ein Beschichtungsverfahren, bei dem ein elektrisch leitfähiges 
        Substrat mit Pulverlack beschichtet wird. Meistens sind diese Substrate aus Aluminium, Stahl, verzinktem Stahl, Edelstahl oder Messing, es können aber auch 
        andere Materialien pulverbeschichtet werden. Damit eine Beschichtung ihre Anforderungen erfüllen kann, ist vor der Applikation des Lacks eine Vorbehandlung 
        nötig. Diese besteht oft aus einer Entfettung, Beize und Passivierung. Je nach Substrat unterscheiden sich die eingesetzten Mittel zur Vorbehandlung. 
        Anschließend werden die Werkstücke getrocknet und beschichtet. Im Einbrennofen vernetzt sich das auf dem Substrat applizierte Pulver bei 110 – 250 °C und 
        bildet anschließend eine dekorative Schutzschicht. Werkstücke mit Abmessungen bis zu (HxBxT) 10x5x3 m, in Sonderfällen auch größer, können mit Pulverlack 
        beschichtet werden. Typische Schichtdicken bei einer einfachen Pulverbeschichtung sind 60 – 120 µm, je nach Anwendung sind aber auch dünnere oder dickere 
        Schichtdicken produzierbar. Normen: Es existieren mehrere Normen. DIN 55633 bezieht sich auf den Korrosionsschutz und die Bewertung von beschichteten 
        Stahlbauten. Für dünnwandige (Materialdicken ≤ 3 mm) legt Teil 1 der DIN 55634 „Beschichtungsstoffe und Überzüge – Korrosionsschutz von tragenden 
        dünnwandigen Bauteilen aus Stahl“ auch für Pulverbeschichtungen die Anforderungen und Prüfverfahren fest. EN 15773 bezieht sich auf die Pulverbeschichtung 
        von feuerverzinkten und sherardisierten Gegenständen aus Stahl. Pulverlacke: Pulverlacke sind in sehr vielen verschiedenen Variationen kommerziell erhältlich. 
        Die meisten Pulverlacke haben Polyamid, Polyesterharz oder Epoxidharz als Basis. Pulverlacke unterscheiden sich je nach Zusammensetzung in Farben & Erscheinung, 
        Glanzgraden, Oberflächenstrukturen, Verarbeitung, Einsatzzwecken und Eigenschaften gegenüber äußeren Einflüssen. Es sind kratzresistente, elektrisch 
        ableitfähige, hochwetterfeste, anti-Graffiti, fluoreszierende, metallic, anti-Quietsch, anti-Rutsch, anti-Ausgasung und weitere Variationen erhältlich, 
        je nach geforderter Anwendung. Pulverlacke sind auf Kundenwunsch auch nach Vorlage oder individuellen Bedürfnissen produzierbar.          
        </p>
        <p>
        <b>Nasslackieren:</b> Nasslackieren ist ein Verfahren zur Beschichtung von Oberflächen mit flüssigem Lack Es wird verwendet um Bauteile sowohl optisch aufzuwerten 
        als auch vor äußeren Einflüssen wie Korrosion chemischen Belastungen oder UV-Strahlung zu schützen Dabei entsteht eine geschlossene und haftfeste Lackschicht 
        die sowohl funktionale als auch dekorative Eigenschaften haben kann Der Lack beim Nasslackieren besteht aus einer Mischung von Bindemitteln Pigmenten Additiven
         und Lösungsmitteln Nach dem Auftragen verdunsten die Lösungsmittel sodass die Lackschicht aushärtet und eine dauerhafte Beschichtung bildet Je nach Anforderung
          können Lacke mit unterschiedlichen Eigenschaften verwendet werden zum Beispiel hitzebeständige kratzfeste oder besonders chemikalienresistente Varianten Das
           Verfahren wird in vielen Branchen angewendet darunter Automobilbau Maschinenbau Möbelindustrie und Elektronik Es eignet sich für eine Vielzahl von 
           Materialien wie Metall Kunststoff Holz oder Glas und erlaubt durch die große Auswahl an Farben und Glanzgraden eine hohe Gestaltungsfreiheit Beim
            Nasslackieren wird die Oberfläche zunächst gereinigt entfettet und gegebenenfalls aufgeraut oder grundiert um eine optimale Haftung zu gewährleisten 
            Der Lack wird anschließend mit Spritzpistolen Bürsten oder Walzen in dünnen Schichten aufgetragen Jede Schicht muss in der Regel zwischen den 
            Arbeitsschritten trocknen um ein gleichmäßiges und hochwertiges Ergebnis zu erzielen Es gibt verschiedene Techniken beim Nasslackieren darunter 
            Airless-Spritzen elektrostatisches Spritzen oder Spritzlackieren mit Druckluft Jede Technik hat spezifische Vor- und Nachteile und wird je nach 
            Bauteilgröße Geometrie oder Anwendungsbereich eingesetzt Vorteile des Nasslackierens sind die hohe Flexibilität die Möglichkeit komplexe Geometrien 
            zu beschichten und die große Auswahl an Oberflächeneffekten Allerdings ist das Verfahren oft arbeitsintensiver als andere Beschichtungsmethoden und 
            erfordert eine kontrollierte Umgebung beispielsweise für die Trocknung und das Ablüften der Lösungsmittel.         
        </p>
        <p>
        <b>Entlacken:</b> Beim Entlacken werden alte Lackschichten entfernt. Je nachdem welcher Werkstoff und welche Beschichtung eingesetzt wurden, stehen 
        verschiedene Verfahren und Mittel zur Verfügung. Entscheidend für den Kunden oder Dienstleister ist, wie die gewünschte Qualität am günstigsten 
        erreicht werden kann. Mittlerweile gibt es auch für Entlacker ein Gütesiegel (Qualistrip) welches sicherstellt, dass die zertifizierten Betriebe 
        vorgegebene Standards einhalten. Ziel beim Entlacken ist es, wieder eine beschichtungsfähige Oberfläche zu erhalten. Entlackungsmethoden lassen sich 
        unterteilen in chemische, thermische und mechanische Entlackung. Es sind jeweils unterschiedliche Varianten im Einsatz mit unterschiedlichem Ergebnis.         
        </p>
      </div>
      <div className={styles.imageGallery}>
        
        
        <div className={styles.imageContainer}>
          <Image
            src="/images/entlacken.jpg" // Ersetze mit deinem Bildpfad
            alt="Bild 3"
            width={400}
            height={300}
            className={styles.image}
          />
        </div>
      </div>

      <div className={styles.textContent}>
        
        <p>
        <b>Schmelztauchen:</b> Beim Schmelztauchen wird ein Werkstück aus Metall in ein Bad aus einem verflüssigten anderen Metall getaucht. Das Werkstück muss 
        dafür einen bedeutend höheren Schmelzpunkt haben als das flüssige Metall im Bad, damit das Werkstück sich nicht verflüssigt. Ebenso muss das 
        flüssige Metall auch haften bleiben, damit das Werkstück benetzt wird. Nach dem Herausheben des Werkstücks aus dem Bad, bildet sich nach dem 
        Aushärten so eine feste Schutzschicht. Häufig passiert dies um den Werkstücken besseren Korrosionsschutz, höhere Lebensmittelverträglichkeit, 
        veränderte elektrische Leitfähigkeit oder bessere Lötbarkeit zu geben. Die am häufigsten verbreiteten Verfahren sind das Feuerverzinken, das 
        Feuerverzinnen, das Feuerverbleien und das Feueraluminieren. Gegenüber galvanischen Verfahren erhält man beim Schmelztauchen eine viel bessere 
        Haftfestigkeit von Überzug zu Werkstück. Ebenso erhält man beim Schmelztauchen höhere Schichtdicken, wodurch der Korrosionsschutz erhöht wird. 
        Darüber hinaus sind Duplex Beschichtungen möglich, wobei eine weitere Schicht Lack auf die Zinkschicht aufgetragen wird. Dies kann zu dekorativen 
        oder zu Zwecken des Korrosionsschutzes erfolgen. Das Verfahren ist nachhaltig, da Zink recycelbar ist.         
        </p>
        <p>
        <b>Verzinken & Entzinken:</b> Beim Verzinken wird meistens Stahl mit einer dünnen Schicht Zink überzogen, um ihn vor Korrosion zu schützen. Dafür gibt es 
        verschiedene Verfahren mit unterschiedlichen Parametern.       
        </p>
        <p>
        <b>Feuerverzinken:</b> Beim Feuerverzinken werden die zu verzinkenden Werkstücke in ein Bad aus flüssigem Zink getaucht. Zuvor müssen die Werkstücke 
        gründlich gereinigt werden um Öl, Fett, Rost oder andere Verunreinigungen zu entfernen. Die Reinigungsschritte umfassen Entfetten, Beizen 
        (zur Entfernung von Oxidschichten mit Säure) und Flussmittelauftrag, um die Oberfläche für die Zinkbeschichtung vorzubereiten. Anschließend 
        werden die vorbehandelten Werkstücke in das ca. 450°C heiße Zinkbad getaucht, wobei das geschmolzene Zink mit dem Eisen oder Stahl eine feste 
        gebundene Zinkschicht bildet. Zuletzt werden die Werkstücke langsam abgekühlt und man erhält eine gleichmäßige Schutzschicht. Je nach Umgebung 
        werden die Werkstücke so mehrere Jahrzehnte (ca. 50 Jahre) vor Rostbildung geschützt.        
        </p>
      </div>
      <div className={styles.textContent}>
        
        <p>
        <b>Spritzverzinken:</b> Anders als beim Feuerverzinken erfolgt die Beschichtung durch Aufspritzen von geschmolzenem Zink auf die Oberfläche. Die Reinigung 
        erfolgt dabei mechanisch (z.B. durch Sandstrahlen oder Kugelstrahlen), um Rost, Schmutz und Oxidschichten zu entfernen. Danach wird Zink in einem 
        Brenner oder Lichtbogen erhitzt und geschmolzen. Das flüssige Zink wird durch Druckluft zerstäubt und in feinster Form auf die vorbereitete Oberfläche 
        gespritzt. Abschließend kühlen die Zinkpartikel beim Kontakt mit der Oberfläche ab und bilden eine haftende Schutzschicht. Das Verfahren ist mobil einsetzbar, 
        wodurch es für große und komplexe Strukturen geeignet ist. Ebenso ist es schonend für die Werkstücke selbst, da die Werkstücke keiner großen Hitzeeinwirkung 
        ausgesetzt sind (wichtig für temperaturempfindliche Bauteile). Schichtdicken sind variabel produzierbar, je nach Auftrag. Ebenso lassen sich Fehlstellen durch 
        dieses Verfahren gut ausbessern. Nachteile dieses Verfahrens sind die geringere Widerstandsfähigkeit gegen mechanische Belastungen und die kürzere Lebensdauer 
        im Vergleich zu metallurgisch gebundenen Zinkschichten.         
        </p>
        <p>
        <b>Diffusionsverzinken bzw. Sherardisieren:</b> Bei diesem Verfahren wird Zink in fester Phase auf die Oberfläche von Stahl oder Eisen übertragen. Es entsteht eine 
        Legierung, die durch Diffusion fest mit dem Grundwerkstoff verbunden ist. Dafür müssen die Werkstücke vorab gereinigt werden, um Fett, Schmutz und Oxidreste 
        zu entfernen. Anschließend wird das Werkstück zusammen mit Zinkpulver oder einer Zinkpulver-Mischung in einen rotierenden, geschlossenen Behälter gegeben. 
        Die Mischung enthält oft zusätzlich Stoffe wie Quarzsand, um eine gleichmäßige Verteilung zu gewährleisten. Der Behälter wird auf Temperaturen zwischen 
        300-400°C erhitzt. Das Zink diffundiert in die Stahloberfläche und bildet eine Zink-Eisen-Legierung. Nach dem Prozess wird das Werkstück abgekühlt und 
        die Oberfläche von überschüssigem Zinkpulver gereinigt. Vorteilhaft bei diesem Verfahren ist extrem hohe Widerstandsfähigkeit gegenüber mechanischer
        Beanspruchung, gleichmäßige Beschichtung auch von komplexen Geometrien, hohe Haftfestigkeit und sehr guter Korrosionsschutz, auch in aggressiven Umgebungen. 
        Nachteile sind die höheren Kosten auf Grund der Komplexität des Verfahrens und die Limitierungen in der Größe der Bauteile.       
        </p>
        <p>
        <b>Galvanisches Verzinken:</b> Das galvanische Verzinken wird vor allem dann eingesetzt, wenn Optik und Präzision wichtig sind und die Korrosionsschutzanforderungen 
        moderat sind, z. B. in Innenbereichen oder weniger aggressiven Umgebungen. Es ergänzt andere Verzinkungsverfahren wie Feuerverzinken oder Spritzverzinken 
        je nach den spezifischen Anforderungen des Bauteils. Im Gegensatz zum Feuerverzinken, das bei hohen Temperaturen erfolgt, wird beim galvanischen Verzinken 
        die Zinkschicht durch einen elektrischen Strom in einem elektrolytischen Bad abgeschieden. Die Vorbereitung erfolgt wie bei anderen Verzinkungsverfahren. 
        Anschließend taucht man die Werkstücke in eine Zinklösung, wobei das Werkstück als Kathode fungiert und eine Anode aus Zink Zinkionen in die Lösung abgibt.
         Durch Anlegen eines Gleichstroms wandern die Zinkionen zur Oberfläche des Werkstücks. Anschließend ist eine Lackierung oder Pulverbeschichtung möglich. 
         Die Zinkschichten sind dünner als beim Feuerverzinken (5-30µm), somit auch geringerer Korrosionsschutz. Jedoch ist die Oberfläche ästhetischer und glatter.
         Das Verfahren ist für Bauteile mit komplexen Geometrien, Kleinteile und Teile mit geringen Korrosionsschutzanforderungen und mechanischen Belastungen geeignet.       
        </p>
        <p>
        <b>Lamellen Verzinken:</b> Lamellenverzinken ist ein spezielles Verfahren zum Korrosionsschutz bei dem eine schützende Zinklamellenschicht in mehreren Schritten 
        auf das Werkstück aufgebracht wird Das Verfahren eignet sich besonders für kleine komplexe oder filigrane Bauteile wie Schrauben Muttern oder 
        Verbindungselemente Zunächst wird die Oberfläche durch Strahlen oder chemische Reinigung vorbereitet Danach trägt man eine Suspension aus feinen Zink- 
        und Aluminiumplättchen in einem Bindemittel auf das Werkstück auf Dies geschieht meist durch Tauchschleudern oder Sprühen Die Beschichtung wird bei etwa 
        200 bis 300 Grad Celsius in einem Ofen gehärtet Für erhöhten Schutz werden oft mehrere Schichten aufgetragen und gehärtet Die Zink- und Aluminiumlamellen 
        bilden eine chemisch widerstandsfähige Schutzbarriere Die Schicht ist dünn etwa 8 bis 20 Mikrometer haftet sehr gut und eignet sich ideal für Gewindeteile 
        Das Verfahren bietet exzellenten Korrosionsschutz auch in aggressiven Umgebungen und ist umweltfreundlich da es ohne Chrom VI auskommt Es verursacht keine 
        Wasserstoffversprödung und ist temperaturbeständig bis zu 300 Grad Celsius Allerdings ist es etwas teurer und die mechanische Belastbarkeit der Schicht ist 
        begrenzt Lamellenverzinken wird vor allem in der Automobilindustrie dem Maschinenbau und bei Befestigungselementen für Außenbereiche eingesetzt da es hohen 
        Schutz bei engen Toleranzen gewährleistet      
        </p>
        <p>
        <b>Mechanisches Verzinken:</b> Mechanisches Verzinken ist ein Verfahren, bei dem eine Zinkschicht durch mechanische Energie auf Stahl- oder Eisenoberflächen 
        aufgebracht wird Es wird vor allem für kleinere Teile wie Schrauben Muttern oder Nägel eingesetzt und bietet einen wirksamen Korrosionsschutz ohne die 
        Gefahr von Wasserstoffversprödung Beim Prozess werden die Bauteile in einem rotierenden Behälter zusammen mit Zinkpulver Glasperlen und einem speziellen 
        Haftmittel vermischt Durch die mechanische Bewegung haften die Zinkpartikel an der Oberfläche der Bauteile und bilden eine gleichmäßige Schicht. 
        Die Schichtdicke ist kontrollierbar und liegt typischerweise zwischen 10 und 50 Mikrometern Das mechanische Verzinken ist besonders umweltfreundlich 
        da keine chemischen Prozesse wie bei galvanischem Verzinken notwendig sind Es eignet sich für hochfeste Bauteile und gewährt durch die gleichmäßige 
        Beschichtung guten Korrosionsschutz Es ist jedoch weniger für große oder komplexe Bauteile geeignet da das Verfahren hauptsächlich für kleinere und 
        einfach geformte Werkstücke entwickelt wurde.       
        </p>
        <p>
        <b>Eloxieren:</b> Ist das Anodisieren von Aluminium. Beim Eloxieren wird durch elektrolytische Oxidation von Aluminiumbauteilen eine oxidische äußere 
        Schutzschicht erzeugt, welche innere Schichten des Werkstücks vor Korrosion schützt. Beim Verfahren selbst, wird die oberste Schicht des Werkstücks 
        in ein Oxid bzw. Hydroxid umgewandelt. Die Eloxalschicht hat eine Dicke von 5 – 25 µm (auch dickere Schichten sind realisierbar) und muss für ihre 
        Funktionalität frei von Rissen oder Lücken sein. Weitere positive Effekte des Eloxierens sind die erhöhte Härte der Oberfläche (Standardverfahren: 
        200 – 350 HV; Im Harteloxalverfahren bis zu 600 HV), die elektrische Isolation des Werkstücks sowie geringere Reibungswerte beim Kontakt mit verschiedenen 
        Materialien. Auch komplexe Geometrien erhalten so eine nahezu gleichmäßig dicke Aluminiumoxidschicht, welche nach der Erzeugung Mikroporen enthält. Diese 
        werden durch anschließendes Verdichten bzw. Versiegeln verschlossen. Je reiner das Material ist, desto besser sind die Eloxalergebnisse. Bei manchen 
        Anwendungen ist jedoch eine Legierung notwendig, welche zu Fehlstellen in der Oxidschicht führen. Es ist wichtig, die Legierung genau auf die Anforderungen 
        abzustimmen und die Legierungsempfehlungen des Eloxalbetriebs zu beachten. Vor dem Eloxieren werden die Werkstücke wie beim Pulverbeschichten zunächst 
        entfettet und anschließend gebeizt. Es kommen je nach Verfahren unterschiedliche Mittel zum Einsatz. Anschließend erfolgt das Eloxieren. Danach ist es 
        möglich die eloxierten Werkstücke je nach Verfahren in verschiedenen Farben zu färben. Es ist ebenso möglich, Eloxalschichten mit verschiedenen Verfahren 
        zu entfernen. Darüber hinaus ist auch partielles Eloxieren möglich.       
        </p>
        <p>
        <b>Anodisieren:</b> Das Anodisieren ist der Überbegriff für das elektrochemische Oxidieren von Metallen. Dabei bildet sich stets eine Oxidschicht zur 
        Veredelung und zum Schutz des Werkstücks. Nicht alle Metalle können anodisiert werden. Neben Aluminium und Aluminiumlegierungen können Titan, 
        Magnesium, Zink, Niob und Tantal anodisiert werden. Wie beim Eloxieren werden die Werkstücke zunächst gereinigt, entfettet und ggf. gebeizt, 
        um reine Oberflächen zu erhalten. Dies ist unabdingbar für ein gutes Ergebnis. Anschließend werden die Werkstücke elektrochemisch behandelt, 
        wodurch sie eine Oxidschicht bilden. Die Dicke der Oxidschicht wird u.A. durch die angelegte Spannung und die Verweilzeit bestimmt. Optional 
        können die Werkstücke auch gefärbt werden. Die so erhaltene poröse Oxidschicht wird anschließend versiegelt, um sie noch widerstandsfähiger 
        zu machen. Das Anodisieren erhöht den Korrosionsschutz, die Abriebfestigkeit ggü. Mechanischer Beanspruchung, ermöglicht dekorative Oberflächen 
        in verschiedenen Farben und ist zudem umweltfreundlich, da keine giftigen Metallschichten wie bei galvanischen Beschichtungen entstehen.       
        </p>
        <p>
        <b>Strahlen:</b> Beim Strahlen wird das Strahlmittel mit hoher Geschwindigkeit (bis zu 160 m/s) auf das Werkstück gelenkt. Zum einen lässt sich so ein Materialabtrag 
        (z.B. oberflächliche Rostschichten) bewerkstelligen, zum anderen können auch flüssige oder viskose Verunreinigungen (Fettschichten, Ölfilme) entfernt werden, 
        ohne dass festes Material abgelöst wird. Gestrahlt wird häufig zum:

        • Abtragen
        • Aufrauen zur Haftungsverbesserung beim Lackieren
        • Entgraten oder Verrunden von Schnittgrat
        • Entschichten (Entlacken, Entfetten, Reinigen von Kokillen)
        • Entzundern
        • Glätten / Polieren zum Entfernen von Bearbeitungsspuren
        • Mattieren als Vorbehandlung für metallische Überzüge, z.B. Vernickelung
        • Putzen zum Entfernen von Rückständen und Formsand nach dem Gießen
        • Umformen, um Wölbungen von Kuppelteilen zu fertigen

        Strahlmittel: Je nach Ziel der Bearbeitung werden unterschiedliche Strahlmittel eingesetzt. Unterschiedliche Strahlmittel können unterschiedliche 
        Anlagentypen erfordern. Kriterien für die Auswahl des Strahlmittels sind der Preis, Zweck (z.B. Rostentfernung, Graffitientfernung auf Wänden, 
        Restaurierung von Möbeln, uvm.), Ausgangsmaterial, Materialstärke und die geforderte Rautiefe. Häufig verwendete Strahlmittel sind:   
        • Stahlkies, Stahlkugeln, Drahtkorn, Bronzekies
        • Granatsand, Korund, Schmirgel, Hochofenschlacke, Kalk
        • Glasperlen, Glasbruch
        • Keramikpartikel
        • Trockeneis
        • Kunststoffe, Nussschalen

        Verfahrensvarianten:

        • Druckluftstrahlen (z.B. Sandstrahlen; für gröbere Behandlungen von Oberflächen)
        • Niedrigdruckstrahlen (geringerer Abtrag als beim Druckluftstrahlen)
        • Hochdruckwasserstrahlen (zur Entfernung weicher Materialien; werkstückschonende Methode)
        • Verdichtungsstrahlen
        • Vakuum-Saugstrahlen    
        </p>
        <p>
        <b>Industrielles Folieren:</b> ist ein automatisierter Prozess, bei dem Folie auf Materialien wie Metall, Kunststoff, Holz oder Glas aufgebracht wird, 
        um diese zu schützen, dekorieren oder ihre Funktionalität zu verbessern. Es wird in großem Maßstab in Produktionsanlagen durchgeführt und ist in 
        zahlreichen Branchen verbreitet, z. B. Bau, Automobil, Verpackung und Möbelherstellung. Zum Schutz empfindlicher Oberflächen wie Glas, Edelstahl 
        oder lackierter Bleche werden Schutzfolien verwendet, die Kratzer, Schmutz und Korrosion verhindern. Dekorative Folien kommen bei Möbeln, Türen 
        oder Paneelen zum Einsatz, um optische Aufwertungen wie Holzimitationen oder Metalloptiken zu erreichen. Funktionale Folien können Eigenschaften 
        wie Hitzebeständigkeit, elektrische Isolation oder Chemikalienresistenz bieten, etwa in der Elektroindustrie. Verpackungsfolien schützen Produkte 
        beim Transport oder steigern die Haltbarkeit, beispielsweise bei Lebensmitteln. In der Automobilindustrie wird das Verfahren für den Schutz oder 
        die Gestaltung von Fahrzeugteilen genutzt, z. B. Carbon-Look-Folien. Die Oberflächen werden vor dem Folieren gereinigt und vorbereitet, bevor die 
        Folie mithilfe von Maschinen aufgebracht wird. Wärme, Druck oder Klebstoffe fixieren die Folie dauerhaft. Industrielle Anlagen wie Kaschieranlagen 
        oder Vakuumpressen sorgen für gleichmäßige Ergebnisse. Das Verfahren ist effizient, vielseitig und kostengünstig. Es schützt Oberflächen und ermöglicht 
        kreative Designmöglichkeiten bei einer Vielzahl von Materialien.       
        </p>
        <p>
        <b>Isoliersteg Verpressung:</b> Der Prozess, bei dem zwei Profile (meist aus Aluminium) über einen Kunststoffsteg miteinander verbunden und verpresst werden, 
        wird als Isoliersteg-Verpressung, Isolierverbund oder Thermische Trennung bezeichnet. Dieser Prozess wird vor allem in der Fenster-, Türen- und 
        Fassadenbauindustrie eingesetzt, um Aluminiumprofile thermisch zu trennen. Das Ziel ist, eine Wärmedämmung zu schaffen und den Wärmefluss zwischen 
        der Innen- und Außenseite eines Profils zu minimieren. Ein speziell geformter Isoliersteg (aus wärmedämmendem Kunststoff wie Polyamid) wird in die 
        dafür vorgesehenen Kammern der beiden Aluminiumprofile eingelegt. Die Profile und der Isoliersteg werden in einer speziellen Verpressmaschine unter 
        hohem Druck zusammengedrückt. Dabei verformt sich das Aluminium leicht und umschließt den Kunststoffsteg, wodurch eine mechanische Verbindung entsteht. 
        Nach der Verpressung ist die Verbindung stabil und sorgt dafür, dass die Profile thermisch voneinander getrennt bleiben, während die mechanische Stabilität 
        erhalten bleibt. Vorteile dieses Prozesses sind die Wärmedämmung, Stabilitäterhaltung und die Vielseitigkeit (verschiedene Profildesigns und Farben 
        sind möglich).       
        </p>
      </div>

      <div className={styles.backButton}>
        <Link href="/">
          <button className={styles.button}>Zurück zur Startseite</button>
        </Link>
      </div>
      </div>
    </div>
  );
};

export default Wissenswertes;
