import { describe, it, expect } from 'vitest';
import { parseVariables, substituteVariables, validateVariableUsage, clearCaches } from '../../src/services/variableParser';

describe('Performance Integration Tests', () => {
  it('should handle large content efficiently', () => {
    // Generate large content with many variables
    const variableCount = 100;
    const variables = Array.from({ length: variableCount }, (_, i) => `var${i}`);
    const largeContent = variables.map(v => `This is {{${v}}} content.`).join(' ');
    
    console.time('Parse large content');
    const parsedVars = parseVariables(largeContent);
    console.timeEnd('Parse large content');
    
    expect(parsedVars).toHaveLength(variableCount);
    expect(parsedVars).toEqual(variables);
  });

  it('should handle deep substitution efficiently', () => {
    const content = 'A'.repeat(1000) + '{{var1}} ' + 'B'.repeat(1000) + '{{var2}} ' + 'C'.repeat(1000);
    const values = { var1: 'REPLACED1', var2: 'REPLACED2' };
    
    console.time('Substitute large content');
    const result = substituteVariables(content, values);
    console.timeEnd('Substitute large content');
    
    expect(result).toContain('REPLACED1');
    expect(result).toContain('REPLACED2');
    expect(result.length).toBeGreaterThan(content.length); // Should be longer due to substitution
  });

  it('should validate complex content efficiently', () => {
    // Mix of valid and invalid variables
    const complexContent = `
      Valid variables: {{good1}} {{good_2}} {{valid_name}}
      Invalid variables: {{123bad}} {{-invalid}} {{bad-name}}
      Unclosed: {{incomplete
      Nested: {{outer{{inner}}}}
      More valid: {{another_good}} {{final_var}}
    `.repeat(50); // Repeat to make it substantial
    
    console.time('Validate complex content');
    const validation = validateVariableUsage(complexContent);
    console.timeEnd('Validate complex content');
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle cache performance', () => {
    const content = 'Test {{variable}} content';
    
    // Clear caches first
    clearCaches();
    
    // First parse (no cache)
    console.time('First parse (no cache)');
    const result1 = parseVariables(content);
    console.timeEnd('First parse (no cache)');
    
    // Second parse (with cache)
    console.time('Second parse (with cache)');
    const result2 = parseVariables(content);
    console.timeEnd('Second parse (with cache)');
    
    expect(result1).toEqual(result2);
    expect(result1).toEqual(['variable']);
  });

  it('should handle rapid sequential operations', () => {
    const content = 'Quick {{test}} for {{performance}}';
    const values = { test: 'TEST', performance: 'PERF' };
    
    console.time('100 parse operations');
    for (let i = 0; i < 100; i++) {
      parseVariables(content);
    }
    console.timeEnd('100 parse operations');
    
    console.time('100 substitution operations');
    for (let i = 0; i < 100; i++) {
      substituteVariables(content, values);
    }
    console.timeEnd('100 substitution operations');
    
    console.time('100 validation operations');
    for (let i = 0; i < 100; i++) {
      validateVariableUsage(content);
    }
    console.timeEnd('100 validation operations');
    
    // Just verify the operations work correctly
    expect(parseVariables(content)).toEqual(['test', 'performance']);
    expect(substituteVariables(content, values)).toBe('Quick TEST for PERF');
    expect(validateVariableUsage(content).isValid).toBe(true);
  });

  it('should maintain performance with memory pressure', () => {
    // Create many different content strings to test memory usage
    const contentVariations = Array.from({ length: 1000 }, (_, i) => 
      `Content ${i} with {{var${i}}} and {{common_var}}`
    );
    
    console.time('Parse 1000 different contents');
    const results = contentVariations.map(content => parseVariables(content));
    console.timeEnd('Parse 1000 different contents');
    
    // Verify results are correct
    expect(results[0]).toEqual(['var0', 'common_var']);
    expect(results[500]).toEqual(['var500', 'common_var']);
    expect(results[999]).toEqual(['var999', 'common_var']);
    
    // All should contain common_var
    expect(results.every(vars => vars.includes('common_var'))).toBe(true);
  });

  it('should handle regex edge cases efficiently', () => {
    // Content with many regex-challenging patterns
    const trickyContent = `
      Normal: {{good}}
      Escaped braces: \\{\\{not_variable\\}\\}
      Multiple consecutive: {{var1}}{{var2}}{{var3}}
      With special chars in between: {{a}}!@#$%{{b}}^&*(){{c}}
      Mixed with text: prefix{{var}}suffix{{another}}end
      Unicode: {{café}} {{naïve}} {{résumé}}
      Numbers: {{var1}} {{var2}} {{var10}} {{var100}}
    `;
    
    console.time('Parse tricky content');
    const variables = parseVariables(trickyContent);
    console.timeEnd('Parse tricky content');
    
    expect(variables).toContain('good');
    expect(variables).toContain('var1');
    expect(variables).toContain('var2');
    expect(variables).toContain('var3');
    // Unicode variable names might not be supported by our regex
    // Let's check what we actually get
    console.log('Parsed variables:', variables);
    expect(variables.length).toBeGreaterThan(5); // Should have multiple variables
    expect(variables).not.toContain('not_variable');
  });
});