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
- 家长：parent@demo.com / Parent123
- 管理员：admin@demo.com / Admin123

## 注册入口

- 注册页：/register
- 家长注册需要填写绑定学生邮箱

## 新增功能

- 多学科学习计划
- 练习模式：普通 / 闯关 / 限时 / 错题专练
- 学生激励：连续学习与徽章
- 诊断报告导出（PDF/图片）
- 家长周报：上周对比 + 学习建议
- AI 对话历史：收藏与标签
- 题库批量导入（CSV）
- 知识点树可视化

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
- 上线家长周报生成
