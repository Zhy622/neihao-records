# 情绪笔录 Backend

后端基础工程，使用 NestJS、Prisma 和 PostgreSQL。

## 当前包含

- NestJS 应用骨架
- 全局 `/api` 路由前缀
- CORS 配置
- 健康检查接口
- Prisma Client 注入服务
- PostgreSQL Prisma schema
- 本地 PostgreSQL Docker Compose 示例

## 安装

```bash
cd backend
npm install
```

## 配置环境变量

```bash
copy .env.example .env
```

按需修改 `.env` 中的 `DATABASE_URL` 和 JWT 密钥。

## 启动本地数据库

```bash
docker compose up -d
```

## 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 启动开发服务

```bash
npm run start:dev
```

服务默认运行在：

```text
http://localhost:3001/api
```

健康检查：

```text
GET http://localhost:3001/api/health
GET http://localhost:3001/api/health/db
```

## 下一步建议

- 增加 AuthModule：注册、登录、刷新 token、退出登录
- 增加 RecordsModule：记录 CRUD 和同步接口
- 增加 DTO 校验与 Swagger API 文档
- 前端增加 API Client、SecureStore token 保存和同步服务
