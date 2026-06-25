import { describe, it, expect } from 'vitest';
import {
  checkColumnMappingConfidence,
  applyColumnMapping,
  parseSubcomponentImportRows,
  getCategoryMeta,
} from '../bomData';

describe('checkColumnMappingConfidence', () => {
  it('is confident when all required columns match known aliases', () => {
    const result = checkColumnMappingConfidence([
      'Part Number', 'Description', 'Category', 'Quantity', 'UOM',
    ]);
    expect(result.confident).toBe(true);
    expect(result.unmatchedRequired).toEqual([]);
  });

  it('is not confident when a required column is renamed', () => {
    const result = checkColumnMappingConfidence([
      'Item Number', 'Description', 'Category', 'Quantity',
    ]);
    expect(result.confident).toBe(false);
    expect(result.unmatchedRequired).toContain('Part Number');
  });

  it('stays confident when only an optional column is missing', () => {
    const result = checkColumnMappingConfidence([
      'Part Number', 'Description', 'Category', 'Quantity',
    ]);
    expect(result.confident).toBe(true);
  });
});

describe('applyColumnMapping', () => {
  it('renames raw header keys to their mapped canonical labels', () => {
    const rawRows = [{ 'Item No.': 'EV-001', 'Item Desc': 'Widget' }];
    const mapping = { 'Item No.': 'Part Number', 'Item Desc': 'Description' };

    const mapped = applyColumnMapping(rawRows, mapping);

    expect(mapped).toEqual([{ 'Part Number': 'EV-001', 'Description': 'Widget' }]);
  });

  it('produces rows that validate identically through parseSubcomponentImportRows', () => {
    const rawRows = [{
      'Item No.': 'EV-001', 'Item Desc': 'Widget', 'Type': 'connector', 'Qty': '3',
    }];
    const mapping = {
      'Item No.': 'Part Number', 'Item Desc': 'Description', 'Type': 'Category', 'Qty': 'Quantity',
    };

    const mapped = applyColumnMapping(rawRows, mapping);
    const [parsed] = parseSubcomponentImportRows(mapped, []);

    expect(parsed.errors).toEqual([]);
    expect(parsed.partNumber).toBe('EV-001');
    expect(parsed.category).toBe('connector');
    expect(parsed.quantity).toBe(3);
  });
});

describe('parseSubcomponentImportRows — custom categories', () => {
  it('accepts a custom category not in the known preset list', () => {
    const rows = [{
      'Part Number': 'PCB-001', 'Description': '4-layer FR4 PCB', 'Category': 'pcb', 'Quantity': '1',
    }];

    const [parsed] = parseSubcomponentImportRows(rows, []);

    expect(parsed.errors).toEqual([]);
    expect(parsed.category).toBe('pcb');
  });

  it('still requires a non-empty category', () => {
    const rows = [{
      'Part Number': 'PCB-001', 'Description': '4-layer FR4 PCB', 'Category': '', 'Quantity': '1',
    }];

    const [parsed] = parseSubcomponentImportRows(rows, []);

    expect(parsed.errors).toContain('Missing Category');
  });
});

describe('getCategoryMeta', () => {
  it('returns the known preset metadata for a recognized category', () => {
    const meta = getCategoryMeta('power');
    expect(meta.label).toBe('Power Electronics');
  });

  it('humanizes an unrecognized custom category instead of mislabeling it', () => {
    const meta = getCategoryMeta('pcb');
    expect(meta.label).toBe('Pcb');
    expect(meta.label).not.toBe('Top Assembly');
  });

  it('humanizes multi-word custom categories', () => {
    const meta = getCategoryMeta('mechanical_parts');
    expect(meta.label).toBe('Mechanical Parts');
  });
});
