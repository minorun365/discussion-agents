import React from 'react';

export const LoadingIndicator: React.FC = () => {
  return (
    <div className="text-center text-gray-500">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-2">ディスカッション中…</p>
    </div>
  );
};