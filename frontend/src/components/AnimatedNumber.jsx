import { useState, useEffect, useRef } from "react";

/**
 * Counts a number up to its final value once the element scrolls into view.
 * Understands formatted values such as "ETB 13.1bn", "55m" or "1,000 jobs".
 */
export default function AnimatedNumber({ value, duration = 1500, className }) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  // Parse the value to separate number, prefix, and suffix (e.g., "16M", "USD 207M", "400+")
  const match = String(value).match(/^([^0-9]*)([0-9.,]+)(.*)$/);
  const prefix = match ? match[1] : "";
  const target = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const suffix = match ? match[3] : "";
  const decimals = match && /[.,]\d/.test(match[2]) ? 1 : 0;

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setHasStarted(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return undefined;

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !Number.isFinite(target)) {
      setCount(target);
      return undefined;
    }

    let frame = 0;
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic for a smooth stop
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(easeOut * target);
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration, hasStarted]);

  const formattedCount = count.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formattedCount}
      {suffix}
    </span>
  );
}
