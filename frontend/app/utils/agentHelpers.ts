import { AGENT_COLORS, AGENT_AVATARS, AGENT_ARROW_COLORS } from '../constants/agents';
import { AgentName } from '../types/chat';

export const getAgentColor = (agent: string): string => {
  return AGENT_COLORS[agent as AgentName] || 'bg-white border-gray-200';
};

export const getAgentAvatar = (agent: string): string | null => {
  const avatar = AGENT_AVATARS[agent as AgentName];
  if (avatar === undefined) {
    return '/images/default.jpg';
  }
  return avatar;
};

export const getAgentArrowColor = (agent: string): string => {
  return AGENT_ARROW_COLORS[agent as AgentName] || 'text-gray-100';
};