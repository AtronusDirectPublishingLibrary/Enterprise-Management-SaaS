import { assetUrl } from "../lib/api";
import { useSiteSettings } from "../lib/siteSettings";
import { useBranding } from "./BrandingProvider";

/**
 * Logo: prefers tenant branding (authenticated/tenant-scoped) when available,
 * otherwise falls back to public site settings, then the EB monogram.
 */
export default function BrandLogo({ variant = "header", className = "", alt = "Ethio-Biopharma Enterprise" }) {
  const site = useSiteSettings();
  const branding = useBranding();
  const tenantLogo = branding?.settings?.["branding.logoUrl"] || "";
  const tenantOrg = branding?.settings?.["branding.orgName"] || "";
  const logoUrl = tenantLogo || site?.brand?.logoUrl;

  if (logoUrl) {
    return (
      <img
        src={assetUrl(logoUrl)}
        alt={tenantOrg || alt}
        className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      />
    );
  }

  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      EB
    </span>
  );
}
