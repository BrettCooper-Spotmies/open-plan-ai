import { apiClient } from './api/client';
import { ENDPOINTS } from './api/endpoints';
import { config } from '@/config';

// ─── Types — mirror the backend's google-sheets.types.ts response shapes ──────

// Org-level — mirrors GoogleDriveStatus exactly.
export interface GoogleSheetsOrgStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

// Project-level — what the BOM part editor needs: whether the org is
// connected at all, and whether this specific project has a sheet linked.
export interface GoogleSheetsLinkStatus {
  orgConnected: boolean;
  email: string | null;
  linked: boolean;
  spreadsheetId: string | null;
  sheetTabName: string | null;
}

export interface SheetTab {
  sheetId: number;
  title: string;
}

export interface SheetTabsResponse {
  spreadsheetId: string;
  spreadsheetTitle: string;
  tabs: SheetTab[];
}

export interface LinkSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetTabName: string;
}

export interface ColumnMappingPreview {
  headerRowIndex: number;
  headerRowLowConfidence: boolean;
  mapping: Record<string, string>;
  unmatchedColumns: string[];
  ambiguousColumns: string[];
  leadTimeColumnHeader: string | null;
  leadTimeColumnUnit: 'days' | 'weeks' | 'months' | null;
  reusedPersistedMapping: boolean;
  usedAi: boolean;
}

export interface ExportFieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ExportChangedRow {
  partNumber: string;
  changes: ExportFieldChange[];
}

export interface ExportRenamedHeader {
  canonicalLabel: string;
  oldHeader: string;
  newHeader: string;
}

export interface ExportPreview {
  isFirstExport: boolean;
  newFields: string[];
  renamedHeaders: ExportRenamedHeader[];
  newPartRows: string[];
  changedRows: ExportChangedRow[];
  unchangedCount: number;
  totalRows: number;
}

export interface ExportAnswers {
  addNewFields: boolean;
  updateChangedColumns: boolean;
  renameHeaders: boolean;
}

export interface ExportCommitResult {
  newFieldsAdded: number;
  columnsUpdated: number;
  headersRenamed: number;
  newRowsWritten: number;
  totalRowsWritten: number;
}

export type ImportRowStatus = 'needs-input' | 'ambiguous-unit' | 'new-part' | 'matched-changed' | 'matched-unchanged';

export interface ImportRowPreview {
  rowIndex: number;
  partNumber: string;
  status: ImportRowStatus;
  values: Record<string, string>;
  missingRequiredFields: string[];
  aiSuggestions: Partial<Record<'Part Name' | 'Description' | 'Category', string>>;
  leadTimeRaw: string | null;
  leadTimeDays: number | null;
  leadTimeAmbiguous: boolean;
  changes: ExportFieldChange[];
}

export interface ImportPreview {
  headerRowIndex: number;
  headerRowLowConfidence: boolean;
  unmatchedColumns: string[];
  ambiguousColumns: string[];
  rows: ImportRowPreview[];
}

export interface ImportRowResolution {
  rowIndex: number;
  resolvedRequiredFields?: Partial<Record<'Part Number' | 'Part Name' | 'Description' | 'Category' | 'Quantity', string>>;
  resolvedLeadTimeDays?: number;
}

export interface ImportCommitRowResult {
  rowIndex: number;
  partNumber: string;
  outcome: 'created' | 'updated' | 'unchanged' | 'skipped' | 'failed';
  reason?: string;
}

export interface ImportCommitResult {
  results: ImportCommitRowResult[];
  createdCount: number;
  updatedCount: number;
  failedCount: number;
}

export const googleSheetsService = {
  /**
   * Full backend URL that kicks off the OAuth flow. Must be used as a real
   * page navigation (`window.location.href = ...`), not an apiClient fetch —
   * same reasoning as googleDriveService/googleMeetService. Org-scoped, just
   * like Drive/Meet: connect once from Integrations, then link a spreadsheet
   * per project afterward (no per-project OAuth).
   */
  getConnectUrl(orgId: string): string {
    const base = config.api.baseUrl.replace(/\/$/, '');
    return `${base}${ENDPOINTS.GOOGLE_SHEETS.CONNECT(orgId)}`;
  },

  async getOrgStatus(orgId: string): Promise<GoogleSheetsOrgStatus> {
    return apiClient.get<GoogleSheetsOrgStatus>(ENDPOINTS.GOOGLE_SHEETS.ORG_STATUS(orgId));
  },

  async disconnect(orgId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.GOOGLE_SHEETS.DISCONNECT(orgId));
  },

  async getLinkStatus(projectId: string): Promise<GoogleSheetsLinkStatus> {
    return apiClient.get<GoogleSheetsLinkStatus>(ENDPOINTS.GOOGLE_SHEETS.LINK_STATUS(projectId));
  },

  async previewTabs(projectId: string, spreadsheetUrl: string): Promise<SheetTabsResponse> {
    return apiClient.post<SheetTabsResponse>(ENDPOINTS.GOOGLE_SHEETS.TABS(projectId), { spreadsheetUrl });
  },

  async linkSpreadsheet(projectId: string, spreadsheetUrl: string, sheetTabName?: string): Promise<LinkSpreadsheetResponse> {
    return apiClient.post<LinkSpreadsheetResponse>(ENDPOINTS.GOOGLE_SHEETS.LINK(projectId), { spreadsheetUrl, sheetTabName });
  },

  async unlinkSpreadsheet(projectId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.GOOGLE_SHEETS.UNLINK(projectId));
  },

  async previewColumnMapping(projectId: string): Promise<ColumnMappingPreview> {
    return apiClient.get<ColumnMappingPreview>(ENDPOINTS.GOOGLE_SHEETS.COLUMN_MAPPING(projectId));
  },

  async confirmColumnMapping(projectId: string, mapping: Record<string, string>): Promise<void> {
    await apiClient.post(ENDPOINTS.GOOGLE_SHEETS.COLUMN_MAPPING(projectId), { mapping });
  },

  async previewExport(projectId: string): Promise<ExportPreview> {
    return apiClient.get<ExportPreview>(ENDPOINTS.GOOGLE_SHEETS.EXPORT_PREVIEW(projectId));
  },

  async commitExport(projectId: string, answers: ExportAnswers): Promise<ExportCommitResult> {
    return apiClient.post<ExportCommitResult>(ENDPOINTS.GOOGLE_SHEETS.EXPORT_COMMIT(projectId), answers);
  },

  async previewImport(projectId: string): Promise<ImportPreview> {
    return apiClient.get<ImportPreview>(ENDPOINTS.GOOGLE_SHEETS.IMPORT_PREVIEW(projectId));
  },

  async commitImport(projectId: string, rows: ImportRowResolution[]): Promise<ImportCommitResult> {
    return apiClient.post<ImportCommitResult>(ENDPOINTS.GOOGLE_SHEETS.IMPORT_COMMIT(projectId), { rows });
  },
};
