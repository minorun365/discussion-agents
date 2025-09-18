# AIディスカッションエージェント デプロイガイド

このガイドでは、本アプリケーションをAWS Amplify Gen2（フロントエンド）とAmazon Bedrock AgentCore Runtime（バックエンド）にデプロイする手順を説明します。

## 前提条件

### 必要なツールとサービス
- AWSアカウント
- AWS CLI（設定済み）
- Node.js 18以上
- Python 3.10以上
- Docker Desktop（ARM64ビルド対応）
- Git

### AWSアクセス権限
以下のサービスへのアクセス権限が必要です：
- AWS Amplify
- Amazon Bedrock（Claude モデルへのアクセス権限）
- Amazon ECR（Elastic Container Registry）
- AWS IAM
- Amazon CloudWatch Logs

### Bedrockモデルアクセス
Amazon Bedrockコンソールで以下のモデルを有効化してください：
- Claude Opus 4.1
- Claude Sonnet 4.0

## パート1: フロントエンドのデプロイ（AWS Amplify Gen2）

### 1.1 リポジトリの準備

```bash
# プロジェクトをGitHubにプッシュ（まだの場合）
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/discussion-agents.git
git push -u origin main
```

### 1.2 Amplifyアプリケーションの作成

1. [AWS Amplifyコンソール](https://console.aws.amazon.com/amplify/)を開く
2. 「新しいアプリケーション」→「アプリケーションをホスト」をクリック
3. GitHubを選択し、認証を設定
4. リポジトリとブランチ（main）を選択

### 1.3 ビルド設定の確認と修正

Amplifyが自動検出したビルド設定を以下のように修正：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### 1.4 環境変数の設定

Amplifyコンソールの「環境変数」セクションで以下を設定：

```
NEXT_PUBLIC_API_URL=https://your-api-endpoint.amazonaws.com
```

注：この値は後でBedrock AgentCoreのデプロイ後に更新します。

### 1.5 デプロイの実行

「保存してデプロイ」をクリックしてデプロイを開始します。初回デプロイは通常1-2分かかります。

## パート2: バックエンドのデプロイ（Bedrock AgentCore Runtime）

### 2.1 必要なパッケージのインストール

```bash
cd backend

# pipを最新版に更新
pip install --upgrade pip

# AgentCore関連パッケージをインストール
pip install bedrock-agentcore strands-agents bedrock-agentcore-starter-toolkit
```

### 2.2 エージェントコードの準備

既存の`api.py`をAgentCore用に変換した`agent_core.py`を作成：

```python
from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent, tool
from typing import Dict, Any
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = BedrockAgentCoreApp()

# モデル設定
OPUS_MODEL = "us.anthropic.claude-opus-4-1-20250805-v1:0"
SONNET_MODEL = "us.anthropic.claude-sonnet-4-20250514-v1:0"

# エージェントプロンプト定義（api.pyから転用）
AGENT_PROMPTS = {
    "yoshida": """あなたは、吉田真吾氏をシミュレートするAIアシスタントです...""",
    "awaji": """あなたは淡路大輔氏をシミュレートするAIアシスタントです...""",
    "minorun": """あなたはKDDIアジャイル開発センターのテックエバンジェリスト、みのるんです..."""
}

# エージェントの初期化
@tool
def ask_yoshida(question: str) -> str:
    """吉田真吾さんに質問する"""
    yoshida = Agent(
        name="AI吉田真吾",
        system_prompt=AGENT_PROMPTS["yoshida"],
        model=SONNET_MODEL
    )
    return yoshida(question)

@tool
def ask_awaji(question: str) -> str:
    """淡路大輔さんに質問する"""
    awaji = Agent(
        name="AI淡路大輔",
        system_prompt=AGENT_PROMPTS["awaji"],
        model=SONNET_MODEL
    )
    return awaji(question)

facilitator = Agent(
    name="AIみのるん",
    system_prompt=AGENT_PROMPTS["minorun"],
    tools=[ask_yoshida, ask_awaji],
    model=SONNET_MODEL
)

@app.entrypoint
def invoke(payload: Dict[str, Any]) -> Dict[str, Any]:
    """エージェントのメインエントリポイント"""
    message = payload.get("message", "")
    if not message:
        return {"error": "No message provided"}

    result = facilitator(message)

    return {
        "agent": "AIみのるん",
        "response": result.message,
        "participants": ["AI吉田真吾", "AI淡路大輔"]
    }

if __name__ == "__main__":
    app.run()
```

### 2.3 requirements.txtの作成

`backend/requirements.txt`を作成：

```txt
bedrock-agentcore
strands-agents
python-dotenv
```

### 2.4 ローカルテスト

```bash
# エージェントを起動
python agent_core.py

# 別のターミナルでテスト
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"message": "生成AIのビジネス活用について議論してください"}'
```

### 2.5 AgentCore Runtimeへのデプロイ

#### ステップ1: エージェントの設定

```bash
# エージェントを設定（デフォルト値を使用）
agentcore configure -e agent_core.py

# 設定ファイル（bedrock_agentcore.yaml）が生成される
```

#### ステップ2: デプロイ実行

```bash
# AgentCore Runtimeにデプロイ
agentcore launch

# デプロイが完了すると以下の情報が表示される：
# - Agent Runtime ARN（後で使用）
# - CloudWatch Logsの場所
```

#### ステップ3: デプロイの確認

```bash
# デプロイしたエージェントをテスト
agentcore invoke '{"message": "AIエージェントの今後について教えてください"}'
```

### 2.6 エージェントの呼び出し

デプロイ後、以下の方法でエージェントを呼び出せます：

```python
# invoke_agent.py
import json
import boto3

# デプロイ時に表示されたARNを使用
agent_arn = "arn:aws:bedrock-agentcore:us-west-2:YOUR_ACCOUNT_ID:runtime/..."

agent_core_client = boto3.client('bedrock-agentcore', region_name='us-west-2')

payload = json.dumps({
    "message": "サーバーレスアーキテクチャについて議論してください"
}).encode()

response = agent_core_client.invoke_agent_runtime(
    agentRuntimeArn=agent_arn,
    payload=payload
)

content = []
for chunk in response.get("response", []):
    content.append(chunk.decode('utf-8'))
print(json.loads(''.join(content)))
```

### 2.7 エージェントの更新

プロンプトやロジックを更新した場合：

```bash
# 変更をデプロイ
agentcore update

# または、完全に再デプロイ
agentcore launch --force
```

### 2.8 クリーンアップ

不要になったエージェントを削除する場合：

```bash
# AgentCore Consoleまたは AWS SDKを使用
aws bedrock-agentcore-control delete-agent-runtime \
    --agent-runtime-arn YOUR_AGENT_ARN \
    --region us-west-2
```

## パート3: 統合と最終設定

### 3.1 Amplify環境変数の更新

1. Amplifyコンソールに戻る
2. 環境変数セクションで`NEXT_PUBLIC_API_URL`を実際のAgentCoreエンドポイントに更新
3. 再デプロイをトリガー

### 3.2 カスタムドメインの設定（オプション）

#### Amplify（フロントエンド）
1. Amplifyコンソールで「ドメイン管理」を選択
2. カスタムドメインを追加
3. SSL証明書を設定

### 3.3 監視とログ

#### CloudWatch Logsの確認
```bash
# AgentCoreのログを確認
aws logs tail /aws/bedrock-agentcore/discussion-agents --follow
```

#### Amplifyのログ
Amplifyコンソールの「モニタリング」セクションでアクセスログとエラーログを確認

## パート4: エージェントのカスタマイズ

### 4.1 プロンプトの更新

`backend/api.py`の各エージェントプロンプト（xxx部分）を適切な内容に更新：

```python
AGENT_PROMPTS = {
    "yoshida": """
あなたは、吉田真吾氏をシミュレートするAIアシスタントです。

# 前提
パネルディスカッションで、ファシリテータに回答してください。
マークダウンは使わず2〜3行で、端的な会話の形で議論を行ってください。
最初に必ず、短く直前の話者へのうなずきを返してください。

# あなたの特徴
AWS Serverless Heroです。
Generative AgentsというAIエージェント専業スタートアップのCOOです。
本日、新宿で開催している「ServerlessDays Tokyo 2025」のオーガナイザーです。

# 専門性・経験
* サーバーレスアーキテクチャの設計と実装
* AIエージェントのビジネス活用
* テクノロジーコミュニティの運営

# リーダーシップスタイル
* 技術とビジネスの橋渡し
* コミュニティ主導の成長
* 実践的なアプローチ

# 話し方の特徴
* 具体例を交えた説明
* ビジネス価値を重視
* 前向きで建設的

# 本日講演した内容
（ここに実際の講演内容を記載）
""",
    # 同様に awaji のプロンプトも更新
}
```

### 4.2 再デプロイ

プロンプト更新後、Dockerイメージを再ビルド・プッシュ：

```bash
cd backend
docker buildx build --platform linux/arm64 \
    -t YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/discussion-agents:latest \
    --push .

# AgentCore Runtimeの更新
aws bedrock-agentcore-control update-agent-runtime \
    --agent-runtime-arn YOUR_RUNTIME_ARN \
    --agent-runtime-artifact '{"containerConfiguration":{"containerUri":"YOUR_ACCOUNT_ID.dkr.ecr.us-west-2.amazonaws.com/discussion-agents:latest"}}'
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. Amplifyビルドエラー
- Node.jsバージョンを確認（18以上）
- package-lock.jsonを削除して`npm install`を再実行

#### 2. AgentCoreデプロイエラー
- IAMロールの権限を確認
- Dockerイメージがlinux/arm64でビルドされているか確認
- ECRへのpush権限を確認

#### 3. CORS エラー
- FastAPIのCORS設定を確認
- Amplify環境変数のAPI URLが正しいか確認

#### 4. Bedrockモデルアクセスエラー
- Bedrockコンソールでモデルアクセスが有効になっているか確認
- IAMロールにBedrockへのアクセス権限があるか確認

## セキュリティのベストプラクティス

1. **環境変数の管理**
   - AWS Secrets Managerを使用して機密情報を管理
   - 環境ごとに異なる設定を使用

2. **ネットワークセキュリティ**
   - VPC内でのプライベート通信を検討
   - API Gatewayを使用してレート制限を実装

3. **監査とロギング**
   - CloudTrailを有効化
   - CloudWatch Alarmsで異常を検知

## コスト最適化

1. **Amplify**
   - ビルド時間を最小化（キャッシュの活用）
   - 不要なブランチのデプロイを削除

2. **Bedrock AgentCore**
   - 適切なインスタンスサイズを選択
   - アイドル時のスケーリング設定

## サポート

問題が発生した場合は、以下のリソースを参照してください：

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amazon Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [AWS Support Center](https://console.aws.amazon.com/support/)

## 次のステップ

1. CI/CDパイプラインの構築
2. A/Bテストの実装
3. マルチリージョン展開の検討
4. パフォーマンスモニタリングの強化