import { AgentName } from '../types/chat';

export const AGENT_COLORS: Record<AgentName, string> = {
  'AIみのるん': 'bg-blue-100 border-blue-300',
  'AI吉田真吾': 'bg-green-100 border-green-300',
  'AI淡路大輔': 'bg-purple-100 border-purple-300',
  '参加者からの質問': 'bg-gray-100 border-gray-300',
};

export const AGENT_AVATARS: Record<AgentName, string | null> = {
  'AIみのるん': '/images/minorun.jpg',
  'AI吉田真吾': '/images/shingo.png',
  'AI淡路大輔': '/images/awaji.png',
  '参加者からの質問': null,
};

export const AGENT_ARROW_COLORS: Record<AgentName, string> = {
  'AIみのるん': 'text-blue-100',
  'AI吉田真吾': 'text-green-100',
  'AI淡路大輔': 'text-purple-100',
  '参加者からの質問': 'text-gray-100',
};