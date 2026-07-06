# API Contract

## Public APIs

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/home?date=YYYY-MM-DD` | 首页聚合数据 |
| GET | `/api/courses?date=YYYY-MM-DD` | 本周课程 |
| GET | `/api/sign-in?date=YYYY-MM-DD` | 当天签到汇总和明细 |
| GET | `/api/comments` | 可见学生心声 |
| POST | `/api/comments` | 发布心声，需 `x-wechat-openid-hash` |
| POST | `/api/comments/:id/like` | 点赞 |
| POST | `/api/comments/:id/report` | 举报 |

## Admin APIs

后台接口均需请求头：

```http
x-admin-token: teacher-demo
```

| Method | Path | 说明 |
| --- | --- | --- |
| POST | `/api/admin/sign-in` | 更新学生签到 |
| POST | `/api/admin/daily` | 更新阅读分享人、提醒、迟到线 |
| POST | `/api/admin/courses` | 新增或更新课程 |
| PATCH | `/api/admin/comments/:id` | 审核评论状态 |

## 签到更新请求

```json
{
  "date": "2026-07-02",
  "studentId": "stu-003",
  "status": "late",
  "arrivedAt": "2026-07-02T09:36:00+08:00",
  "note": "地铁延误"
}
```

`status` 可选：`on_time`、`late`、`absent`、`not_signed`。
