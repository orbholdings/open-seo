export function allowsPaidSeoProvider(
  /** @type {string | undefined} */ mode,
  /** @type {"dataforseo" | "treg"} */ provider,
) {
  return mode === undefined || mode === "auto" || mode === provider;
}

// Unset keeps the provider choice of existing installations. New Coolify
// installations set "off" explicitly, even if a key is present.
export function selectPaidSeoProvider(
  /** @type {string | undefined} */ mode,
  /** @type {string | undefined} */ directKey,
  /** @type {string | undefined} */ tregToken,
) {
  if (allowsPaidSeoProvider(mode, "dataforseo") && directKey?.trim())
    return "dataforseo";
  if (allowsPaidSeoProvider(mode, "treg") && tregToken?.trim()) return "treg";
  return null;
}

export const PAID_SEO_UNAVAILABLE =
  "This tool needs an enabled DataForSEO or Treg connection. Site Audit and connected Google reports are available independently.";
