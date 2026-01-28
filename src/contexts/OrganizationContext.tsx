import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { organizationsService, Organization } from '@/services/organizations.service';

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

  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const orgs = await organizationsService.getAll();
      setOrganizations(orgs);

      // Restore last selected org or pick first
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = savedOrgId ? orgs.find(o => o.id === savedOrgId) : null;
      setCurrentOrganizationState(savedOrg || orgs[0] || null);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrganizations();
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

  const value: OrganizationContextValue = {
    organizations,
    currentOrganization,
    isLoading,
    setCurrentOrganization,
    refreshOrganizations: fetchOrganizations,
    createOrganization,
  };

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
