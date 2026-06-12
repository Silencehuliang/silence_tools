import { upsertUser, createSession } from '../db.js';

export async function handleGithubAuth(request, env, isCallback = false) {
  const url = new URL(request.url);
  const frontendUrl = env.FRONTEND_URL;

  if (!isCallback) {
    const redirectUri = `${url.origin}/api/auth/github/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${crypto.randomUUID()}`;
    return Response.redirect(githubUrl, 302);
  }

  const code = url.searchParams.get('code');
  if (!code) return Response.redirect(`${frontendUrl}?error=no_code`, 302);

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) return Response.redirect(`${frontendUrl}?error=${tokenData.error}`, 302);

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'User-Agent': 'Silence-Tools'
    }
  });
  const githubUser = await userRes.json();

  const user = await upsertUser(env.DB, {
    provider: 'github',
    provider_id: String(githubUser.id),
    username: githubUser.login,
    avatar_url: githubUser.avatar_url,
    email: githubUser.email
  });

  const session = await createSession(env.DB, user.id, 'github');

  const response = Response.redirect(`${frontendUrl}?login=success`, 302);
  response.headers.append('Set-Cookie',
    `session=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
  );
  return response;
}
