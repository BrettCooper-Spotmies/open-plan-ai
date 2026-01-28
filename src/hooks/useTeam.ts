import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService, type TeamMember } from '@/services/team.service';
import { queryKeys } from '@/lib/queryClient';

export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.team.members(),
    queryFn: () => teamService.getAll(),
  });
}

export function useOrganizationTeamMembers(orgId: string) {
  return useQuery({
    queryKey: [...queryKeys.team.all, 'org', orgId] as const,
    queryFn: () => teamService.getByOrganization(orgId),
    enabled: !!orgId,
  });
}

export function useTeamMember(memberId: string) {
  return useQuery({
    queryKey: [...queryKeys.team.all, 'member', memberId] as const,
    queryFn: () => teamService.getById(memberId),
    enabled: !!memberId,
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, role, orgId }: { email: string; role: string; orgId: string }) =>
      teamService.invite(email, role, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role, orgId }: { memberId: string; role: string; orgId: string }) =>
      teamService.updateRole(memberId, role, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, orgId }: { memberId: string; orgId: string }) =>
      teamService.remove(memberId, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
    },
  });
}

export type { TeamMember };
