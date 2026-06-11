import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type {
  ApiTreeResponse,
  ApiNodeResponse,
  ApiSummaryResponse,
  ApiReqLinkResponse,
} from '@/features/projects/components/bomData';

export interface CreateNodeDto {
  partId: string;
  quantity: number;
  unit?: string;
  status?: 'approved' | 'pending';
  parentId?: string | null;
  position?: number;
  notes?: string;
}

export interface UpdateNodeDto {
  quantity?: number;
  unit?: string;
  status?: 'approved' | 'pending';
  notes?: string;
}

export const bomService = {
  async getTree(projectId: string): Promise<ApiTreeResponse> {
    return apiClient.get<ApiTreeResponse>(ENDPOINTS.BOM.TREE(projectId));
  },

  async getSummary(projectId: string): Promise<ApiSummaryResponse> {
    return apiClient.get<ApiSummaryResponse>(ENDPOINTS.BOM.SUMMARY(projectId));
  },

  async createNode(projectId: string, dto: CreateNodeDto): Promise<ApiNodeResponse> {
    return apiClient.post<ApiNodeResponse>(ENDPOINTS.BOM.NODES(projectId), dto);
  },

  async getNode(nodeId: string): Promise<ApiNodeResponse> {
    return apiClient.get<ApiNodeResponse>(ENDPOINTS.BOM.NODE(nodeId));
  },

  async updateNode(nodeId: string, dto: UpdateNodeDto): Promise<ApiNodeResponse> {
    return apiClient.put<ApiNodeResponse>(ENDPOINTS.BOM.NODE(nodeId), dto);
  },

  async moveNode(nodeId: string, dto: { parentId: string | null; position?: number }): Promise<ApiNodeResponse> {
    return apiClient.patch<ApiNodeResponse>(ENDPOINTS.BOM.NODE_MOVE(nodeId), dto);
  },

  async deleteNode(nodeId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.BOM.NODE(nodeId));
  },

  async addRequirement(nodeId: string, requirementId: string): Promise<ApiReqLinkResponse> {
    return apiClient.post<ApiReqLinkResponse>(ENDPOINTS.BOM.NODE_REQUIREMENTS(nodeId), { requirementId });
  },

  async removeRequirement(linkId: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.BOM.REQ_LINK(linkId));
  },

  async exportCsv(projectId: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1'}${ENDPOINTS.BOM.EXPORT(projectId)}`,
      { credentials: 'include' },
    );
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};
