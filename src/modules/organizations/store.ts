import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, OrgMember } from './types';

interface OrgStore {
  currentOrg: Organization | null;
  currentMember: OrgMember | null;
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentMember: (member: OrgMember | null) => void;
}

export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      currentOrg: null,
      currentMember: null,
      setCurrentOrg: (org) => set({ currentOrg: org }),
      setCurrentMember: (member) => set({ currentMember: member }),
    }),
    {
      name: 'org-store',
      partialize: (s) => ({ currentOrg: s.currentOrg }),
    }
  )
);
