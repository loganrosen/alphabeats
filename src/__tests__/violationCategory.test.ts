import { describe, it, expect } from 'vitest';
import { violationCategory } from '../violationCategory.js';

describe('violationCategory', () => {
  it('maps rodent codes to rat emoji', () => {
    expect(violationCategory('04K').emoji).toBe('🐀');
    expect(violationCategory('04L').emoji).toBe('🐀');
  });

  it('maps cockroach codes to roach emoji', () => {
    expect(violationCategory('04M').emoji).toBe('🪳');
    expect(violationCategory('04N').emoji).toBe('🪳');
  });

  it('maps 08A (pest harborage conditions) to warning, not rat', () => {
    // 08A is structural/environmental, not an actual rodent sighting
    const cat = violationCategory('08A');
    expect(cat.emoji).toBe('⚠️');
    expect(cat.label).toBe('Pest harborage conditions');
  });

  it('maps temperature codes to thermometer emoji', () => {
    expect(violationCategory('02A').emoji).toBe('🌡️');
    expect(violationCategory('02G').emoji).toBe('🌡️');
    expect(violationCategory('05E').emoji).toBe('🌡️');
  });

  it('maps hand hygiene codes to soap emoji', () => {
    expect(violationCategory('04C').emoji).toBe('🧼');
    expect(violationCategory('04D').emoji).toBe('🧼');
    expect(violationCategory('06A').emoji).toBe('🧼');
  });

  it('maps sanitation codes to broom emoji', () => {
    expect(violationCategory('06D').emoji).toBe('🧹');
    expect(violationCategory('10F').emoji).toBe('🧹');
  });

  it('maps permit/posting codes to clipboard emoji', () => {
    expect(violationCategory('04A').emoji).toBe('📋');
    expect(violationCategory('07A').emoji).toBe('📋');
  });

  it('maps smoking prefix codes to cigarette emoji', () => {
    expect(violationCategory('15-100').emoji).toBe('🚬');
    expect(violationCategory('15A1').emoji).toBe('🚬');
    expect(violationCategory('15S2').emoji).toBe('🚬');
  });

  it('maps nutrition labeling prefix codes to clipboard emoji', () => {
    expect(violationCategory('16A').emoji).toBe('📋');
    expect(violationCategory('16-01').emoji).toBe('📋');
  });

  it('returns fallback for unknown codes', () => {
    const cat = violationCategory('ZZ9');
    expect(cat.emoji).toBe('📌');
    expect(cat.label).toBe('Other violation');
  });

  it('ignores the optional description parameter (code takes precedence)', () => {
    // Even if description says "rodent", 08A maps to harborage/warning
    const cat = violationCategory('08A', 'Evidence of rodents');
    expect(cat.emoji).toBe('⚠️');
  });
});
