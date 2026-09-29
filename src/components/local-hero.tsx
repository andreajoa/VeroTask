import Image from "next/image";
import type { ReactNode } from "react";
import type { CityPhoto } from "@/lib/local-guides";
import type { PublicLocale } from "@/lib/site-copy";

const creditLabel = { en: "Photo", "pt-br": "Foto", es: "Foto" } as const;

/**
 * Local page hero: a real, openly licensed photo of the city as the back plane, a legibility scrim as the middle
 * plane and the content card in front. The photo drifts slower than the page ([data-depth], see LocalMotion).
 * The author credit sits on the image itself, as the licenses (and one author explicitly) ask.
 */
export function LocalHero({ photo, locale, children }: { photo: CityPhoto; locale: PublicLocale; children: ReactNode }) {
  return (
    <section className="lg-hero">
      <div className="lg-hero-plane" data-depth="0.18">
        <Image
          src={photo.src}
          alt={photo.alt[locale]}
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover"
        />
      </div>
      <div className="lg-hero-scrim" aria-hidden="true" />
      <div className="container-shell relative z-10 flex min-h-[inherit] items-end pb-10 pt-24 sm:pb-14">
        <div className="lg-hero-card">{children}</div>
      </div>
      <a href={photo.source} target="_blank" rel="noopener noreferrer license" className="lg-credit">
        {creditLabel[locale]}: {photo.credit} · {photo.license}
      </a>
    </section>
  );
}
