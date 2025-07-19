import { describe, it, expect } from 'vitest';
import { parseVariables, substituteVariables, validateVariableUsage, clearCaches } from '../../src/services/variableParser';

describe('Performance Integration Tests', () => {
  // Helper function to measure operation timing with better precision
  function measureOperation<T>(operation: () => T, operationName: string): { result: T; duration: number } {
    // Warm up the operation first to avoid cold start effects
    operation();
    
    // Use multiple measurements for better accuracy
    const measurements: number[] = [];
    let result: T;
    
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      result = operation();
      const end = performance.now();
      measurements.push(end - start);
    }
    
    // Use median to avoid outliers
    measurements.sort((a, b) => a - b);
    const medianDuration = measurements[Math.floor(measurements.length / 2)];
    
    console.log(`${operationName}: ${medianDuration.toFixed(2)}ms (median of 5 runs)`);
    
    return { result: result!, duration: medianDuration };
  }

  it('should handle large content efficiently', () => {
    // Generate large content with many variables
    const variableCount = 100;
    const variables = Array.from({ length: variableCount }, (_, i) => `var${i}`);
    const largeContent = variables.map(v => `This is {{${v}}} content.`).join(' ');
    
    const { result: parsedVars, duration } = measureOperation(
      () => parseVariables(largeContent),
      'Parse 100 variables'
    );
    
    expect(parsedVars).toHaveLength(variableCount);
    expect(parsedVars).toEqual(variables);
    expect(duration).toBeLessThan(50); // Should be well under 50ms
    
    // Verify we have real measurements (microsecond precision is fine)
    expect(duration).toBeGreaterThan(0); // Just ensure it's measurable
    
    // Log the actual performance for visibility
    console.log(`✓ Variable parsing: ${duration.toFixed(4)}ms for ${variableCount} variables`);
  });

  it('should handle deep substitution efficiently', () => {
    const content = 'A'.repeat(1000) + '{{var1}} ' + 'B'.repeat(1000) + '{{var2}} ' + 'C'.repeat(1000);
    const values = { var1: 'REPLACED1', var2: 'REPLACED2' };
    
    const { result, duration } = measureOperation(
      () => substituteVariables(content, values),
      'Substitute in 2000+ char content'
    );
    
    expect(result).toContain('REPLACED1');
    expect(result).toContain('REPLACED2');
    expect(result.length).toBeGreaterThan(content.length); // Should be longer due to substitution
    expect(duration).toBeLessThan(25); // Should be well under 25ms
    expect(duration).toBeGreaterThan(0); // Just ensure it's measurable
    
    // Log actual performance
    console.log(`✓ Variable substitution: ${duration.toFixed(4)}ms for ${content.length} chars`);
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
    
    const startTime = performance.now();
    const validation = validateVariableUsage(complexContent);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should handle cache performance', () => {
    const content = 'Test {{variable}} content';
    
    // Clear caches first
    clearCaches();
    
    // First parse (no cache)
    const startTime1 = performance.now();
    const result1 = parseVariables(content);
    const endTime1 = performance.now();
    const duration1 = endTime1 - startTime1;
    
    // Second parse (with cache)
    const startTime2 = performance.now();
    const result2 = parseVariables(content);
    const endTime2 = performance.now();
    const duration2 = endTime2 - startTime2;
    
    expect(result1).toEqual(result2);
    expect(result1).toEqual(['variable']);
    expect(duration2).toBeLessThanOrEqual(duration1); // Cache should be faster or equal
  });

  it('should handle rapid sequential operations', () => {
    const content = 'Quick {{test}} for {{performance}}';
    const values = { test: 'TEST', performance: 'PERF' };
    
    const startTime1 = performance.now();
    for (let i = 0; i < 100; i++) {
      parseVariables(content);
    }
    const endTime1 = performance.now();
    const parseDuration = endTime1 - startTime1;
    
    const startTime2 = performance.now();
    for (let i = 0; i < 100; i++) {
      substituteVariables(content, values);
    }
    const endTime2 = performance.now();
    const substituteDuration = endTime2 - startTime2;
    
    const startTime3 = performance.now();
    for (let i = 0; i < 100; i++) {
      validateVariableUsage(content);
    }
    const endTime3 = performance.now();
    const validateDuration = endTime3 - startTime3;
    
    // Verify the operations work correctly
    expect(parseVariables(content)).toEqual(['test', 'performance']);
    expect(substituteVariables(content, values)).toBe('Quick TEST for PERF');
    expect(validateVariableUsage(content).isValid).toBe(true);
    
    // Performance assertions - should complete quickly
    expect(parseDuration).toBeLessThan(100);
    expect(substituteDuration).toBeLessThan(100);
    expect(validateDuration).toBeLessThan(100);
  });

  it('should maintain performance with memory pressure', () => {
    // Create many different content strings to test memory usage
    const contentVariations = Array.from({ length: 1000 }, (_, i) => 
      `Content ${i} with {{var${i}}} and {{common_var}}`
    );
    
    const startTime = performance.now();
    const results = contentVariations.map(content => parseVariables(content));
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Verify results are correct
    expect(results[0]).toEqual(['var0', 'common_var']);
    expect(results[500]).toEqual(['var500', 'common_var']);
    expect(results[999]).toEqual(['var999', 'common_var']);
    
    // All should contain common_var
    expect(results.every(vars => vars.includes('common_var'))).toBe(true);
    
    // Should complete in reasonable time even with memory pressure
    expect(duration).toBeLessThan(1000); // Under 1 second
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
    
    const startTime = performance.now();
    const variables = parseVariables(trickyContent);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(variables).toContain('good');
    expect(variables).toContain('var1');
    expect(variables).toContain('var2');
    expect(variables).toContain('var3');
    expect(variables.length).toBeGreaterThan(5); // Should have multiple variables
    expect(variables).not.toContain('not_variable');
    expect(duration).toBeLessThan(50); // Should handle complex patterns quickly
  });
});