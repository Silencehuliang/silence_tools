import { upsertUser, createSession } from '../db.js';

export async function handleGiteeAuth(request, env, isCallback = false) {
  const url = new URL(request.url);
  const frontendUrl = env.FRONTEND_URL || 'https://silence-tools.pages.dev';

  if (!isCallback) {
    const redirectUri = `${url.origin}/api/auth/gitee/callback`;
    const giteeUrl = `https://gitee.com/oauth/authorize?client_id=${env.GITEE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    return Response.redirect(giteeUrl, 302);
  }

  try {
    const code = url.searchParams.get('code');
    if (!code) return Response.redirect(`${frontendUrl}?error=no_code`, 302);

    const tokenRes = await fetch('https://gitee.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: env.GITEE_CLIENT_ID,
        client_secret: env.GITEE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/api/auth/gitee/callback`
      })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return Response.redirect(`${frontendUrl}?error=${tokenData.error}`, 302);

    const userRes = await fetch(`https://gitee.com/api/v5/user?access_token=${tokenData.access_token}`);
    const giteeUser = await userRes.json();

    const user = await upsertUser(env.DB, {
      provider: 'gitee',
      provider_id: String(giteeUser.id),
      username: giteeUser.login,
      avatar_url: giteeUser.avatar_url,
      email: giteeUser.email
    });

    const session = await createSession(env.DB, user.id, 'gitee');

    const headers = new Headers();
    headers.set('Location', `${frontendUrl}?login=success`);
    headers.append('Set-Cookie',
      `session=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
    );
    return new Response(null, { status: 302, headers });
    
  } catch (err) {
    console.error('Gitee auth error:', err.message);
    return Response.redirect(`${frontendUrl}?error=${encodeURIComponent(err.message)}`, 302);
  }
}
