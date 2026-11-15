import "server-only";
import { env } from "../env";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
];

/** The refresh token was revoked or expired (e.g. 7-day Testing-mode expiry). The couple must reconnect. */
export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export function redirectUri(appUrl: string): string {
  return env.googleRedirectUri?.replace(/\/+$/, "") ?? `${appUrl}/api/google/callback`;
}

export function buildAuthUrl(state: string, appUrl: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: redirectUri(appUrl),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    // Always show consent so Google always returns a refresh token (also on reconnect).
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId!,
      client_secret: env.googleClientSecret!,
      ...body,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new GoogleAuthError("Refresh token expired or revoked");
    throw new Error(`Google token endpoint: ${json.error ?? res.status}`);
  }
  return json;
}

export async function exchangeCode(code: string, appUrl: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(appUrl),
  });
  return {
    accessToken: t.access_token,
    expiresIn: t.expires_in,
    refreshToken: t.refresh_token ?? null,
    email: t.id_token ? emailFromIdToken(t.id_token) : null,
    scopes: (t.scope ?? "").split(" "),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  return { accessToken: t.access_token, expiresIn: t.expires_in };
}

/** The id_token comes straight from Google's token endpoint over TLS, so reading its payload is safe. */
function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as {
      email?: string;
    };
    return payload.email ?? null;
  } catch {
    return null;
  }
}
