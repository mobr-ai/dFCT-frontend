import { useEffect } from "react";

export default function useRevealOnScroll(options = {}) {
  const { rootMargin = "0px 0px -10% 0px", threshold = 0.15 } = options;

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]") || []);
    if (nodes.length === 0) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin, threshold },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [rootMargin, threshold]);
}
