import { getOrCreateUser } from "$lib/db/afl/service";
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

    let tokens;
    try {
      tokens = await exchangeCodeForTokens(
        "google",
        code,
        redirectUri,
        stored.codeVerifier,
      );
    } catch (err) {
      console.error("[google callback] token exchange failed:", err);
      redirect(302, "/auth/login?error=token_exchange_failed");
    }

    if (!tokens.id_token) {
      console.error("[google callback] no id_token in response");
      redirect(302, "/auth/login?error=no_id_token");
    }

    const user = decodeGoogleIdToken(tokens.id_token);

    try {
      await getOrCreateUser({
        email: user.email,
        name: user.name,
        provider: "google",
      });
    } catch (err) {
      console.error("[google callback] db error:", err);
      redirect(302, "/auth/login?error=db_error");
    }

    await createSession(cookies, {
      user,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
    });
  } catch (err) {
    if ((err as any)?.status === 302) throw err;
    console.error("[google callback] unexpected error:", err);
    redirect(302, "/auth/login?error=auth_failed");
  }

  redirect(302, "/home/kali-afl?welcome=google");
};
