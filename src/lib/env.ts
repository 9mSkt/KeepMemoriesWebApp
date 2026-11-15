import "server-only";

const isProd = process.env.NODE_ENV === "production";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  // APP_URL preferred; NEXT_PUBLIC_APP_URL still accepted. Server-only, so no public prefix is needed.
  appUrl: read("APP_URL") ?? read("NEXT_PUBLIC_APP_URL"),
  googleClientId: read("GOOGLE_CLIENT_ID"),
  googleClientSecret: read("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: read("GOOGLE_REDIRECT_URI"),
  supabaseUrl: read("SUPABASE_URL"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  encryptionKey: read("ENCRYPTION_KEY"),
  sessionSecret: read("SESSION_SECRET"),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
export const isGoogleConfigured = Boolean(env.googleClientId && env.googleClientSecret);

/**
 * Local dev mode: when a service isn't configured outside production, the app swaps in a local stand-in
 * (JSON file database, fake Google Photos that writes JPEGs to `.data/`). Production always requires the
 * real services.
 */
export const useDevDb = !isSupabaseConfigured && !isProd;
export const useFakeGoogle = !isGoogleConfigured && !isProd;

export function requireSecret(name: "ENCRYPTION_KEY" | "SESSION_SECRET"): string {
  const value = name === "ENCRYPTION_KEY" ? env.encryptionKey : env.sessionSecret;
  if (value) return value;
  if (isProd) throw new Error(`${name} is not set`);
  // Dev-only fallback so the app runs before .env.local is filled in.
  return name === "ENCRYPTION_KEY"
    ? Buffer.alloc(32, 7).toString("base64")
    : "dev-only-session-secret-change-me";
}
