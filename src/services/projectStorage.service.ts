import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'project-files';

// Allowed file types for project attachments
const ALLOWED_TYPES: Record<string, string> = {
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    // Archives
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

export interface UploadedProjectFile {
    id: string;
    name: string;
    size: string;
    sizeBytes: number;
    type: string;
    mimeType: string;
    url: string;
    path: string;
}

/**
 * Format bytes to human readable size
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a unique file name to avoid conflicts
 */
function generateFileName(originalName: string, projectId: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${projectId}/${timestamp}-${randomId}-${sanitizedName}`;
}

export const projectStorageService = {
    /**
     * Upload a file to project storage
     */
    async uploadFile(file: File, projectId: string): Promise<UploadedProjectFile> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Validate file type
        if (!ALLOWED_TYPES[file.type]) {
            throw new Error(`File type "${file.type}" is not allowed. Supported types: PDF, DOC, XLS, PPT, images, and archives.`);
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
        }

        const filePath = generateFileName(file.name, projectId);

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return {
            id: Math.random().toString(36).substring(2, 11),
            name: file.name,
            size: formatFileSize(file.size),
            sizeBytes: file.size,
            type: ALLOWED_TYPES[file.type],
            mimeType: file.type,
            url: publicUrl,
            path: filePath,
        };
    },

    /**
     * Upload multiple files
     */
    async uploadFiles(files: File[], projectId: string): Promise<UploadedProjectFile[]> {
        const results: UploadedProjectFile[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                const uploaded = await this.uploadFile(file, projectId);
                results.push(uploaded);
            } catch (error) {
                errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
            }
        }

        if (errors.length > 0 && results.length === 0) {
            throw new Error(errors.join('\n'));
        }

        return results;
    },

    /**
     * Delete a file from project storage
     */
    async deleteFile(filePath: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            throw new Error(`Failed to delete file: ${error.message}`);
        }
    },

    /**
     * Delete multiple files
     */
    async deleteFiles(filePaths: string[]): Promise<void> {
        if (filePaths.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

        if (error) {
            console.error('Delete error:', error);
            throw new Error(`Failed to delete files: ${error.message}`);
        }
    },

    /**
     * List all files for a project
     */
    async listProjectFiles(projectId: string): Promise<UploadedProjectFile[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(projectId);

        if (error) {
            console.error('List error:', error);
            throw new Error(`Failed to list files: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map(file => {
            const filePath = `${projectId}/${file.name}`;
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            // Extract original filename from the stored name
            const nameParts = file.name.split('-');
            const originalName = nameParts.length > 2 ? nameParts.slice(2).join('-') : file.name;

            return {
                id: file.id || file.name,
                name: originalName,
                size: formatFileSize(file.metadata?.size || 0),
                sizeBytes: file.metadata?.size || 0,
                type: (file.metadata?.mimetype || 'unknown').split('/').pop() || 'file',
                mimeType: file.metadata?.mimetype || 'application/octet-stream',
                url: publicUrl,
                path: filePath,
            };
        });
    },

    /**
     * Get download URL for a file
     */
    async getDownloadUrl(filePath: string): Promise<string> {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
            throw new Error(`Failed to get download URL: ${error.message}`);
        }

        return data.signedUrl;
    },
};
