# 学习站 H5 项目

## 文件夹构成

```txt
student-learning-hub/
├── src/                         # 研发代码
│   ├── app/                     # Next.js App Router 页面和 API
│   ├── components/              # 学生端/老师后台组件
│   ├── lib/                     # 日期、数据仓库、权限等业务逻辑
│   └── types/                   # TypeScript 领域类型
├── data/                        # 本地 JSON 数据仓库，后续可替换成数据库
├── docs/                        # 产品文档、技术规格、交互链路、接口说明
├── outputs/interaction-design/  # 最终交互设计稿和交付说明
└── work/                        # 临时草稿和分析过程文件
```

## 本地运行

```bash
npm run dev
```

学生端：`http://localhost:3000`

老师后台：`http://localhost:3000/admin`

后台演示 token 固定为 `teacher-demo`，由前端请求头自动带上。真实上线时请改为服务端 session/RBAC。

## 二维码签到

当前第一版使用轻量流程：老师后台生成当天签到二维码，学生扫码进入独立 `/sign-in` 签到页，先选择分组，再确认姓名并授权浏览器定位；系统校验是否在指定签到点半径内，并按迟到线记录“已到/迟到”。请假同样选择姓名后提交原因，不计入迟到。

这个版本不依赖公众号网页授权，适合先跑现场签到。后续如果接入已认证服务号，可以切回微信 openid 绑定模式，需要配置：

```bash
WECHAT_APP_ID=公众号 AppID
WECHAT_APP_SECRET=公众号 AppSecret
WECHAT_OPENID_SALT=用于哈希 openid 的随机长字符串
WECHAT_STATE_SECRET=用于签名 OAuth state 的随机长字符串
```

公众号后台需要把部署域名配置为“网页授权域名”。如果后续改用微信 JS-SDK 定位，再额外配置“JS 接口安全域名”。
