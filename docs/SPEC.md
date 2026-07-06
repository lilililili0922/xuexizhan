# 学习站 H5 技术规格

## 技术栈

- Next.js App Router + React + TypeScript
- Route Handlers 提供 API
- 本地 `data/store.json` 作为 MVP 数据仓库
- 后续可替换为 PostgreSQL/Supabase/MySQL + Prisma

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/app/page.tsx` | 学生端首页 |
| `src/app/admin/page.tsx` | 老师后台 |
| `src/app/api/**/route.ts` | API 路由 |
| `src/components/StudentVoice.tsx` | 学生心声交互 |
| `src/components/AdminConsole.tsx` | 后台操作台 |
| `src/lib/store.ts` | 数据读取、写入、课程状态、签到汇总 |
| `data/store.json` | MVP 种子数据 |

## 数据模型

核心对象：

- `courses`: 课程时间、标题、老师、班型、会议号、会议链接、回放链接、是否新增。
- `dailyContents`: 日期、阅读分享人、每日注意事项、首页标语、签到迟到线。
- `students`: 学生姓名、班型、微信 openid hash。
- `signInRecords`: 日期、学生、到达时间、状态、备注。
- `comments`: 内容、匿名名、审核状态、点赞数、举报数、微信 hash。
- `quickLinks`: 快捷入口标题、说明、图标、链接、排序。

## 课程状态规则

- 当前时间在 `startsAt <= now < endsAt`：`进入会议`。
- 当前时间早于 `startsAt`：`加入会议列表`。
- 当前时间晚于 `endsAt` 且有 `replayUrl`：`看回放`。
- 当前时间晚于 `endsAt` 且无 `replayUrl`：`已结束`。

## 签到规则

- 老师后台写入 `signInRecords`。
- 学生端从学生名单和当天签到记录聚合出完整表格。
- 无签到记录的活跃学生显示为 `not_signed`。
- 迟到总结取 `status = late` 的学生。

## 权限与上线替换点

- 当前后台使用演示请求头 `x-admin-token: teacher-demo`。
- 当前微信登录为 mock OAuth，发布评论时使用 `x-wechat-openid-hash`。
- 真实上线时替换为公众号 OAuth + 服务端 session，并在 Route Handler 中校验角色。

## 风险

- JSON 文件不适合多人同时后台编辑；正式上线需换数据库。
- 微信 openid hash 仍属于可追溯身份信息，后台需限制可见范围。
- 小鹅通回放需要提供真实链接或同步接口。
