"use client";

import { useEffect } from "react";

/**
 * Scroll behaviour for the local guide pages (Scroll Craft devices, restrained for a working marketplace):
 * - [data-depth]      hero photo drifts slower than the page (depth plane)
 * - [data-fill-text]  words ink in as the paragraph crosses the viewport
 * - [data-reveal]     price bars / tiles animate once when they enter view
 * Everything is progressive: without JS or with reduced motion the content is fully visible and static.
 */
export function LocalMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Initial hidden states only apply once this script runs (see .lg-js in globals.css), so no-JS stays readable.
    document.documentElement.classList.add("lg-js");

    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    reveals.forEach((el) => observer.observe(el));

    const fills = Array.from(document.querySelectorAll<HTMLElement>("[data-fill-text]"));
    // Words are split on the server (<FillText>), so React owns the markup and this only sets opacity.
    const words = fills.map((el) => Array.from(el.querySelectorAll<HTMLElement>(".lg-word")));
    const depth = Array.from(document.querySelectorAll<HTMLElement>("[data-depth]"));

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight || 800;
      fills.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.35)));
        const list = words[index];
        const cursor = progress * (list.length + 6) - 3;
        list.forEach((word, i) => {
          const t = Math.min(1, Math.max(0, (cursor - i) / 3));
          word.style.opacity = (0.22 + t * 0.78).toFixed(3);
        });
      });
      depth.forEach((el) => {
        const speed = Number(el.dataset.depth || 0.25);
        const rect = el.parentElement?.getBoundingClientRect();
        if (!rect || rect.bottom < 0 || rect.top > vh) return;
        el.style.transform = `translate3d(0, ${(-rect.top * speed).toFixed(1)}px, 0) scale(1.08)`;
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

/** Server-renderable paragraph split into words for the [data-fill-text] scroll ink effect. */
export function FillText({ text, className }: { text: string; className?: string }) {
  const parts = text.trim().split(/\s+/);
  return (
    <p data-fill-text className={className}>
      {parts.map((word, index) => <span key={index} className="lg-word">{word}{index < parts.length - 1 ? " " : ""}</span>)}
    </p>
  );
}
