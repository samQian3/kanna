# Sam 的 Kanna 升级版

- Fork： https://github.com/samQian3/kanna
- 部署分支：`sam-upgrade`
- 原项目： https://github.com/jakemor/kanna （`upstream`）
- 初始基线：上游 `100ce68`，版本 `0.68.0`。

这个分支保存局域网附件上传兼容修复、GPT-6 Astra 模型选项、子代理事件隔离和状态展示、对话气泡/用时/时间显示，以及编辑最后一条消息创建修订分支的功能。编辑保留原任务，不撤销项目文件变更。

## 本机部署

在 macOS 现有 Kanna 安装环境中，先提交并推送 `sam-upgrade` 的改动，再运行：

```sh
git switch sam-upgrade
git pull --ff-only origin sam-upgrade
bun run deploy:local
```

部署入口检查分支、Fork 地址、工作区是否干净，以及本地提交是否与远端一致；执行类型检查和两份前端构建。后台程序等待所有任务空闲，备份原文件，再更新 `~/Library/Application Support/Kanna/node_modules/kanna-code`，重启 `local.kanna` 并验证页面资源。

每次发布的提交、日志、备份和状态保存在 `.deploy/`（不入 Git）。运行中的任务不会被主动取消。依赖发生变化时部署会停止，需要先准备兼容的依赖环境；此入口不更新 CLI 启动器或数据库。

保留 LaunchAgent 的 `KANNA_DISABLE_SELF_UPDATE=1`，避免官方自动更新覆盖此分支。登录密码、个人模型默认值、任务记录和附件仍保留在本机，不提交到 GitHub。

## 合并上游

先获取 `upstream` 的更新，在开发分支审核、解决冲突并验证，再合并到 `sam-upgrade`。不要直接用上游 `main` 或 npm 官方版本覆盖部署。
