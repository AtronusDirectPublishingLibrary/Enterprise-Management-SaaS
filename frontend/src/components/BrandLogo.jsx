import { assetUrl } from "../lib/api";
import { useSiteSettings } from "../lib/siteSettings";

/**
 * Site-wide logo. When HR uploads a PNG in Public Site → Enterprise logo it is
 * shown in the public header, footer and sign-in card; otherwise the EB
 * monogram remains as the safe placeholder.
 */
export default function BrandLogo({ variant = "header", className = "", alt = "Ethio-Biopharma Enterprise" }) {
  const settings = useSiteSettings();
  const logoUrl = settings?.brand?.logoUrl;

  if (logoUrl) {
    return (
      <img
        src={assetUrl(logoUrl)}
        alt={alt}
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
