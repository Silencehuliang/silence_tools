import { upsertUser, createSession } from '../db.js';

export async function handleGithubAuth(request, env, isCallback = false) {
  const url = new URL(request.url);
  const frontendUrl = env.FRONTEND_URL || 'https://silence-tools.pages.dev';

  if (!isCallback) {
    const redirectUri = `${url.origin}/api/auth/github/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${crypto.randomUUID()}`;
    return Response.redirect(githubUrl, 302);
  }

  try {
    const code = url.searchParams.get('code');
    if (!code) return Response.redirect(`${frontendUrl}?error=no_code`, 302);

    // 用 code 换 access_token
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
    console.log('Token response:', JSON.stringify(tokenData));
    
    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error);
      return Response.redirect(`${frontendUrl}?error=${tokenData.error_description || tokenData.error}`, 302);
    }

    // 获取用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Silence-Tools'
      }
    });
    
    const githubUser = await userRes.json();
    console.log('GitHub user:', JSON.stringify({ id: githubUser.id, login: githubUser.login }));

    // 创建/更新用户
    const user = await upsertUser(env.DB, {
      provider: 'github',
      provider_id: String(githubUser.id),
      username: githubUser.login,
      avatar_url: githubUser.avatar_url,
      email: githubUser.email
    });

    console.log('User created/updated:', user.id);

    // 创建 session
    const session = await createSession(env.DB, user.id, 'github');
    console.log('Session created:', session.token);

    // 设置 cookie 并重定向
    const headers = new Headers();
    headers.set('Location', `${frontendUrl}?login=success`);
    headers.append('Set-Cookie',
      `session=${session.token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
    );
    return new Response(null, { status: 302, headers });
    
  } catch (err) {
    console.error('GitHub auth error:', err.message, err.stack);
    return Response.redirect(`${frontendUrl}?error=${encodeURIComponent(err.message)}`, 302);
  }
}
