// Only the development browser tests can replace paid research with local fixtures.
export const domainFixturesEnabled =
  import.meta.env.DEV && import.meta.env.VITE_E2E_DOMAIN_FIXTURES === "1";
export const keywordFixturesEnabled =
  import.meta.env.DEV && import.meta.env.VITE_E2E_KEYWORD_FIXTURES === "1";
