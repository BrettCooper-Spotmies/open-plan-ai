import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export const notificationsService = {
  async getAll(): Promise<Notification[]> {
    return apiClient.get<Notification[]>(ENDPOINTS.NOTIFICATIONS.LIST);
  },

  async getUnreadCount(): Promise<number> {
    const result = await apiClient.get<{ count: number }>(ENDPOINTS.NOTIFICATIONS.COUNT);
    return result.count;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.READ(id), {});
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },
};
