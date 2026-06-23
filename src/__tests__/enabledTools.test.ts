import { resolveEnabledTools } from '../enabledTools';

const ALL = [
  'get-employee',
  'get-employee-photo',
  'get-employee-directory',
  'get-employee-goals',
  'estimate-time-off-balance',
  'get-time-off-requests',
  'get-whos-out',
  'list-company-files',
  'get-company-file',
  'get-meta-fields',
];

describe('resolveEnabledTools', () => {
  it('returns all tools when unset', () => {
    const { enabled, unknown } = resolveEnabledTools(undefined, ALL);
    expect(enabled).toEqual(ALL);
    expect(unknown).toEqual([]);
  });

  it('returns all tools when empty/whitespace', () => {
    expect(resolveEnabledTools('   ', ALL).enabled).toEqual(ALL);
  });

  it('filters to the allowlist, preserving requested order', () => {
    const { enabled, unknown } = resolveEnabledTools(
      'get-whos-out, get-employee-directory',
      ALL,
    );
    expect(enabled).toEqual(['get-whos-out', 'get-employee-directory']);
    expect(unknown).toEqual([]);
  });

  it('accepts space- or comma-separated lists', () => {
    expect(resolveEnabledTools('get-whos-out get-meta-fields', ALL).enabled).toEqual([
      'get-whos-out',
      'get-meta-fields',
    ]);
  });

  it('reports unknown names without enabling them', () => {
    const { enabled, unknown } = resolveEnabledTools(
      'get-whos-out, not-a-tool',
      ALL,
    );
    expect(enabled).toEqual(['get-whos-out']);
    expect(unknown).toEqual(['not-a-tool']);
  });

  it('the 7-tool read-only deployment set resolves cleanly (no unknowns)', () => {
    const seven =
      'get-employee, get-employee-photo, get-employee-directory, ' +
      'estimate-time-off-balance, get-time-off-requests, get-whos-out, get-meta-fields';
    const { enabled, unknown } = resolveEnabledTools(seven, ALL);
    expect(enabled).toHaveLength(7);
    expect(unknown).toEqual([]);
    // the deliberately-off tools are absent
    expect(enabled).not.toContain('get-employee-goals');
    expect(enabled).not.toContain('list-company-files');
    expect(enabled).not.toContain('get-company-file');
  });
});
