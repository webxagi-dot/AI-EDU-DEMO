# 星光课后 AI 辅导 MVP

小学课后辅导 Web MVP，聚焦人教版语文/数学/英语。

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 演示账号

- 学生：student@demo.com / Student123
- 学生2：student2@demo.com / Student123
- 学生3：student3@demo.com / Student123
- 家长：parent@demo.com / Parent123
- 教师：teacher@demo.com / Teacher123
- 管理员：admin@demo.com / Admin123

## 注册入口

- 学生/家长注册：/register
- 教师注册：/teacher/register
- 管理员注册：/admin/register
- 家长注册需要填写绑定学生邮箱
- 若配置 `TEACHER_INVITE_CODE` 或 `ADMIN_INVITE_CODE`，注册需要邀请码

## 功能概览

- 多学科学习计划与诊断
- 练习模式：普通 / 闯关 / 限时 / 错题专练
- 学生激励：连续学习与徽章
- AI 题库：单题/批量出题、CSV 导入
- AI 知识点树：整本书生成、批量预览后导入
- 班级与作业：发布作业、完成情况、作业批改、错题复盘
- 班级邀请码：学生自助加入 + 教师审核
- 通知中心：学生/家长通知
- 家长周报：作业提醒 + 订正任务提醒
- 成长档案：学习路径、学科掌握、薄弱点
- 管理端操作日志

## 数据库接入

项目支持 PostgreSQL。配置步骤：

1. 创建数据库并执行 `db/schema.sql`
2. 设置环境变量：

```
DATABASE_URL=postgres://user:password@host:5432/dbname
DB_SSL=false
ADMIN_INVITE_CODE=可选
TEACHER_INVITE_CODE=可选
ADMIN_BOOTSTRAP_EMAIL=可选
ADMIN_BOOTSTRAP_PASSWORD=可选
ADMIN_BOOTSTRAP_NAME=可选
```

3. 可选：导入示例数据

```
node scripts/seed-db.mjs
```

4. 阶段三测试数据（班级/作业/批改/成长档案）

```
node scripts/seed-stage3.mjs
```

> 若设置了 `DATABASE_URL` 则写入数据库，否则写入 `data/*.json`。

### Render 快速接入

1. 在 Render 创建 PostgreSQL 服务
2. 将连接串配置为环境变量 `DATABASE_URL`
3. 进入 Render Shell 或本地执行：

```
psql "$DATABASE_URL" -f db/schema.sql
node scripts/seed-db.mjs
node scripts/seed-stage3.mjs
```

启用数据库后，系统将不再读取 `data/*.json`。

## AI 配置（可选）

默认使用 mock 讲解。若需要接入模型，设置以下环境变量：

```
LLM_PROVIDER=zhipu
LLM_API_KEY=你的智谱API Key
LLM_MODEL=glm-4.7
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_CHAT_PATH=/chat/completions
```

若使用自定义接口：

```
LLM_PROVIDER=custom
LLM_ENDPOINT=你的模型接口
LLM_API_KEY=可选
```

## 目录

- app/ 页面与 API 路由
- components/ UI 组件
- data/ 示例知识点与题库
- lib/ 类型与工具

## 下一步

- 接入真实题库与知识点树
- 连接 AI 模型与检索系统
- 上线家长周报生成与自动推送
