import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeysEnabled, setPasskeysEnabled] = useState(false);
  const buildSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
  const [siteKey, setSiteKey] = useState(buildSiteKey);
  const [turnstileRequired, setTurnstileRequired] = useState(false);
  const [turnstileAction, setTurnstileAction] = useState("login");
  const [configLoading, setConfigLoading] = useState(true);
  const turnstileBox = useRef(null);
  const turnstileWidget = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    api.get("/auth/passkeys/status")
      .then((data) => setPasskeysEnabled(Boolean(data?.enabled) && typeof window.PublicKeyCredential !== "undefined"))
      .catch(() => setPasskeysEnabled(false));
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/auth/login-config")
      .then((data) => {
        if (!active) return;
        setTurnstileRequired(Boolean(data?.turnstileRequired));
        setTurnstileAction(data?.turnstileAction || "login");
        if (!buildSiteKey && data?.turnstileSiteKey) setSiteKey(data.turnstileSiteKey);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setConfigLoading(false); });
    return () => { active = false; };
  }, [buildSiteKey]);

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !turnstileBox.current) return;
      turnstileBox.current.innerHTML = "";
      turnstileWidget.current = window.turnstile.render(turnstileBox.current, {
        sitekey: siteKey,
        action: turnstileAction,
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
  }, [siteKey, turnstileAction]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (turnstileWidget.current && window.turnstile) {
      window.turnstile.reset(turnstileWidget.current);
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!mfaRequired && turnstileRequired && !turnstileToken) {
      setErr("Complete the security check before signing in.");
      return;
    }
    setBusy(true);
    try {
      const signedIn = await login(username.trim(), password, mfaRequired ? code.trim() : undefined, turnstileToken);
      navigate(signedIn.mfaEnrollmentRequired ? "/account-security" : "/dashboard");
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

  async function onPasskey() {
    if (!username.trim()) {
      setErr("Enter your username first, then use your passkey.");
      return;
    }
    setErr("");
    setPasskeyBusy(true);
    try {
      const signedIn = await loginWithPasskey(username.trim());
      navigate(signedIn.mfaEnrollmentRequired ? "/account-security" : "/dashboard");
    } catch (e2) {
      setErr(e2.message || "Passkey sign-in was cancelled or failed.");
    } finally {
      setPasskeyBusy(false);
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
              maxLength={14}
              placeholder="6-digit or recovery code"
              autoFocus
              required
            />
            <div className="form-text">
              Enter the 6-digit code from your authenticator app, or a recovery code if you lost the device.
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

        {turnstileRequired && !siteKey && !mfaRequired ? (
          <div className="alert alert-danger py-2 small">
            Security-check configuration is incomplete: the server requires Cloudflare Turnstile but no site key is
            available. Contact IT before signing in.
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-brand w-100 py-2 fs-5"
          disabled={busy || configLoading || Boolean(!mfaRequired && turnstileRequired && (!siteKey || !turnstileToken))}
        >
          {busy ? "Signing in..." : mfaRequired ? "Verify and sign in" : "Sign in"}
        </button>

        {passkeysEnabled && !mfaRequired ? (
          <button
            type="button"
            className="btn btn-outline-secondary w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
            onClick={onPasskey}
            disabled={passkeyBusy || busy}
          >
            <Fingerprint size={17} />
            {passkeyBusy ? "Waiting for your device…" : "Sign in with a passkey"}
          </button>
        ) : null}

        <div className="mt-4 pt-3 border-top text-center" style={{ fontSize: "0.8rem", color: "#6c757d" }}>
          Use the account issued to you by the system administrator. Access is recorded in the audit trail.
        </div>
      </form>
    </div>
  );
}
