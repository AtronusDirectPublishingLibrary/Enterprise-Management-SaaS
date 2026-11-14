import { Helmet } from "react-helmet-async";
import { ShieldCheck } from "lucide-react";
import MfaCard from "../components/MfaCard";
import PasskeyCard from "../components/PasskeyCard";
import RecoveryCodesCard from "../components/RecoveryCodesCard";

export default function AccountSecurity() {
  return (
    <div className="container-fluid px-0">
      <Helmet><title>Account security | EB-EMS</title></Helmet>
      <div className="mb-4">
        <div className="home-eyebrow d-flex align-items-center gap-2"><ShieldCheck size={15} /> Account security</div>
        <h1 className="h3 fw-bold mb-1">Protect your account</h1>
        <p className="text-muted mb-0">
          Use an authenticator app for every sign-in. Passkeys are optional and never replace your recovery codes.
        </p>
      </div>
      <div className="row g-4">
        <div className="col-xl-6"><MfaCard /></div>
        <div className="col-xl-6"><PasskeyCard /></div>
        <div className="col-xl-7"><RecoveryCodesCard /></div>
      </div>
    </div>
  );
}
