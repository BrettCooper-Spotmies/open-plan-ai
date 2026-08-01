import { apiClient } from './api/client';
import { ENDPOINTS } from './api/endpoints';
import type {
  AssistantConversationSummary,
  AssistantConversationDetail,
  BackendAiScope,
  AssistantFocusEntity,
} from '@/features/assistant/assistantData';

export interface CreateConversationInput {
  scope: BackendAiScope;
  projectId?: string;
  orgId?: string;
  message: string;
  focusEntities?: AssistantFocusEntity[];
}

export interface AnswerQuestionInput {
  answers: Array<{ header: string; selected: string[] }>;
}

export const assistantService = {
  listConversations: () =>
    apiClient.get<AssistantConversationSummary[]>(ENDPOINTS.AI_CONVERSATIONS.LIST),

  createConversation: (input: CreateConversationInput) =>
    apiClient.post<AssistantConversationSummary>(ENDPOINTS.AI_CONVERSATIONS.CREATE, input),

  getConversation: (id: string) =>
    apiClient.get<AssistantConversationDetail>(ENDPOINTS.AI_CONVERSATIONS.BY_ID(id)),

  sendMessage: (id: string, message: string) =>
    apiClient.post(ENDPOINTS.AI_CONVERSATIONS.MESSAGES(id), { message }),

  answerQuestion: (id: string, input: AnswerQuestionInput) =>
    apiClient.post(ENDPOINTS.AI_CONVERSATIONS.ANSWER(id), input),
};
