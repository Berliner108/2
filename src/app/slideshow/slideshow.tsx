'use client';

import React, { useState, useEffect } from "react";
import styles from "./slideshow.module.css";
import Image from 'next/image';
import Link from 'next/link';

// Helper: macht aus "/seite#hash" ein { pathname, hash }-Objekt für <Link/>
function toHref(link: string): string | { pathname: string; hash: string } {
  if (!link.includes('#')) return link;
  const [pathname, rawHash] = link.split('#');
  return { pathname, hash: rawHash };
}

const images = [
  { 
    src: "/images/besch.webp", 
    text1: "Beschichtungsaufträge unkompliziert vergeben", 
    text2: "Nasslackieren, Pulverbeschichten, Verzinken, Eloxieren, Strahlen, Entlacken, uvm.", 
    link: "/angebote" 
  },
  { 
    src: "/images/slide2_zoomed_out.webp", 
    text1: "Revitalisiere deine Restlacke - statt sie ungenutzt einzulagern!",
    text2: "Recycle deine Altlacke, statt für die Entsorgung zu zahlen!", 
    link: "/verkaufen" 
  },
  { 
    src: "/images/slide3.webp", 
    text1: "Qualitative Mängel? Lieferverzug? Volle Sicherheit für Ihre Aufträge", 
    text2: "Einfache und rasche Reklamationsabwicklung mit höchster Kundenorientierung", 
    link: "/wissenswertes#Sofunktioniert’s" // funktioniert jetzt zuverlässig
  },
  { 
    src: "/images/slide4.webp", 
    text1: "Alle Arbeitsmittel für Beschichter aus einer Hand", 
    text2: "Nasslacke, Pulverlacke, Arbeitskleidung & Arbeitsutensilien, uvm.", 
    link: "/kaufen?kategorie=Arbeitsmittel"
  },
  { 
    src: "/images/slide5.webp", 
    text1: "Lassen Sie Ihr Material einlagern", 
    text2: "Und auf Abruf beschichten", 
    link: "/angebote",
    isFullScreen: true
  },
  { 
    src: "/images/slide6.webp", 
    text1: "Über 4.000.000 Farbtöne und Variationen verfügbar", 
    text2: "Finden Sie das passendste Angebot!", 
    link: "/kaufen" 
  },
];

const extendedImages = [images[images.length - 1], ...images, images[0]];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const transitionDuration = 1000; // ms

  const nextSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => prevIndex + 1);

    setTimeout(() => {
      setIsTransitioning(false);
      if (currentIndex === images.length) {
        setCurrentIndex(1);
      }
    }, transitionDuration);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => prevIndex - 1);

    setTimeout(() => {
      setIsTransitioning(false);
      if (currentIndex === 0) {
        setCurrentIndex(images.length);
      }
    }, transitionDuration);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(interval);
  }, [currentIndex]); // bewusst wie bei dir gelassen

  return (
    <div className={styles.slideshowContainer}>
      <button className={styles.prev} onClick={prevSlide}>❮</button>

      <div
        className={styles.slidesWrapper}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning ? `transform ${transitionDuration}ms ease-in-out` : "none",
        }}
      >
        {extendedImages.map((image, index) => (
          <div 
            key={index} 
            className={`${styles.slide} 
              ${image.isFullScreen ? styles.fullImageSlide : ""} 
              ${image.src.includes("slide5") ? styles.slide5 : ""}`}
          >
            {!image.isFullScreen && (
              <div className={styles.textContainer}>
                <p className={styles.text1}>{image.text1}</p>
                <p className={styles.text2}>{image.text2}</p>

                {/* WICHTIG: Next Link mit Hash-Unterstützung */}
                <Link href={toHref(image.link)} scroll className={styles.textLink}>
                  Mehr erfahren
                </Link>
              </div>
            )}

            <div className={styles.imageContainer}>
              <Image 
                src={image.src} 
                alt={`${image.text1} - ${image.text2}`} 
                width={500}
                height={300}
                // layout ist in neueren Next-Versionen deprecated; width/height reicht
              />
            </div>

            {image.isFullScreen && (
              <div className={styles.overlayTextContainer}>
                <p className={styles.overlayText1}>{image.text1}</p>
                <p className={styles.overlayText2}>{image.text2}</p>

                {/* auch hier Next Link */}
                <Link href={toHref(image.link)} scroll className={styles.overlayLink}>
                  Mehr erfahren
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className={styles.next} onClick={nextSlide}>❯</button>
    </div>
  );
};

export default Slideshow;
