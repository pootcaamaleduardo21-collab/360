'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, ArrowUpRight, Quote } from 'lucide-react';
import type { ToolboxMotivationalMessage, ToolboxUpdateImage } from '@/lib/toolbox';
import styles from './toolbox.module.css';

function useCarousel(length: number, interval = 6500) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const goTo = useCallback((index: number) => {
    if (!length) return;
    setActive((index + length) % length);
  }, [length]);

  useEffect(() => {
    if (length < 2 || paused) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % length), interval);
    return () => window.clearInterval(timer);
  }, [interval, length, paused]);

  return { active, goTo, setPaused };
}

export function MotivationalCarousel({
  eyebrow,
  title,
  messages,
}: {
  eyebrow: string;
  title: string;
  messages: ToolboxMotivationalMessage[];
}) {
  const { active, goTo, setPaused } = useCarousel(messages.length);
  if (!messages.length) return null;

  return (
    <section className={styles.motivationSection} aria-roledescription="carrusel" aria-label="Mensajes para asesores">
      <div
        className={styles.motivationCard}
        data-toolbox-reveal
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className={styles.motivationHeader}>
          <div>
            <p className={styles.eyebrowAccent}>{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <span className={styles.quoteIcon}><Quote aria-hidden="true" /></span>
        </div>

        <div className={styles.motivationViewport}>
          {messages.map((item, index) => (
            <blockquote
              key={item.id}
              className={`${styles.motivationSlide} ${index === active ? styles.motivationSlideActive : ''}`}
              aria-hidden={index !== active}
            >
              <p>“{item.message}”</p>
              <footer>{item.author}</footer>
            </blockquote>
          ))}
        </div>

        <CarouselControls active={active} length={messages.length} onChange={goTo} label="mensaje" light />
      </div>
    </section>
  );
}

export function UpdateImageCarousel({
  eyebrow,
  title,
  body,
  images,
  fallback,
}: {
  eyebrow: string;
  title: string;
  body: string;
  images: ToolboxUpdateImage[];
  fallback: ToolboxUpdateImage;
}) {
  const items = images.length ? images : [fallback];
  const { active, goTo, setPaused } = useCarousel(items.length, 7000);

  return (
    <section className={styles.gallerySection} aria-labelledby="toolbox-gallery-title">
      <div className={styles.galleryIntro} data-toolbox-reveal>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id="toolbox-gallery-title">{title}</h2>
        </div>
        <p>{body}</p>
      </div>

      <div
        className={styles.galleryCarousel}
        data-toolbox-reveal
        aria-roledescription="carrusel"
        aria-label="Imágenes de actualizaciones"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {items.map((item, index) => (
          <article
            key={item.id}
            className={`${styles.gallerySlide} ${index === active ? styles.gallerySlideActive : ''}`}
            aria-hidden={index !== active}
          >
            <Image src={item.image} alt={item.alt} fill sizes="(max-width: 900px) 100vw, 1240px" className={styles.coverImage} />
            <div className={styles.galleryShade} />
            <div className={styles.galleryCopy}>
              {!images.length && <span className={styles.catalogLabel}>Catálogo destacado</span>}
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.href && (
                <a href={item.href} target="_blank" rel="noopener noreferrer" tabIndex={index === active ? 0 : -1}>
                  {item.linkLabel || 'Consultar información'} <ArrowUpRight aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
        {items.length > 1 && <CarouselControls active={active} length={items.length} onChange={goTo} label="imagen" />}
      </div>
    </section>
  );
}

function CarouselControls({
  active,
  length,
  onChange,
  label,
  light,
}: {
  active: number;
  length: number;
  onChange: (index: number) => void;
  label: string;
  light?: boolean;
}) {
  if (length < 2) return null;
  return (
    <div className={`${styles.carouselControls} ${light ? styles.carouselControlsLight : ''}`}>
      <div className={styles.carouselDots} aria-label={`Seleccionar ${label}`}>
        {Array.from({ length }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Mostrar ${label} ${index + 1}`}
            aria-current={index === active ? 'true' : undefined}
            className={index === active ? styles.carouselDotActive : ''}
            onClick={() => onChange(index)}
          />
        ))}
      </div>
      <div className={styles.carouselArrows}>
        <button type="button" aria-label={`${label} anterior`} onClick={() => onChange(active - 1)}><ArrowLeft /></button>
        <button type="button" aria-label={`${label} siguiente`} onClick={() => onChange(active + 1)}><ArrowRight /></button>
      </div>
    </div>
  );
}
