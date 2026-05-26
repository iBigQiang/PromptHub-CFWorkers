# PromptHub Cloudflare Workers 版

本分支把 Cloudflare 自部署改造集中放在 `apps/web-cloudflare`，避免直接改动上游 `apps/web` 的 Node/Docker 自部署实现。这样以后同步 `legeling/PromptHub` 时，冲突主要限制在 fork 自己维护的 Cloudflare 目录。

## 目标

- 保持官方桌面客户端的“自部署 PromptHub”同步协议不变。
- 让本地客户端可以把现有数据上传到 Cloudflare 在线自部署版。
- Cloudflare 使用 D1 保存账号和同步快照元数据，R2 保存图片/视频媒体。
- 上游原版客户端未来升级时，继续只把 Cloudflare 版作为 fork 分支维护，不要求修改官方客户端。

## 当前第一阶段范围

`apps/web-cloudflare` 实现桌面客户端依赖的最小 API：

- `GET /api/auth/captcha`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/devices/heartbeat`
- `GET /api/sync/manifest`
- `GET /api/sync/data`
- `PUT /api/sync/data`
- `GET /api/media/images`
- `GET /api/media/videos`
- `POST /api/media/images/base64`
- `POST /api/media/videos/base64`
- `GET /api/media/images/:filename/base64`
- `GET /api/media/videos/:filename/base64`

初始迁移推荐使用桌面客户端设置页里的“自部署 PromptHub -> 上传”，不要直接搬本地 `prompthub.db`。直接读 SQLite 会漏掉媒体、规则文件、技能文件和 renderer 设置快照。

## 本地数据事实

当前机器的客户端数据目录：

`C:\Users\Qiang\AppData\Roaming\prompthub`

主数据库：

`C:\Users\Qiang\AppData\Roaming\prompthub\prompthub.db`

一次只读盘点结果：22 条 prompts、8 个 folders、8 条 rules、5 条 prompt versions，skills 为空。这个数据量适合走客户端同步上传完成首次迁移。

## Cloudflare 资源

需要创建：

- Worker: `prompthub-cfworkers`
- D1: `prompthub_cfworkers`
- R2 bucket: `prompthub-cfworkers-media`
- R2 preview bucket: `prompthub-cfworkers-media-preview`
- Worker secret: `JWT_SECRET`

当前部署地址：

`https://prompthub-cfworkers.bigqiang.workers.dev`

当前 D1 `database_id`：

`13f03a81-fcde-4125-83fa-d5c4ed9b2c95`

## 常用命令

```powershell
pnpm install
pnpm build:web:cf

cd apps/web-cloudflare
npx wrangler d1 create prompthub_cfworkers
npx wrangler r2 bucket create prompthub-cfworkers-media
npx wrangler r2 bucket create prompthub-cfworkers-media-preview
npx wrangler secret put JWT_SECRET
npx wrangler d1 migrations apply prompthub_cfworkers --remote
npx wrangler deploy
```

首次部署后：

1. 打开 `https://<worker-domain>/api/auth/bootstrap`，确认 `needsSetup=true`。
2. 在本地终端创建第一个管理员账号：

```powershell
.\apps\web-cloudflare\scripts\register-admin.ps1 `
  -BaseUrl "https://prompthub-cfworkers.bigqiang.workers.dev" `
  -Username "admin"
```

脚本会提示输入密码，密码不会写入仓库。

3. 在桌面客户端“数据与同步 -> 自部署 PromptHub”中填 Worker URL、用户名、密码。
4. 先点“测试连接”，再点“上传”。

## 上游同步策略

保持两个远端：

- `origin`: `https://github.com/legeling/PromptHub.git`
- `fork`: `https://github.com/iBigQiang/PromptHub-CFWorkers.git`

建议 `main` 只跟随上游，Cloudflare 工作长期在 `cf-workers-selfhost-sync` 或后续 `cloudflare-self-hosted` 分支。

```powershell
git fetch origin
git switch main
git merge --ff-only origin/main
git switch cf-workers-selfhost-sync
git rebase main
pnpm build:web:cf
```

如果上游改了桌面 self-hosted 同步协议，优先检查：

- `apps/desktop/src/renderer/services/self-hosted-sync.ts`
- `apps/desktop/src/renderer/services/self-hosted-auth.ts`
- `packages/shared/types/sync.ts`

Cloudflare 分支应尽量只改 `apps/web-cloudflare`、`docs/cloudflare-workers.md` 和少量根脚本，减少未来合并冲突。
