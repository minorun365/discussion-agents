import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-800">
          マルチエージェントにパネルディスカッションさせよう！
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          サーバーレスの巨匠に何でも質問してみましょう
        </p>
      </div>
    </header>
  );
};