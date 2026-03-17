import { redirect } from "@sveltejs/kit";
import {
  clearOAuthCookies,
  createSession,
  exchangeCodeForTokens,
  getGitHubUser,
  getOAuthCookies,
} from "../../../../auth";
import { getOrCreateUser } from "$lib/db/afl/service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    redirect(302, "/auth/login?error=auth_failed");
  }

  const stored = getOAuthCookies(cookies, "github");

  if (!stored.state || !stored.codeVerifier || state !== stored.state) {
    redirect(302, "/auth/login?error=invalid_state");
  }

  clearOAuthCookies(cookies, "github");

  try {
    const redirectUri = `${url.origin}/auth/callback/github`;
    const tokens = await exchangeCodeForTokens(
      "github",
      code,
      redirectUri,
      stored.codeVerifier,
    );
    const user = await getGitHubUser(tokens.access_token);
    getOrCreateUser({ email: user.email, name: user.name, provider: "github" });

    await createSession(cookies, {
      user,
      provider: "github",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
    });
  } catch {
    redirect(302, "/auth/login?error=auth_failed");
  }

  redirect(302, "/home?welcome=github");
};
