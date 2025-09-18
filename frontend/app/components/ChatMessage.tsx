import React from 'react';
import { Message } from '../types/chat';
import { getAgentColor, getAgentAvatar, getAgentArrowColor } from '../utils/agentHelpers';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const avatarUrl = getAgentAvatar(message.agent);
  const messageColor = getAgentColor(message.agent);
  const arrowColor = getAgentArrowColor(message.agent);

  return (
    <div className="flex gap-3">
      {avatarUrl && (
        <div className="flex-shrink-0">
          <img
            src={avatarUrl}
            alt={message.agent}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            onError={(e) => {
              e.currentTarget.src = '/images/default.jpg';
            }}
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-700 mb-1">
          {message.agent}
        </div>
        <div
          className={`p-3 rounded-lg border ${messageColor} relative ${
            !avatarUrl ? '' : 'ml-0'
          }`}
        >
          {avatarUrl && (
            <div 
              className={`absolute left-0 top-4 w-0 h-0 border-t-6 border-b-6 border-r-6 border-transparent border-r-current transform -translate-x-1 ${arrowColor}`}
            />
          )}
          <div className="text-gray-800 whitespace-pre-wrap">
            {message.message}
          </div>
        </div>
      </div>
    </div>
  );
};