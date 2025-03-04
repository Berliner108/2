"use client";

import React, { useState, useEffect } from "react";
import styles from "./slideshow.module.css";

const images = [
  { src: "/images/slide1.jpg", text: "Revitalisiere dein Restpulver!" },
  { src: "/images/slide2.jpg", text: "Altpulver recyclen" },
  { src: "/images/slide3.jpg", text: "Arbeitsmittel einfach beschaffen" },
  { src: "/images/slide4.jpg", text: "Über 4.000.000 Farben verfügbar" },
  { src: "/images/slide5.jpg", text: "Beschichtungs- und Serienaufträge vergeben" },
  { src: "/images/slide6.jpg", text: "Angebote einholen" },
];

const Slideshow = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 5000);
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

  const handleSearch = () => {
    alert(`Gesucht nach: ${searchQuery}`);
  };

  return (
    <div className={styles.slideshowContainer}>
      <button className={styles.prev} onClick={prevSlide}>
        ❮
      </button>

      {/* Wrapper für alle Slides */}
      <div
        className={styles.slidesWrapper}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className={styles.slide}
            style={{ backgroundImage: `url(${image.src})` }}
          >
            <p className={styles.text}>{image.text}</p>
          </div>
        ))}
      </div>

      <button className={styles.next} onClick={nextSlide}>
        ❯
      </button>

      <button className={styles.pause} onClick={() => setIsPaused(!isPaused)}>
        {isPaused ? "▶️ Start" : "⏸ Pause"}
      </button>

      {/* Suchfeld & Button */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Suche..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className={styles.searchButton} onClick={handleSearch}>
          Finden
        </button>
      </div>
    </div>
  );
};

export default Slideshow;
