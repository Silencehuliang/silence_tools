# Silence Tools API Worker

## 部署步骤

### 1. 创建 Cloudflare D1 数据库
```bash
cd worker
npx wrangler d1 create silence-tools-db
```
将返回的 database_id 填入 wrangler.toml

### 2. 初始化数据库表
```bash
npx wrangler d1 execute silence-tools-db --file=schema.sql
```

### 3. 设置 Secrets
```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GITEE_CLIENT_SECRET
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put GITHUB_TOKEN
```

### 4. 配置 OAuth Apps

#### GitHub OAuth App
1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写:
   - Application name: Silence Tools
   - Homepage URL: https://silence-tools.pages.dev
   - Authorization callback URL: https://silence-tools-api.<你的账号>.workers.dev/api/auth/github/callback
4. 获取 Client ID 和 Client Secret

#### Gitee OAuth App
1. 访问 https://gitee.com/profile/applications
2. 创建应用
3. 填写回调地址: https://silence-tools-api.<你的账号>.workers.dev/api/auth/gitee/callback
4. 获取 Client ID 和 Client Secret

### 5. 更新 wrangler.toml
将获取的 Client ID 填入 wrangler.toml 的 [vars] 部分

### 6. 部署 Worker
```bash
npx wrangler deploy
```

### 7. 更新前端 API 地址
部署后，将 Worker 地址更新到前端 auth.js 中的 AUTH_API_BASE 变量
