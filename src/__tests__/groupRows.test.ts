import { describe, it, expect } from 'vitest';
import { groupRows } from '../api.js';

// Minimal factory for ApiRow-shaped objects
function row(overrides: Record<string, string> = {}) {
  return {
    camis: '50000001',
    dba: 'TEST PLACE',
    boro: 'Manhattan',
    building: '100',
    street: 'MAIN ST',
    zipcode: '10001',
    cuisine_description: 'American',
    inspection_date: '2024-06-01T00:00:00.000',
    inspection_type: 'Cycle Inspection / Initial Inspection',
    score: '12',
    grade: 'A',
    violation_code: '02A',
    violation_description: 'Cold food item held above 41°F',
    critical_flag: 'Critical',
    ...overrides,
  };
}

describe('groupRows', () => {
  it('returns empty array for empty input', () => {
    expect(groupRows([])).toEqual([]);
  });

  it('groups multiple violation rows from same inspection into one inspection', () => {
    const rows = [
      row({ violation_code: '02A' }),
      row({ violation_code: '06D' }),
    ];
    const [rest] = groupRows(rows as any);
    const inspections = Object.values(rest.inspections);
    expect(inspections).toHaveLength(1);
    expect(inspections[0].violations).toHaveLength(2);
  });

  it('creates separate inspections for different dates', () => {
    const rows = [
      row({ inspection_date: '2024-06-01T00:00:00.000', grade: 'A', score: '10', violation_code: '02A' }),
      row({ inspection_date: '2023-06-01T00:00:00.000', grade: 'B', score: '20', violation_code: '06D' }),
    ];
    const [rest] = groupRows(rows as any);
    expect(Object.keys(rest.inspections)).toHaveLength(2);
  });

  it('sets latest to the most recent inspection', () => {
    const rows = [
      row({ inspection_date: '2024-06-01T00:00:00.000', grade: 'A' }),
      row({ inspection_date: '2023-01-01T00:00:00.000', grade: 'B' }),
    ];
    const [rest] = groupRows(rows as any);
    expect(rest.latest?.date).toBe('2024-06-01T00:00:00.000');
  });

  it('sets latestGraded to most recent inspection that has a grade', () => {
    const rows = [
      // Most recent — no grade yet (pending re-inspection)
      row({ inspection_date: '2025-01-01T00:00:00.000', grade: '', score: '35', violation_code: '04K' }),
      // Older — graded A
      row({ inspection_date: '2024-06-01T00:00:00.000', grade: 'A', score: '10' }),
    ];
    const [rest] = groupRows(rows as any);
    expect(rest.latest?.date).toBe('2025-01-01T00:00:00.000');
    expect(rest.latestGraded?.grade).toBe('A');
    expect(rest.latestGraded?.date).toBe('2024-06-01T00:00:00.000');
  });

  it('skips sentinel rows (pre-2000 dates)', () => {
    const rows = [
      row({ inspection_date: '1900-01-01T00:00:00.000' }),
      row({ inspection_date: '2024-06-01T00:00:00.000' }),
    ];
    const [rest] = groupRows(rows as any);
    expect(Object.keys(rest.inspections)).toHaveLength(1);
  });

  it('marks re-inspections from inspection_type', () => {
    const r = row({ inspection_type: 'Cycle Inspection / Re-inspection' });
    const [rest] = groupRows([r] as any);
    const insp = Object.values(rest.inspections)[0];
    expect(insp.reinspection).toBe(true);
  });

  it('does not mark initial inspections as re-inspections', () => {
    const [rest] = groupRows([row()] as any);
    expect(Object.values(rest.inspections)[0].reinspection).toBe(false);
  });

  it('marks closed establishments from action field', () => {
    const r = row({ action: 'Establishment Closed by DOHMH.' });
    const [rest] = groupRows([r] as any);
    expect(Object.values(rest.inspections)[0].closed).toBe(true);
  });

  it('marks critical violations', () => {
    const r = row({ critical_flag: 'Critical' });
    const [rest] = groupRows([r] as any);
    expect(Object.values(rest.inspections)[0].violations[0].critical).toBe(true);
  });

  it('marks non-critical violations', () => {
    const r = row({ critical_flag: 'Not Critical' });
    const [rest] = groupRows([r] as any);
    expect(Object.values(rest.inspections)[0].violations[0].critical).toBe(false);
  });

  it('sorts results: A grade before B before C, then alpha', () => {
    const rows = [
      { ...row({ camis: '1', dba: 'ZITI', grade: 'C' }) },
      { ...row({ camis: '2', dba: 'ALPHA', grade: 'A' }) },
      { ...row({ camis: '3', dba: 'BETA', grade: 'B' }) },
      { ...row({ camis: '4', dba: 'GAMMA', grade: 'A' }) },
    ];
    const results = groupRows(rows as any);
    expect(results.map(r => r.dba)).toEqual(['ALPHA', 'GAMMA', 'BETA', 'ZITI']);
  });

  it('groups multiple restaurants by camis', () => {
    const rows = [
      row({ camis: '111', dba: 'FIRST' }),
      row({ camis: '222', dba: 'SECOND' }),
    ];
    expect(groupRows(rows as any)).toHaveLength(2);
  });

  it('parses score as integer', () => {
    const [rest] = groupRows([row({ score: '27' })] as any);
    expect(Object.values(rest.inspections)[0].score).toBe(27);
  });

  it('handles rows with no violation code (inspection with no violations)', () => {
    const r = { ...row(), violation_code: undefined, violation_description: undefined };
    const [rest] = groupRows([r] as any);
    expect(Object.values(rest.inspections)[0].violations).toHaveLength(0);
  });
});
