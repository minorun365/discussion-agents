'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from './types/chat';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { LoadingIndicator } from './components/LoadingIndicator';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージが更新されたら最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);
    
    // ユーザーの質問を表示
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      agent: '参加者からの質問',
      message: userMessage
    }]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 最後の不完全な行は次回に持ち越し
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                setIsLoading(false);
                return; // ストリーム終了
              }
              
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  
                  // チャンクデータの処理
                  if (parsed.type === 'chunk') {
                    const agentName = parsed.agent;
                    const chunk = parsed.chunk;
                    
                    setMessages(prev => {
                      const lastMessage = prev[prev.length - 1];
                      
                      // 同じエージェントの最後のメッセージにチャンクを追加
                      if (lastMessage && lastMessage.agent === agentName) {
                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMessage,
                            message: lastMessage.message + chunk
                          }
                        ];
                      } else {
                        // 新しいエージェントのメッセージを開始
                        return [...prev, {
                          id: Date.now().toString() + Math.random(),
                          agent: agentName,
                          message: chunk
                        }];
                      }
                    });
                  } 
                  // 完全なメッセージの処理（後方互換性のため）
                  else if (parsed.message) {
                    setMessages(prev => [...prev, {
                      id: Date.now().toString() + Math.random(),
                      agent: parsed.agent,
                      message: parsed.message
                    }]);
                  }
                } catch (e) {
                  console.error('Parse error:', e, 'データ:', data);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <LoadingIndicator />}
            {/* 自動スクロール用の要素 */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}