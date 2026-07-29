// Product feature flags.
//
// DISCOVERY_PUBLIC_ENABLED gates the public "Jelajah" discovery surface
// (/discovery + post detail) and its marketing entry points. A tenant
// marketplace only pays off at density; until then it stays off. Flip to
// `true` to re-enable everything in one place.
export const DISCOVERY_PUBLIC_ENABLED = false;
