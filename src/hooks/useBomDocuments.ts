import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

// Plain async helper — usable outside React hooks (e.g. in mutation callbacks)
export async function uploadBomDocumentFile(nodeId: string, file: File): Promise<BomAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityId', nodeId);
  formData.append('entityType', 'bom_node');
  const res = await apiClient.raw.post<{ success: boolean; data: BomAttachment }>(
    ENDPOINTS.UPLOADS.ATTACHMENTS,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

// Plain async helper for linking an external URL as a document — usable outside React hooks
export async function addBomDocumentLink(nodeId: string, url: string, fileName?: string): Promise<BomAttachment> {
  const res = await apiClient.raw.post<{ success: boolean; data: BomAttachment }>(
    ENDPOINTS.UPLOADS.ATTACHMENT_LINK,
    { entityId: nodeId, entityType: 'bom_node', url, fileName },
  );
  return res.data.data;
}

export interface BomAttachment {
  id: string;
  entityId: string;
  entityType: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;   // "serve:attachments/bom_node/..."
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
}

const ENTITY_TYPE = 'bom_node';

export function useBomDocuments(nodeId: string | undefined) {
  return useQuery({
    queryKey: ['bom-documents', nodeId],
    queryFn: () => apiClient.get<BomAttachment[]>(ENDPOINTS.UPLOADS.BY_ENTITY(ENTITY_TYPE, nodeId!)),
    enabled: !!nodeId,
  });
}

export function useUploadBomDocument(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityId', nodeId);
      formData.append('entityType', ENTITY_TYPE);
      const res = await apiClient.raw.post<{ success: boolean; data: BomAttachment }>(
        ENDPOINTS.UPLOADS.ATTACHMENTS,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-documents', nodeId] });
    },
  });
}

export function useAddBomDocumentLink(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, fileName }: { url: string; fileName?: string }) => {
      const res = await apiClient.raw.post<{ success: boolean; data: BomAttachment }>(
        ENDPOINTS.UPLOADS.ATTACHMENT_LINK,
        { entityId: nodeId, entityType: ENTITY_TYPE, url, fileName },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-documents', nodeId] });
    },
  });
}

export function useDeleteBomDocument(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      apiClient.delete<void>(ENDPOINTS.UPLOADS.ATTACHMENT(attachmentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom-documents', nodeId] });
    },
  });
}
