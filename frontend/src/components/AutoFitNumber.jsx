import { Children, useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keeps a numeric value on one line by scaling its font size to the available
 * width. Works in narrow report cards, wide dashboards, browser zoom and OS
 * font scaling because it measures the rendered container instead of
 * assuming a breakpoint or a fixed digit count.
 */
export default function AutoFitNumber({
  children,
  className = "",
  maxRem = 1.45,
  minRem = 0.68,
  as: Tag = "span",
  title,
}) {
  const hostRef = useRef(null);
  const valueRef = useRef(null);
  // JSX often passes adjacent children as an array (for example [value, "%"]).
  // Joining them avoids String(array) inserting separators into the number.
  const text = Children.toArray(children).join("");

  const fit = useCallback(() => {
    const host = hostRef.current;
    const value = valueRef.current;
    if (!host || !value) return;

    // Leave a hair of breathing room so rounded font metrics never clip.
    const available = host.clientWidth - 1;
    if (available <= 0) return;

    const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxPx = maxRem * rootSize;
    const minPx = minRem * rootSize;

    value.style.fontSize = `${maxPx}px`;
    const measured = value.scrollWidth;
    if (!measured) return;

    // Font metrics scale linearly, so one measurement gives the exact fit.
    const fitted = (available / measured) * maxPx;
    value.style.fontSize = `${Math.min(maxPx, Math.max(minPx, fitted))}px`;
  }, [maxRem, minRem]);

  useLayoutEffect(() => {
    fit();
  }, [fit, text]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const schedule = () => fit();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(host);
    }

    // Cover viewport resizes even where ResizeObserver is missing or delayed,
    // which also keeps browser zoom and orientation changes accurate.
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("beforeprint", schedule);
    window.addEventListener("afterprint", schedule);
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("beforeprint", schedule);
      window.removeEventListener("afterprint", schedule);
    };
  }, [fit]);

  return (
    <Tag ref={hostRef} className={`auto-fit-number ${className}`.trim()} title={title ?? text}>
      <span ref={valueRef} className="auto-fit-number__value">
        {text}
      </span>
    </Tag>
  );
}
