import { MessageSquare, MessagesSquare } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-selection' | 'no-conversations' | 'no-messages';
}

export function EmptyState({ type }: EmptyStateProps) {
  const config = {
    'no-selection': {
      icon: MessageSquare,
      title: 'Select a conversation',
      description: 'Choose a conversation from the list to start messaging',
    },
    'no-conversations': {
      icon: MessagesSquare,
      title: 'No conversations yet',
      description: 'Start a new direct message or create a group to get started',
    },
    'no-messages': {
      icon: MessageSquare,
      title: 'No messages yet',
      description: 'Send the first message to start the conversation',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{config.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
      </div>
    </div>
  );
}
