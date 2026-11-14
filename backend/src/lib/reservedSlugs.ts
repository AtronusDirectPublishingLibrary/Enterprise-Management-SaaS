export const RESERVED_SLUGS = [
  "ethiobiopharma",
  "ethio-biopharma",
  "platform",
  "admin",
  "api",
  "www",
  "app",
  "login",
  "register",
  "org",
  "saas",
];

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.includes(String(slug || "").trim().toLowerCase());
}
