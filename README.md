# パネルディスカッション・エージェント

複数のAIエージェントがパネルディスカッションをするデモアプリです。ServerlessDays Tokyo 2025 で使ったもので、ファシリテーター役のエージェントが2人の登壇者役へ順に話を振り、短い会話で議論を進めます。エージェントは Strands Agents で書き、モデルは Amazon Bedrock の Claude Opus 4.1 と Claude Sonnet 4 です。

| 場所 | 中身 |
|---|---|
| backend/ | エージェントと会話を流す API（FastAPI） |
| frontend/ | 会話を表示する画面（Next.js） |

## 動かし方

```bash
export AWS_PROFILE=<プロファイル名>
cd backend && uvicorn api:app --reload
```

別のターミナルで画面を起動します。

```bash
cd frontend && npm run dev
```

AWS に載せる手順は [デプロイガイド](DEPLOY_GUIDE.md) にあります。
