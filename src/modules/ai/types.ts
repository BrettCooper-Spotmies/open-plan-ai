export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AiConversation {
  id: string;
  title?: string;
  projectId?: string;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiGeneratePayload {
  prompt: string;
  projectId?: string;
  context?: string;
  conversationId?: string;
}

export interface AiGeneratedTasks {
  tasks: Array<{
    title: string;
    description?: string;
    priority?: string;
    estimatedHours?: number;
  }>;
}
