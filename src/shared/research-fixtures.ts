// Browser tests can exercise paid screens with production React and local fixtures.
const allowFixtures = import.meta.env.DEV || import.meta.env.MODE === "e2e";
export const domainFixturesEnabled =
  allowFixtures && import.meta.env.VITE_E2E_DOMAIN_FIXTURES === "1";
export const keywordFixturesEnabled =
  allowFixtures && import.meta.env.VITE_E2E_KEYWORD_FIXTURES === "1";
