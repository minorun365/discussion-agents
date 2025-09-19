# パネルディスカッション・エージェント

## ローカル起動コマンド

バックエンド

```sh
export AWS_PROFILE=<プロファイル名>
cd backend && uvicorn api:app --reload
```

フロントエンド

```sh
cd frontend && npm run dev
```