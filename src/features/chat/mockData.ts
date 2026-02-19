import { Conversation, ChatMessage, ReachableUser } from './types';

export const CURRENT_USER_ID = 'current-user';

export const mockReachableUsers: ReachableUser[] = [
  { id: 'user-1', name: 'Alice Chen', email: 'alice@openplan.ai', initials: 'AC', role: 'Designer', isOnline: true },
  { id: 'user-2', name: 'Bob Martinez', email: 'bob@openplan.ai', initials: 'BM', role: 'Engineer', isOnline: false },
  { id: 'user-3', name: 'Carol Davis', email: 'carol@openplan.ai', initials: 'CD', role: 'PM', isOnline: true },
  { id: 'user-4', name: 'David Kim', email: 'david@openplan.ai', initials: 'DK', role: 'Engineer', isOnline: true },
  { id: 'user-5', name: 'Eva Thompson', email: 'eva@openplan.ai', initials: 'ET', role: 'QA Lead', isOnline: false },
  { id: 'user-6', name: 'Frank Wilson', email: 'frank@openplan.ai', initials: 'FW', role: 'DevOps', isOnline: true },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    type: 'dm',
    name: 'Alice Chen',
    members: [
      { id: CURRENT_USER_ID, name: 'You', email: 'you@openplan.ai', initials: 'YO', role: 'member', isOnline: true },
      { id: 'user-1', name: 'Alice Chen', email: 'alice@openplan.ai', initials: 'AC', role: 'member', isOnline: true },
    ],
    lastMessage: { content: 'Sounds good, let me check the designs', senderName: 'Alice Chen', createdAt: '2026-02-19T10:32:00Z' },
    lastMessageAt: '2026-02-19T10:32:00Z',
    createdAt: '2026-02-10T09:00:00Z',
  },
  {
    id: 'conv-2',
    type: 'dm',
    name: 'Bob Martinez',
    members: [
      { id: CURRENT_USER_ID, name: 'You', email: 'you@openplan.ai', initials: 'YO', role: 'member', isOnline: true },
      { id: 'user-2', name: 'Bob Martinez', email: 'bob@openplan.ai', initials: 'BM', role: 'member', isOnline: false },
    ],
    lastMessage: { content: 'PR is ready for review', senderName: 'Bob Martinez', createdAt: '2026-02-19T08:15:00Z' },
    lastMessageAt: '2026-02-19T08:15:00Z',
    createdAt: '2026-02-12T14:00:00Z',
  },
  {
    id: 'conv-3',
    type: 'dm',
    name: 'Carol Davis',
    members: [
      { id: CURRENT_USER_ID, name: 'You', email: 'you@openplan.ai', initials: 'YO', role: 'member', isOnline: true },
      { id: 'user-3', name: 'Carol Davis', email: 'carol@openplan.ai', initials: 'CD', role: 'member', isOnline: true },
    ],
    lastMessage: { content: 'Can we sync on the sprint planning?', senderName: 'You', createdAt: '2026-02-18T16:45:00Z' },
    lastMessageAt: '2026-02-18T16:45:00Z',
    createdAt: '2026-02-05T11:00:00Z',
  },
  {
    id: 'conv-4',
    type: 'group',
    name: 'Frontend Team',
    description: 'Discussion channel for the frontend engineering team',
    members: [
      { id: CURRENT_USER_ID, name: 'You', email: 'you@openplan.ai', initials: 'YO', role: 'admin', isOnline: true },
      { id: 'user-1', name: 'Alice Chen', email: 'alice@openplan.ai', initials: 'AC', role: 'member', isOnline: true },
      { id: 'user-2', name: 'Bob Martinez', email: 'bob@openplan.ai', initials: 'BM', role: 'member', isOnline: false },
      { id: 'user-4', name: 'David Kim', email: 'david@openplan.ai', initials: 'DK', role: 'member', isOnline: true },
    ],
    lastMessage: { content: 'I pushed the new component library updates', senderName: 'David Kim', createdAt: '2026-02-19T09:50:00Z' },
    lastMessageAt: '2026-02-19T09:50:00Z',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'conv-5',
    type: 'group',
    name: 'Project Alpha',
    description: 'Cross-functional team for Project Alpha launch',
    members: [
      { id: CURRENT_USER_ID, name: 'You', email: 'you@openplan.ai', initials: 'YO', role: 'owner', isOnline: true },
      { id: 'user-3', name: 'Carol Davis', email: 'carol@openplan.ai', initials: 'CD', role: 'admin', isOnline: true },
      { id: 'user-5', name: 'Eva Thompson', email: 'eva@openplan.ai', initials: 'ET', role: 'member', isOnline: false },
      { id: 'user-6', name: 'Frank Wilson', email: 'frank@openplan.ai', initials: 'FW', role: 'member', isOnline: true },
    ],
    lastMessage: { content: 'QA testing starts tomorrow', senderName: 'Eva Thompson', createdAt: '2026-02-18T14:20:00Z' },
    lastMessageAt: '2026-02-18T14:20:00Z',
    createdAt: '2026-01-20T08:00:00Z',
  },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  'conv-1': [
    { id: 'msg-1', conversationId: 'conv-1', senderId: 'user-1', senderName: 'Alice Chen', senderInitials: 'AC', contentType: 'text', content: 'Hey! Have you seen the new mockups for the dashboard?', attachments: [], createdAt: '2026-02-19T09:00:00Z', isEdited: false },
    { id: 'msg-2', conversationId: 'conv-1', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'Not yet, can you share the link?', attachments: [], createdAt: '2026-02-19T09:02:00Z', isEdited: false },
    { id: 'msg-3', conversationId: 'conv-1', senderId: 'user-1', senderName: 'Alice Chen', senderInitials: 'AC', contentType: 'text', content: 'Sure! I\'ll send it over in a bit. The new card components look really clean.', attachments: [], createdAt: '2026-02-19T09:03:00Z', isEdited: false },
    { id: 'msg-4', conversationId: 'conv-1', senderId: 'user-1', senderName: 'Alice Chen', senderInitials: 'AC', contentType: 'text', content: 'Also, we should discuss the color palette for dark mode', attachments: [], createdAt: '2026-02-19T09:03:30Z', isEdited: false },
    { id: 'msg-5', conversationId: 'conv-1', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'Great, I\'d love to review them. Dark mode is a priority for this sprint.', attachments: [], createdAt: '2026-02-19T10:30:00Z', isEdited: false },
    { id: 'msg-6', conversationId: 'conv-1', senderId: 'user-1', senderName: 'Alice Chen', senderInitials: 'AC', contentType: 'text', content: 'Sounds good, let me check the designs', attachments: [], createdAt: '2026-02-19T10:32:00Z', isEdited: false },
  ],
  'conv-2': [
    { id: 'msg-7', conversationId: 'conv-2', senderId: 'user-2', senderName: 'Bob Martinez', senderInitials: 'BM', contentType: 'text', content: 'Hey, I finished the API integration for the notifications module', attachments: [], createdAt: '2026-02-19T07:45:00Z', isEdited: false },
    { id: 'msg-8', conversationId: 'conv-2', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'Awesome! Any breaking changes I should know about?', attachments: [], createdAt: '2026-02-19T08:00:00Z', isEdited: false },
    { id: 'msg-9', conversationId: 'conv-2', senderId: 'user-2', senderName: 'Bob Martinez', senderInitials: 'BM', contentType: 'text', content: 'Nope, it\'s backward compatible. PR is ready for review', attachments: [], createdAt: '2026-02-19T08:15:00Z', isEdited: false },
  ],
  'conv-3': [
    { id: 'msg-10', conversationId: 'conv-3', senderId: 'user-3', senderName: 'Carol Davis', senderInitials: 'CD', contentType: 'text', content: 'We need to finalize the sprint goals by EOD', attachments: [], createdAt: '2026-02-18T15:00:00Z', isEdited: false },
    { id: 'msg-11', conversationId: 'conv-3', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'Can we sync on the sprint planning?', attachments: [], createdAt: '2026-02-18T16:45:00Z', isEdited: false },
  ],
  'conv-4': [
    { id: 'msg-12', conversationId: 'conv-4', senderId: 'user-1', senderName: 'Alice Chen', senderInitials: 'AC', contentType: 'text', content: 'Team standup notes: we\'re on track for the milestone', attachments: [], createdAt: '2026-02-19T09:00:00Z', isEdited: false },
    { id: 'msg-13', conversationId: 'conv-4', senderId: 'user-2', senderName: 'Bob Martinez', senderInitials: 'BM', contentType: 'text', content: 'I might need an extra day for the auth refactor', attachments: [], createdAt: '2026-02-19T09:15:00Z', isEdited: false },
    { id: 'msg-14', conversationId: 'conv-4', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'That\'s fine Bob, just keep the team updated', attachments: [], createdAt: '2026-02-19T09:20:00Z', isEdited: false },
    { id: 'msg-15', conversationId: 'conv-4', senderId: 'user-4', senderName: 'David Kim', senderInitials: 'DK', contentType: 'system', content: 'David Kim joined the group', attachments: [], createdAt: '2026-02-19T09:30:00Z', isEdited: false },
    { id: 'msg-16', conversationId: 'conv-4', senderId: 'user-4', senderName: 'David Kim', senderInitials: 'DK', contentType: 'text', content: 'I pushed the new component library updates', attachments: [], createdAt: '2026-02-19T09:50:00Z', isEdited: false },
  ],
  'conv-5': [
    { id: 'msg-17', conversationId: 'conv-5', senderId: 'user-3', senderName: 'Carol Davis', senderInitials: 'CD', contentType: 'text', content: 'Launch checklist is 80% complete', attachments: [], createdAt: '2026-02-18T10:00:00Z', isEdited: false },
    { id: 'msg-18', conversationId: 'conv-5', senderId: 'user-6', senderName: 'Frank Wilson', senderInitials: 'FW', contentType: 'text', content: 'CI/CD pipeline is green across all environments', attachments: [], createdAt: '2026-02-18T11:30:00Z', isEdited: false },
    { id: 'msg-19', conversationId: 'conv-5', senderId: CURRENT_USER_ID, senderName: 'You', senderInitials: 'YO', contentType: 'text', content: 'Excellent work everyone! Let\'s keep the momentum going.', attachments: [], createdAt: '2026-02-18T13:00:00Z', isEdited: false },
    { id: 'msg-20', conversationId: 'conv-5', senderId: 'user-5', senderName: 'Eva Thompson', senderInitials: 'ET', contentType: 'text', content: 'QA testing starts tomorrow', attachments: [], createdAt: '2026-02-18T14:20:00Z', isEdited: false },
  ],
};
