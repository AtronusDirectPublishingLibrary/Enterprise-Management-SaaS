import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function FlyInObserver() {
  const location = useLocation(); // Triggers re-run on route change

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target); // Animate only once
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const scanAndObserve = () => {
      // Globally target all cards, stat boxes, generic fly-in classes and the
      // public-site text blocks (home page sections and inner pages).
      const elements = document.querySelectorAll(
        [
          ".card",
          ".feature-card",
          ".auth-card",
          ".chart-card",
          ".stat-item-landing",
          ".fly-in",
          ".public-site .section-head",
          ".public-site .lede",
          ".public-site .fact",
          ".public-site .capability",
          ".public-site .plan-card",
          ".public-site .partner",
          ".public-site .campus-media",
          ".public-site .campus-copy",
          ".public-site .media-card",
          ".public-site .phase",
          ".public-site .visitor-stat",
        ].join(", ")
      );
      elements.forEach((el) => {
        if (!el.classList.contains("visible")) {
          el.classList.add("fly-in"); // Add base class
          observer.observe(el);
        }
      });
    };

    // Run immediately, and again after 300ms to catch React rendering delays
    scanAndObserve();
    const timeout = setTimeout(scanAndObserve, 300);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [location.pathname]); // Re-run whenever the page changes

  return null;
}