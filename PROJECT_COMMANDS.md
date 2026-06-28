# 记录 APP 项目操作手册

> 工作目录默认是项目根目录：`D:\记录APP`。  
> 下面命令按 Windows PowerShell 习惯编写。

## 1. 常用环境

### 前端本地环境变量

项目根目录 `.env`：

```env
EXPO_PUBLIC_API_URL=https://glorious-exploration-production-7940.up.railway.app/api
```

如果要连本地后端，把它临时改成电脑局域网 IP：

```env
EXPO_PUBLIC_API_URL=http://你的电脑IP:3001/api
```

修改 `.env` 后需要重启 Expo，并建议清缓存：

```bash
npx expo start --clear
```

### 后端本地环境变量

`backend/.env` 通常用于本地数据库：

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://neihao:neihao_password@localhost:5432/neihao_records?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
```

## 2. 本地启动数据库

进入后端目录：

```bash
cd backend
```

启动本地 PostgreSQL：

```bash
docker compose up -d postgres
```

查看数据库容器状态：

```bash
docker compose ps
```

停止数据库：

```bash
docker compose stop postgres
```

## 3. 本地 Prisma 操作

进入后端目录：

```bash
cd backend
```

生成 Prisma Client：

```bash
npm run prisma:generate
```

本地开发迁移：

```bash
npm run prisma:migrate
```

打开 Prisma Studio 查看本地数据库：

```bash
npm run prisma:studio
```

生产环境迁移使用：

```bash
npx prisma migrate deploy
```

## 4. 本地启动后端服务

进入后端目录：

```bash
cd backend
```

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run start:dev
```

后端默认地址：

```text
http://localhost:3001/api
```

健康检查：

```text
http://localhost:3001/api/health
http://localhost:3001/api/health/db
```

后端构建检查：

```bash
npm run typecheck
npm run build
```

## 5. 本地启动前端 Expo

回到项目根目录：

```bash
cd D:\记录APP
```

安装依赖：

```bash
npm install
```

类型检查：

```bash
npm run typecheck
```

普通启动：

```bash
npm start
```

清缓存启动：

```bash
npx expo start --clear
```

LAN 模式，适合手机和电脑在同一 Wi-Fi：

```bash
npx expo start --lan --port 8081 --clear
```

Tunnel 模式，适合 LAN 打不开时：

```bash
npx expo start --tunnel --port 8081 --clear
```

如果第一次使用 tunnel 提示需要安装 ngrok：

```bash
npm install --global @expo/ngrok@^4.1.0
```

检查 Metro 是否运行：

```bash
Invoke-WebRequest -UseBasicParsing http://localhost:8081/status
```

正常会看到：

```text
packager-status:running
```

## 6. 真机调试

### LAN 模式

先查电脑 IP：

```bash
Get-NetIPConfiguration | Where-Object { $_.IPv4Address -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { $_.IPv4Address | ForEach-Object { $_.IPAddress } }
```

假设电脑 IP 是：

```text
192.168.1.2
```

手机 Expo Go 打开：

```text
exp://192.168.1.2:8081
```

手机浏览器可以先测：

```text
http://192.168.1.2:8081/status
```

### Tunnel 模式

启动：

```bash
npx expo start --tunnel --port 8081 --clear
```

如果 Expo 没显示 tunnel 地址，可以查 ngrok：

```bash
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4040/api/tunnels
```

找到类似：

```text
https://xxxx-badzhy-8081.exp.direct
```

手机 Expo Go 里手动打开：

```text
exp://xxxx-badzhy-8081.exp.direct
```

## 7. 一键式本地开发顺序

### 只调前端，连线上后端

确认 `.env`：

```env
EXPO_PUBLIC_API_URL=https://glorious-exploration-production-7940.up.railway.app/api
```

启动前端：

```bash
npx expo start --lan --port 8081 --clear
```

LAN 不通时：

```bash
npx expo start --tunnel --port 8081 --clear
```

### 前端 + 本地后端 + 本地数据库

启动数据库：

```bash
cd backend
docker compose up -d postgres
```

执行迁移：

```bash
npm run prisma:migrate
```

启动后端：

```bash
npm run start:dev
```

另开一个终端，启动前端：

```bash
cd D:\记录APP
npx expo start --lan --port 8081 --clear
```

## 8. 停止本地服务

### 停止 Expo/Metro

如果是在当前终端启动的，按：

```text
Ctrl + C
```

如果是后台进程，查看 8081：

```bash
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
```

杀掉监听 8081 的进程：

```bash
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### 停止后端

如果是在当前终端启动的，按：

```text
Ctrl + C
```

查看 3001：

```bash
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
```

杀掉监听 3001 的进程：

```bash
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### 停止 Docker 数据库

```bash
cd backend
docker compose stop postgres
```

### 停止 tunnel/ngrok

```bash
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('ngrok') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## 9. Railway 后端部署

### Railway 服务配置

Railway 后端服务设置：

```text
Root Directory: /backend
Build Command: npx prisma generate && npm run build
Start Command: npm run start
Pre-deploy Command: npx prisma migrate deploy
```

### Railway 环境变量

在 Railway 后端 Service 的 Variables 里配置：

```env
NODE_ENV=production
DATABASE_URL=Supabase PostgreSQL 连接字符串
JWT_ACCESS_SECRET=长随机字符串
JWT_REFRESH_SECRET=另一段长随机字符串
```

不要手动设置：

```env
PORT=3001
```

Railway 会自动提供端口。

### Supabase 连接串格式

Session pooler 常见格式：

```text
postgresql://postgres.项目ref:数据库密码@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

注意：

- 密码不要保留方括号，例如不要写 `[password]`。
- 用户名通常是 `postgres.项目ref`，不是单独的 `postgres`。
- Railway 变量里不要给 URL 加外层引号。

### 部署后检查

Railway 生成公网域名后检查：

```text
https://你的-railway-域名/api/health
https://你的-railway-域名/api/health/db
```

项目当前线上 API：

```text
https://glorious-exploration-production-7940.up.railway.app/api
```

## 10. Supabase 查看线上数据

进入 Supabase：

```text
Table Editor
```

重点看：

```text
users
records
refresh_tokens
```

也可以进入 SQL Editor：

```sql
select id, email, "displayName", "createdAt"
from users
order by "createdAt" desc
limit 20;
```

```sql
select id, "userId", title, category, emotions, "createdAt", "updatedAt"
from records
order by "createdAt" desc
limit 20;
```

## 11. EAS APK 打包

### 检查 EAS 登录

```bash
npx eas-cli@latest whoami
```

未登录时：

```bash
npx eas-cli@latest login
```

### 检查 preview 环境变量

```bash
npx eas-cli@latest env:list --environment preview
```

应有：

```env
EXPO_PUBLIC_API_URL=https://glorious-exploration-production-7940.up.railway.app/api
```

如果需要重新设置：

```bash
npx eas-cli@latest env:create preview --name EXPO_PUBLIC_API_URL --value "https://glorious-exploration-production-7940.up.railway.app/api" --visibility plaintext --scope project --force --non-interactive
```

### 打 Android APK

项目根目录执行：

```bash
npx eas-cli@latest build -p android --profile preview
```

`eas.json` 里 `preview` 已经配置为 APK：

```json
{
  "preview": {
    "distribution": "internal",
    "android": {
      "buildType": "apk"
    }
  }
}
```

构建成功后，EAS 会给下载链接。手机打开链接，下载并安装 APK。

### 查看构建列表

```bash
npx eas-cli@latest build:list
```

### 查看某次构建详情

```bash
npx eas-cli@latest build:view 构建ID
```

## 12. 打包前推荐检查

```bash
npm run typecheck
npx expo install --check
git status
```

如果 `package.json` 和 `package-lock.json` 不同步，EAS 云构建可能在 `npm ci` 阶段失败。修复方式：

```bash
npm install
git add package-lock.json package.json
git commit -m "更新依赖锁文件"
```

## 13. Git 提交流程

查看改动：

```bash
git status
```

查看具体 diff：

```bash
git diff
```

添加指定文件：

```bash
git add 文件路径
```

提交：

```bash
git commit -m "提交说明"
```

推送：

```bash
git push
```

## 14. 常见问题

### Expo Go 打不开项目

先确认 Metro 是否运行：

```bash
Invoke-WebRequest -UseBasicParsing http://localhost:8081/status
```

如果本机正常，手机打不开：

- 确认手机和电脑在同一个 Wi-Fi。
- 尝试 tunnel 模式。
- 检查 Windows 防火墙是否拦截 8081。
- 更新 Expo Go 到最新版。

### Expo 加载到 99% 不动

先看 Metro 日志：

```bash
Get-Content logs\expo-dev.log -Tail 120
```

再主动检查 Android bundle：

```bash
Invoke-WebRequest -UseBasicParsing "http://localhost:8081/index.bundle?platform=android&dev=true&hot=false&lazy=true" -TimeoutSec 60
```

如果 bundle 是 200，通常是手机端运行时报错或 Expo Go 版本不兼容。

### Railway Pre-deploy 失败

重点看：

```text
DATABASE_URL
P1000
P1001
Prisma
```

常见原因：

- `DATABASE_URL` 没配置在后端 Service。
- Supabase 用户名或密码错。
- 密码带特殊字符但没有 URL encode。
- 连接串里保留了 `[password]` 的方括号。
- Prisma migration 文件没有提交。

### 卸载重装后记录不见

新版本已经支持登录后从线上拉回记录。验证步骤：

1. 用 APK 登录账号。
2. 新增一条记录。
3. 确认 Supabase `records` 表有数据。
4. 卸载 App。
5. 重装 APK。
6. 用同账号登录，历史记录应能恢复。

如果恢复不了，先确认线上 `records` 表里确实有该账号的数据。

