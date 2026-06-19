import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  read: boolean;
  projectId: string | null;
  entityId: string | null;
  entityType: string | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
}

export type NotificationType = string;

export const notificationsService = {
  async getAll(): Promise<Notification[]> {
    return apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST);
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.NOTIFICATIONS.READ(id), {});
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.post(ENDPOINTS.NOTIFICATIONS.READ_ALL, {});
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },

  // Backend creates notifications server-side
  async create(_: unknown): Promise<Notification> {
    throw new Error('Notifications are created server-side');
  },

  // Legacy compat
  async getAllByUserId(_userId: string): Promise<Notification[]> {
    return this.getAll();
  },

  async markAllAsReadByUserId(_userId: string): Promise<void> {
    return this.markAllAsRead();
  },

  async deleteAllRead(_userId: string): Promise<void> {
    // No backend endpoint yet
  },
};
