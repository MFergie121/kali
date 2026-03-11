import { redirect } from "@sveltejs/kit";
import {
  clearOAuthCookies,
  createSession,
  decodeGoogleIdToken,
  exchangeCodeForTokens,
  getOAuthCookies,
} from "../../../../auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    redirect(302, "/auth/login?error=auth_failed");
  }

  const stored = getOAuthCookies(cookies, "google");

  if (!stored.state || !stored.codeVerifier || state !== stored.state) {
    redirect(302, "/auth/login?error=invalid_state");
  }

  clearOAuthCookies(cookies, "google");

  try {
    const redirectUri = `${url.origin}/auth/callback/google`;
    const tokens = await exchangeCodeForTokens(
      "google",
      code,
      redirectUri,
      stored.codeVerifier,
    );

    if (!tokens.id_token) {
      redirect(302, "/auth/login?error=auth_failed");
    }

    const user = decodeGoogleIdToken(tokens.id_token);

    await createSession(cookies, {
      user,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
    });
  } catch {
    redirect(302, "/auth/login?error=auth_failed");
  }

  redirect(302, "/home?welcome=google");
};
