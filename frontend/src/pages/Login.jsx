import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../lib/auth";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const turnstileBox = useRef(null);
  const turnstileWidget = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !turnstileBox.current) return;
      turnstileBox.current.innerHTML = "";
      turnstileWidget.current = window.turnstile.render(turnstileBox.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };

    const existing = document.querySelector('script[data-eb-turnstile]');
    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      existing.addEventListener("load", renderWidget);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.ebTurnstile = "true";
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existing?.removeEventListener("load", renderWidget);
      if (turnstileWidget.current && window.turnstile) {
        window.turnstile.remove(turnstileWidget.current);
      }
      turnstileWidget.current = null;
    };
  }, [siteKey]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (turnstileWidget.current && window.turnstile) {
      window.turnstile.reset(turnstileWidget.current);
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password, mfaRequired ? code.trim() : undefined, turnstileToken);
      navigate("/dashboard");
    } catch (e2) {
      console.error("Login error:", e2);
      if (e2.data?.mfaRequired) {
        setMfaRequired(true);
        setCode("");
      } else {
        resetTurnstile();
      }
      setErr(e2.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <Helmet>
        <title>Sign in | EB-EMS</title>
        <meta name="description" content="Sign in to the Ethio-Biopharma Enterprise Management System (EB-EMS)." />
      </Helmet>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="text-center mb-4">
          <BrandLogo variant="login" />
          <h1
            className="auth-brand mb-0"
            aria-label="Ethio-Biopharma Enterprise Management System (EB-EMS)"
          >
            <span className="auth-brand__org">Ethio-Biopharma</span>
            <span className="auth-brand__system">Enterprise Management System</span>
            <span className="auth-brand__badge">EB-EMS</span>
          </h1>
          <p className="auth-brand__note">Integrated corporate operations platform</p>
        </div>

        {err && <div className="alert alert-danger py-2">{err}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold">Username</label>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            disabled={mfaRequired}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={mfaRequired}
          />
        </div>

        {mfaRequired && (
          <div className="mb-3">
            <label className="form-label fw-semibold d-flex align-items-center gap-1">
              <ShieldCheck size={15} /> Authenticator code
            </label>
            <input
              className="form-control"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              autoFocus
              required
            />
            <div className="form-text">
              Open your authenticator app and enter the current 6-digit code.
            </div>
          </div>
        )}

        {siteKey && !mfaRequired ? (
          <div className="mb-3">
            <div ref={turnstileBox} />
            <div className="form-text">
              Confirm you are human to continue. The check is provided by Cloudflare Turnstile.
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-brand w-100 py-2 fs-5"
          disabled={busy || Boolean(siteKey && !mfaRequired && !turnstileToken)}
        >
          {busy ? "Signing in..." : mfaRequired ? "Verify and sign in" : "Sign in"}
        </button>

        <div className="mt-4 pt-3 border-top text-center" style={{ fontSize: "0.8rem", color: "#6c757d" }}>
          Use the account issued to you by the system administrator. Access is recorded in the audit trail.
        </div>
      </form>
    </div>
  );
}
