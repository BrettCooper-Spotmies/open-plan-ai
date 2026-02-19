import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ConversationFilter = 'all' | 'dms' | 'groups';

interface ChatState {
  activeConversationId: string | null;
  conversationFilter: ConversationFilter;
  searchQuery: string;
  isDetailPanelOpen: boolean;
  draftMessages: Record<string, string>;
  unreadCounts: Record<string, number>;

  setActiveConversation: (id: string | null) => void;
  setConversationFilter: (filter: ConversationFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  setDraft: (conversationId: string, draft: string) => void;
  getDraft: (conversationId: string) => string;
  markAsRead: (conversationId: string) => void;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeConversationId: null,
      conversationFilter: 'all',
      searchQuery: '',
      isDetailPanelOpen: false,
      draftMessages: {},
      unreadCounts: { 'conv-1': 2, 'conv-2': 1, 'conv-4': 3 },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) {
          set((state) => ({
            unreadCounts: { ...state.unreadCounts, [id]: 0 },
          }));
        }
      },
      setConversationFilter: (filter) => set({ conversationFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleDetailPanel: () => set((s) => ({ isDetailPanelOpen: !s.isDetailPanelOpen })),
      setDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),
      setDraft: (conversationId, draft) =>
        set((state) => ({
          draftMessages: { ...state.draftMessages, [conversationId]: draft },
        })),
      getDraft: (conversationId) => get().draftMessages[conversationId] || '',
      markAsRead: (conversationId) =>
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
        })),
      getTotalUnread: () => {
        const counts = get().unreadCounts;
        return Object.values(counts).reduce((sum, c) => sum + c, 0);
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({ draftMessages: state.draftMessages }),
    }
  )
);
