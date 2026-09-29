import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  Boxes,
  Building2,
  Check,
  FileText,
  Images,
  Map,
  MapPin,
  MessageCircle,
  Sparkles,
  View,
  type LucideIcon,
} from 'lucide-react';
import type { ToolboxContent, ToolboxIconName } from '@/lib/toolbox';
import styles from './toolbox.module.css';
import { ToolboxMotion } from './ToolboxMotion';
import { MotivationalCarousel, UpdateImageCarousel } from './ToolboxCarousels';

const ICONS: Record<ToolboxIconName, LucideIcon> = {
  presentation: FileText,
  finishes: Boxes,
  gallery: Images,
  prices: BadgeDollarSign,
  masterplan: Map,
  availability: Building2,
  location: MapPin,
  contact: MessageCircle,
};

export function ToolboxLanding({ content }: { content: ToolboxContent }) {
  const now = new Date();
  const currentDate = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Cancun',
  }).format(now);

  return (
    <main className={styles.page}>
      <ToolboxMotion />
      <section className={styles.heroShell}>
        <div className={styles.hero}>
          <Image
            src={content.heroImage}
            alt={`Acceso a ${content.brandName}`}
            fill
            priority
            sizes="100vw"
            className={styles.coverImage}
          />
          <div className={styles.heroShade} />

          <header className={styles.header}>
            <div className={styles.brandLockup}>
              <Image
                src={content.logoImage}
                alt="Ciudad Mayakoba"
                width={160}
                height={50}
                priority
                className={styles.logo}
              />
              <span className={styles.brandDivider} />
              <span className={styles.brandName}>{content.brandName}</span>
            </div>
            <nav aria-label="Navegación principal" className={styles.nav}>
              <a href="#recursos">Herramientas</a>
              <a className={styles.headerCta} href={content.tourUrl} target="_blank" rel="noopener noreferrer">
                Tour 360°
                <span><ArrowUpRight aria-hidden="true" /></span>
              </a>
            </nav>
          </header>

          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <div className={styles.statusPill}>
                <span><Check aria-hidden="true" /></span>
                <time dateTime={now.toISOString()}>Actualizado {currentDate}</time>
              </div>
              <p className={styles.statusLabel}>{content.statusLabel}</p>
              <p className={styles.eyebrowLight}>{content.heroEyebrow}</p>
              <h1>{content.heroTitle}</h1>
              <p className={styles.heroBody}>{content.heroBody}</p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#recursos">
                  {content.primaryCtaLabel}
                  <span><ArrowDown aria-hidden="true" /></span>
                </a>
                <a className={styles.textLinkLight} href={content.tourUrl} target="_blank" rel="noopener noreferrer">
                  Ver experiencia 360° <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className={styles.heroMetric} aria-label={`${content.resources.length} herramientas comerciales disponibles`}>
              <span className={styles.metricNumber}>{String(content.resources.length).padStart(2, '0')}</span>
              <span>recursos para<br />vender mejor</span>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className={styles.resourcesSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro} data-toolbox-reveal>
            <div>
              <p className={styles.eyebrow}>{content.resourcesEyebrow}</p>
              <h2>{content.resourcesTitle}</h2>
            </div>
            <p>{content.resourcesBody}</p>
          </div>

          <div className={styles.resourceGrid}>
            {content.resources.map((resource, index) => {
              const Icon = ICONS[resource.icon] ?? FileText;
              return (
                <a
                  key={resource.id}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${resource.title} en una pestaña nueva`}
                  className={styles.resourceCard}
                  data-toolbox-reveal
                  style={{ '--delay': `${index * 45}ms` } as CSSProperties}
                >
                  <div className={styles.cardTopline}>
                    <span className={styles.resourceIcon}><Icon aria-hidden="true" /></span>
                    <span className={styles.resourceIndex}>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className={styles.cardCopy}>
                    <h3>{resource.title}</h3>
                    <p>{resource.description}</p>
                  </div>
                  <div className={styles.cardAction}>
                    Abrir recurso <ArrowUpRight aria-hidden="true" />
                  </div>
                </a>
              );
            })}
            {content.resources.length === 0 && (
              <div className={styles.emptyResources}>
                <span><Sparkles aria-hidden="true" /></span>
                <div>
                  <h3>El kit comercial se está actualizando.</h3>
                  <p>Vuelve en unos minutos para consultar los materiales vigentes.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <MotivationalCarousel
        eyebrow={content.motivationalEyebrow}
        title={content.motivationalTitle}
        messages={content.motivationalMessages}
      />

      <section className={styles.featureShell}>
        <a
          href={content.tourUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${content.tourLabel}, abre en una pestaña nueva`}
          className={styles.tourFeature}
          data-toolbox-reveal
        >
          <div className={styles.tourImageWrap}>
            <Image src={content.tourImage} alt="Naturaleza en Jardines de Ciudad Mayakoba" fill sizes="(max-width: 860px) 100vw, 58vw" className={styles.coverImage} />
            <div className={styles.imageShade} />
            <div className={styles.imageBadge}><View aria-hidden="true" /> Recorrido inmersivo</div>
          </div>
          <div className={styles.tourCopy}>
            <p className={styles.eyebrowAccent}>{content.tourEyebrow}</p>
            <h2>{content.tourTitle}</h2>
            <p>{content.tourBody}</p>
            <span className={styles.accentButton}>
              {content.tourLabel}
              <span><ArrowUpRight aria-hidden="true" /></span>
            </span>
          </div>
        </a>
      </section>

      <section className={styles.storySection}>
        <div className={styles.storyCard} data-toolbox-reveal>
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>{content.storyEyebrow}</p>
            <h2>{content.storyTitle}</h2>
            <p>{content.storyBody}</p>
            <div className={styles.storyFacts}>
              <span><Sparkles aria-hidden="true" /> Comunidad planeada</span>
              <span><MapPin aria-hidden="true" /> Playa del Carmen</span>
            </div>
          </div>
          <div className={styles.storyImageWrap}>
            <Image src={content.storyImage} alt="Interior residencial de Jardines de Ciudad Mayakoba" fill sizes="(max-width: 860px) 100vw, 50vw" className={styles.coverImage} />
          </div>
        </div>
      </section>

      <section className={styles.updatesSection} aria-labelledby="toolbox-updates-title">
        <div className={styles.updatesInner} data-toolbox-reveal>
          <div className={styles.updatesIntro}>
            <div className={styles.updatesIcon}><Bell aria-hidden="true" /></div>
            <div>
              <p className={styles.eyebrow}>{content.updatesEyebrow}</p>
              <h2 id="toolbox-updates-title">{content.updatesTitle}</h2>
              <p>{content.updatesBody}</p>
            </div>
          </div>

          <div className={styles.updatesList}>
            {content.updates.map((update, index) => (
              <article className={styles.updateCard} key={update.id}>
                <span className={styles.updateIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{update.title}</h3>
                  <p>{update.description}</p>
                  {update.href && (
                    <a href={update.href} target="_blank" rel="noopener noreferrer">
                      {update.linkLabel || 'Consultar actualización'} <ArrowUpRight aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            ))}
            {content.updates.length === 0 && (
              <div className={styles.updatesEmpty}>
                <Check aria-hidden="true" />
                <div>
                  <h3>Todo al día.</h3>
                  <p>No hay avisos nuevos para el equipo comercial.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <UpdateImageCarousel
        eyebrow={content.galleryEyebrow}
        title={content.galleryTitle}
        body={content.galleryBody}
        images={content.updateImages}
        fallback={{
          id: 'catalogo-destacado',
          image: content.catalogImage,
          alt: `Catálogo comercial de ${content.brandName}`,
          title: content.catalogTitle,
          description: content.catalogBody,
          href: content.catalogHref,
          linkLabel: content.catalogLinkLabel,
        }}
      />

      <footer className={styles.footer}>
        <div>
          <p>{content.footerNote}</p>
          <span>Información de uso comercial. Verifica la vigencia antes de compartir.</span>
        </div>
        <Link href="/" className={styles.elevaLink}>
          Desarrollado con Eleva360 <ArrowRight aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
