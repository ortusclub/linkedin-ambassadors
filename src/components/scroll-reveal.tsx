"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Gently fades/raises page sections into view as you scroll.
// Skips app/admin/auth pages; respects prefers-reduced-motion; degrades to
// fully-visible content if JS is off (the CSS is gated on .js-reveal).
const SKIP_PREFIXES = ["/admin", "/dashboard", "/login", "/register", "/profile", "/checkout"];

export function ScrollReveal() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("js-reveal");

    let cleanup = () => {};
    // Run after paint so the new page's DOM is in place.
    const id = window.requestAnimationFrame(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("main section"));
      const targets = sections.slice(1); // keep the hero immediate
      if (!targets.length) return;
      targets.forEach((el) => el.classList.add("reveal"));

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -120px 0px", threshold: 0 }
      );
      targets.forEach((el) => io.observe(el));
      cleanup = () => io.disconnect();
    });

    return () => {
      window.cancelAnimationFrame(id);
      cleanup();
    };
  }, [pathname]);

  return null;
}
