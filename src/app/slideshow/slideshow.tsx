'use client';

import React, { useState, useEffect } from "react";
import styles from "./slideshow.module.css";
import Image from 'next/image'; // Importiere Image von Next.js

const images = [
  { 
    src: "/images/besch.jpg", 
    text1: "Beschichtungsaufträge unkompliziert vergeben", 
    text2: "Nasslackieren, Pulverbeschichten, Verzinken, Eloxieren, Strahlen, Entlacken, uvm.", 
    link: "/angebote" 
  },
  { 
    src: "/images/slide2.jpg", 
    text1: "Revitalisiere deine Restlacke - statt sie ungenutzt einzulagern!",
    text2: "Recycle deine Altlacke, statt für die Entsorgung zu zahlen!", 
    link: "/verkaufen" 
  },
  { 
    src: "/images/slide3.jpg", 
    text1: "Qualitative Mängel? Lieferverzug? Volle Sicherheit für Ihre Aufträge", 
    text2: "Einfache und rasche Reklamationsabwicklung mit höchster Kundenorientierung", 
    link: "/agb" 
  },
  { 
    src: "/images/slide4.jpg", 
    text1: "Alle Arbeitsmittel aus einer Hand", 
    text2: "Nasslacke, Pulverlacke, Arbeitskleidung & Arbeitsutensilien, uvm.", 
    link: "/kaufen" 
  },
  { 
    src: "/images/slide5.jpg", 
    text1: "Lassen Sie Ihr Material einlagern", 
    text2: "Und auf Abruf beschichten", 
    link: "#",
    isFullScreen: true
  },
  { 
    src: "/images/slide6.jpg", 
    text1: "Über 4.000.000 Farbtöne und Variationen verfügbar", 
    text2: "Finden Sie das passendste Angebot!", 
    link: "/kaufen" 
  },
];

const extendedImages = [images[images.length - 1], ...images, images[0]];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const nextSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => prevIndex + 1);

    setTimeout(() => {
      setIsTransitioning(false);
      if (currentIndex === images.length) {
        setCurrentIndex(1);
      }
    }, 500);
  };

  const prevSlide = () => {
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => prevIndex - 1);

    setTimeout(() => {
      setIsTransitioning(false);
      if (currentIndex === 0) {
        setCurrentIndex(images.length);
      }
    }, 500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <div className={styles.slideshowContainer}>
      <button className={styles.prev} onClick={prevSlide}>❮</button>

      <div
        className={styles.slidesWrapper}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning ? "transform 0.5s ease-in-out" : "none",
        }}
      >
        {extendedImages.map((image, index) => (
          <div 
            key={index} 
            className={`${styles.slide} ${image.isFullScreen ? styles.fullImageSlide : ""}`}
          >
            {!image.isFullScreen && (
              <div className={styles.textContainer}>
                <p className={styles.text1}>{image.text1}</p>
                <p className={styles.text2}>{image.text2}</p>
                <a href={image.link} className={styles.textLink}>Mehr erfahren</a>
              </div>
            )}

            <div className={styles.imageContainer}>
              <Image 
                src={image.src} 
                alt={`${image.text1} - ${image.text2}`} 
                width={500} // Breite des Bildes (kannst du anpassen)
                height={300} // Höhe des Bildes (kannst du anpassen)
                layout="intrinsic" // Option für flexibles Layout
              />
            </div>

            {image.isFullScreen && (
              <div className={styles.overlayTextContainer}>
                <p className={styles.overlayText1}>{image.text1}</p>
                <p className={styles.overlayText2}>{image.text2}</p>
                <a href={image.link} className={styles.overlayLink}>Mehr erfahren</a>
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
