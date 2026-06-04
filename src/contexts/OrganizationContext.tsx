import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { organizationsService, Organization } from '@/services/organizations.service';
import { sanitizeUuidCandidate } from '@/utils/uuid';
import { logger } from '@/services/monitoring/logger';

interface OrganizationContextValue {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, description?: string) => Promise<Organization>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const CURRENT_ORG_KEY = 'openplan-current-org';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      hasLoadedOnceRef.current = false;
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setIsLoading(false);
      return;
    }

    const showGlobalLoading = !hasLoadedOnceRef.current;
    try {
      if (showGlobalLoading) setIsLoading(true);
      const orgs = await organizationsService.getAll();
      setOrganizations(orgs);

      // Restore last selected org or pick first (sanitize: quoted/pasted IDs break Postgres uuid)
      const rawSavedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrgId = rawSavedOrgId ? sanitizeUuidCandidate(rawSavedOrgId) : '';
      const savedOrg = savedOrgId ? orgs.find((o) => o.id === savedOrgId) ?? null : null;
      if (rawSavedOrgId && savedOrg && rawSavedOrgId !== savedOrg.id) {
        localStorage.setItem(CURRENT_ORG_KEY, savedOrg.id);
      }
      setCurrentOrganizationState(savedOrg || orgs[0] || null);
    } catch (error) {
      logger.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations, user?.id]);

  const setCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem(CURRENT_ORG_KEY, org.id);
    } else {
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  }, []);

  const createOrganization = useCallback(async (name: string, description?: string) => {
    const slug = organizationsService.generateSlug(name);
    const newOrg = await organizationsService.create({ name, slug, description });
    setOrganizations(prev => [...prev, newOrg]);
    setCurrentOrganization(newOrg);
    return newOrg;
  }, [setCurrentOrganization]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      currentOrganization,
      isLoading,
      setCurrentOrganization,
      refreshOrganizations: fetchOrganizations,
      createOrganization,
    }),
    [
      organizations,
      currentOrganization,
      isLoading,
      setCurrentOrganization,
      fetchOrganizations,
      createOrganization,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
