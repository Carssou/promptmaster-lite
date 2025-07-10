import { 
  parseVariables, 
  substituteVariables, 
  getVariablesWithSources, 
  validateVariableUsage
} from '../variableParser';

describe('variableParser', () => {
  describe('parseVariables', () => {
    it('should extract variables from text', () => {
      const text = 'Hello {{name}}, your task is {{task}} and deadline is {{deadline}}.';
      const variables = parseVariables(text);
      
      expect(variables).toEqual(['name', 'task', 'deadline']);
    });

    it('should handle duplicate variables', () => {
      const text = 'Hello {{name}}, {{name}} is your name.';
      const variables = parseVariables(text);
      
      expect(variables).toEqual(['name']);
    });

    it('should handle text without variables', () => {
      const text = 'This is just plain text.';
      const variables = parseVariables(text);
      
      expect(variables).toEqual([]);
    });

    it('should handle variables with spaces', () => {
      const text = 'Value: {{ variable_name }} and {{ another_var }}.';
      const variables = parseVariables(text);
      
      expect(variables).toEqual(['variable_name', 'another_var']);
    });

    it('should ignore invalid variable names', () => {
      const text = 'Valid: {{valid_name}} Invalid: {{123invalid}} {{-invalid}} {{invalid-}}.';
      const variables = parseVariables(text);
      
      expect(variables).toEqual(['valid_name']);
    });

    it('should handle nested braces gracefully', () => {
      const text = 'Normal: {{name}} Nested: {{outer{{inner}}}} Incomplete: {{incomplete';
      const variables = parseVariables(text);
      
      expect(variables).toEqual(['name']);
    });
  });

  describe('substituteVariables', () => {
    it('should substitute variables with provided values', () => {
      const text = 'Hello {{name}}, your age is {{age}}.';
      const variables = { name: 'John', age: '30' };
      const result = substituteVariables(text, variables);
      
      expect(result).toBe('Hello John, your age is 30.');
    });

    it('should use fallback for undefined variables', () => {
      const text = 'Hello {{name}}, your task is {{task}}.';
      const variables = { name: 'John' };
      const result = substituteVariables(text, variables);
      
      expect(result).toBe('Hello John, your task is «task».');
    });

    it('should handle empty variables object', () => {
      const text = 'Hello {{name}}.';
      const variables = {};
      const result = substituteVariables(text, variables);
      
      expect(result).toBe('Hello «name».');
    });

    it('should preserve text without variables', () => {
      const text = 'This is just plain text.';
      const variables = { name: 'John' };
      const result = substituteVariables(text, variables);
      
      expect(result).toBe('This is just plain text.');
    });

    it('should handle variables with special characters in values', () => {
      const text = 'Message: {{msg}}';
      const variables = { msg: 'Hello & welcome! "Nice" to meet you.' };
      const result = substituteVariables(text, variables);
      
      expect(result).toBe('Message: Hello & welcome! "Nice" to meet you.');
    });
  });

  describe('getVariablesWithSources', () => {
    it('should identify manual vs auto-detected variables', () => {
      const content = 'Hello {{name}}, your task is {{task}}.';
      const userVariables = { name: 'John', extra: 'value' };
      const result = getVariablesWithSources(content, userVariables);
      
      expect(result).toHaveLength(3);
      
      const nameVar = result.find(v => v.name === 'name');
      expect(nameVar).toEqual({
        name: 'name',
        value: 'John',
        source: 'manual'
      });

      const taskVar = result.find(v => v.name === 'task');
      expect(taskVar).toEqual({
        name: 'task',
        value: '«task»',
        source: 'fallback'
      });

      const extraVar = result.find(v => v.name === 'extra');
      expect(extraVar).toEqual({
        name: 'extra',
        value: 'value',
        source: 'manual'
      });
    });

    it('should handle empty content and variables', () => {
      const result = getVariablesWithSources('', {});
      expect(result).toEqual([]);
    });
  });

  describe('validateVariableUsage', () => {
    it('should detect unclosed braces', () => {
      const validation = validateVariableUsage('Hello {{name');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unclosed variable brace detected');
    });

    it('should detect nested braces', () => {
      const validation = validateVariableUsage('Hello {{outer{{inner}}}}');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Nested braces detected - variables cannot be nested');
    });

    it('should detect invalid variable names', () => {
      const validation = validateVariableUsage('Hello {{123invalid}} and {{-invalid}}');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors[0]).toContain('Invalid variable name: 123invalid');
      expect(validation.errors[1]).toContain('Invalid variable name: -invalid');
    });

    it('should pass validation for valid content', () => {
      const validation = validateVariableUsage('Hello {{name}}, your task is {{task_name}}.');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should handle empty content', () => {
      const validation = validateVariableUsage('');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });
});