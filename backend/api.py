from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from strands import Agent, tool
import asyncio
import json
from typing import AsyncGenerator

load_dotenv()

app = FastAPI()

# モデル設定
OPUS_MODEL = "us.anthropic.claude-opus-4-1-20250805-v1:0"
SONNET_MODEL = "us.anthropic.claude-sonnet-4-20250514-v1:0"

# エージェントプロンプト定義
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
新サービス「Bedrock AgentCore」のランタイム機能を使って、サーバーレスにAIエージェントをデプロイするのハマっています。
ちょっとだけ男らしい喋り方をします。
""",
    "awaji": """
あなたは淡路大輔氏をシミュレートするAIアシスタントです。

# 前提
パネルディスカッションで、ファシリテータに回答してください。
マークダウンは使わず2〜3行で、端的な会話の形で議論を行ってください。
最初に必ず、短く直前の話者へのうなずきを返してください。

# あなたの特徴
AWSのソリューションアーキテクトです。
サーバーレスと生成AIが専門です。
Bedrock Engineerという名前のコーディングAIエージェントアプリを個人開発しました。
AWS製の新しいPythonフレームワーク「Strands Agents」を使って、Swarm方式のマルチエージェントを作るが好きです。
ちょっとだけ丁寧な喋り方をします。
""",
    "minorun": """
あなたはKDDIアジャイル開発センターのテックエバンジェリスト、みのるんです。
議論のファシリテーターとして、吉田さんと淡路さんの意見を引き出してください。
二人に同時に話を振るのではなく、一人に振ってから内容を反芻しつつ、
その後にもう一人に振ってください。議論が長引かない程度で簡潔に締めてください。
マークダウンは使わず2〜3行で、端的な会話の形で議論を行ってください。
"""
}

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 各エージェントをツールとして定義
@tool
def ask_yoshida(question: str) -> str:
    """吉田真吾さんに質問する

    Args:
        question: 吉田さんへの質問
    """
    yoshida = Agent(
        name="AI吉田真吾",
        system_prompt=AGENT_PROMPTS["yoshida"],
        model=SONNET_MODEL
    )
    return yoshida(question)

@tool
def ask_awaji(question: str) -> str:
    """淡路大輔さんに質問する

    Args:
        question: 淡路さんへの質問
    """
    awaji = Agent(
        name="AI淡路大輔",
        system_prompt=AGENT_PROMPTS["awaji"],
        model=SONNET_MODEL
    )
    return awaji(question)

# ファシリテーターとしてのメインエージェント
facilitator = Agent(
    name="AIみのるん",
    system_prompt=AGENT_PROMPTS["minorun"],
    tools=[ask_yoshida, ask_awaji],
    model=SONNET_MODEL
)

class ChatRequest(BaseModel):
    message: str

async def generate_discussion(message: str) -> AsyncGenerator[str, None]:
    """async iteratorでリアルタイムストリーミング（マルチエージェント対応）"""
    try:
        print(f"質問を受信: {message}")
        
        # サブエージェント用のストリーミング関数（順次実行用）
        async def stream_yoshida_response(question: str):
            """吉田さんの応答をリアルタイムストリーミング"""
            yoshida = Agent(
                name="AI吉田真吾",
                system_prompt=AGENT_PROMPTS["yoshida"],
                model=SONNET_MODEL
            )
            print(f"🎯 吉田さんへの質問開始: {question}")
            async for event in yoshida.stream_async(question):
                if "data" in event:
                    chunk = event["data"]
                    data = json.dumps({
                        "type": "chunk",
                        "agent": "AI吉田真吾",
                        "chunk": chunk
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
            
        async def stream_awaji_response(question: str):
            """淡路さんの応答をリアルタイムストリーミング"""
            awaji = Agent(
                name="AI淡路大輔",
                system_prompt=AGENT_PROMPTS["awaji"],
                model=SONNET_MODEL
            )
            print(f"🎯 淡路さんへの質問開始: {question}")
            async for event in awaji.stream_async(question):
                if "data" in event:
                    chunk = event["data"]
                    data = json.dumps({
                        "type": "chunk",
                        "agent": "AI淡路大輔",
                        "chunk": chunk
                    }, ensure_ascii=False)
                    yield f"data: {data}\n\n"
        
        # ファシリテーターエージェント
        streaming_facilitator = Agent(
            name="AIみのるん",
            system_prompt=AGENT_PROMPTS["minorun"],
            tools=[ask_yoshida, ask_awaji],
            model=SONNET_MODEL,
            callback_handler=None
        )
        
        # メインストリーム取得
        main_stream = streaming_facilitator.stream_async(message)
        
        # 順次処理でエージェント応答を管理
        
        async for event in main_stream:
            print(f"受信イベント: {event}")
            
            # メインエージェント（みのるん）からの応答
            if "data" in event:
                chunk = event["data"]
                print(f"📝 ファシリテーターチャンク: agent=みのるん, chunk={chunk!r}")
                
                data = json.dumps({
                    "type": "chunk",
                    "agent": "AIみのるん",
                    "chunk": chunk
                }, ensure_ascii=False)
                yield f"data: {data}\n\n"
                
            # ツール使用イベントを検出
            elif isinstance(event, dict) and "message" in event:
                message = event.get("message", {})
                content = message.get("content", [])
                
                for item in content:
                    # ツール使用開始を検出
                    if "toolUse" in item:
                        tool_use = item["toolUse"]
                        tool_name = tool_use.get("name", "")
                        tool_input = tool_use.get("input", {})
                        question = tool_input.get("question", "")
                        
                        print(f"🎯 ツール使用検出: {tool_name}, 質問: {question}")
                        
                        # 質問が完全な場合のみ順次実行
                        if question and len(question) > 10:
                            if tool_name == "ask_yoshida":
                                print(f"🎯 吉田さんの順次ストリーミング開始")
                                async for chunk_data in stream_yoshida_response(question):
                                    yield chunk_data
                            elif tool_name == "ask_awaji":
                                print(f"🎯 淡路さんの順次ストリーミング開始")
                                async for chunk_data in stream_awaji_response(question):
                                    yield chunk_data
                
    except Exception as e:
        print(f"エラー: {e}")
        data = json.dumps({
            "agent": "エラー",
            "message": f"システムエラー: {str(e)}"
        }, ensure_ascii=False)
        yield f"data: {data}\n\n"
    
    yield "data: [DONE]\n\n"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """チャットエンドポイント"""
    return StreamingResponse(
        generate_discussion(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "healthy"}