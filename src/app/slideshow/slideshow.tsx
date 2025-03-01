"use client";

import React, { useState, useEffect } from "react";
import styles from "./slideshow.module.css";

const images = [
  { src: "/images/slide1.jpg", text: "Bild 1 - Willkommen!" },
  { src: "/images/slide2.jpg", text: "Bild 2 - Mehr erfahren" },
  { src: "/images/slide3.jpg", text: "Bild 3 - Angebote" },
  { src: "/images/slide4.jpg", text: "Bild 4 - Kontakt" },
  { src: "/images/slide5.jpg", text: "Bild 5 - Neuigkeiten" },
  { src: "/images/slide6.jpg", text: "Bild 6 - Abschied" },
];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000); // Alle 3 Sekunden wechseln
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className={styles.slideshowContainer}>
      <button className={styles.prev} onClick={prevSlide}>
        ❮
      </button>

      <div className={styles.slide} style={{ backgroundImage: `url(${images[currentIndex].src})` }}>
        <p className={styles.text}>{images[currentIndex].text}</p>
      </div>

      <button className={styles.next} onClick={nextSlide}>
        ❯
      </button>

      <button className={styles.pause} onClick={() => setIsPaused(!isPaused)}>
        {isPaused ? "▶️ Start" : "⏸ Pause"}
      </button>
    </div>
  );
};

export default Slideshow;
