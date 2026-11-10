import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { languageShortLabel, useLanguage } from "../lib/language";

/**
 * Compact language picker for the public header: one trigger, then a two-column
 * grid of languages in a floating panel. Keeps the header bar from stretching
 * when several languages are enabled.
 */
export default function LanguageMenu() {
  const { lang, setLang, languages, tText } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const list = languages?.length ? languages : [{ code: "en", name: "English" }];
  const current = list.find((language) => language.code === lang) || list[0];
  const label = tText("Language", "ቋንቋ");

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = list.findIndex((language) => language.code === lang);
    optionRefs.current[Math.max(0, index)]?.focus();
    // Focus the active choice once per opening, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // The panel is a 2-column grid, so Up/Down move a row and Left/Right move one.
  const moveFocus = (index, key) => {
    const columns = 2;
    const count = list.length;
    const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    if (key === "Home") {
      optionRefs.current[0]?.focus();
      return;
    }
    if (key === "End") {
      optionRefs.current[count - 1]?.focus();
      return;
    }
    if (!(key in steps)) return;
    const next = (index + steps[key] + count) % count;
    optionRefs.current[next]?.focus();
  };

  return (
    <div className="lang-menu-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`lang-trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.nativeName || current?.name || current?.code}`}
        title={`${label}: ${current?.nativeName || current?.name || current?.code}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Globe2 size={15} aria-hidden="true" />
        <span className="lang-trigger__code">{languageShortLabel(current)}</span>
        <ChevronDown size={13} aria-hidden="true" className="lang-trigger__chev" />
      </button>

      {open ? (
        <div className="lang-popover" role="presentation">
          <div className="lang-popover__head">
            <span>{label}</span>
            <span className="lang-popover__count">{list.length}</span>
          </div>
          <div className="lang-grid" role="listbox" aria-label={label}>
            {list.map((language, index) => {
              const active = language.code === lang;
              return (
                <button
                  key={language.code}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`lang-option${active ? " is-active" : ""}`}
                  title={language.name || language.nativeName}
                  onClick={() => choose(language.code)}
                  onKeyDown={(event) => {
                    if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                      event.preventDefault();
                      moveFocus(index, event.key);
                    } else if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      choose(language.code);
                    }
                  }}
                >
                  <span className="lang-option__short" aria-hidden="true">{languageShortLabel(language)}</span>
                  <span className="lang-option__name">{language.nativeName || language.name}</span>
                  {active ? <Check size={14} className="lang-option__check" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}