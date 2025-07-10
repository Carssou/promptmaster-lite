import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VariablePanel } from '../../src/components/variables/VariablePanel';
import { parseVariables, substituteVariables, validateVariableUsage } from '../../src/services/variableParser';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Variable Parser Integration', () => {
    it('should parse and validate variables correctly', () => {
      const content = 'Hello {{name}}, your task is {{task}}.';
      
      // Test parsing
      const variables = parseVariables(content);
      expect(variables).toEqual(['name', 'task']);
      
      // Test substitution
      const substituted = substituteVariables(content, { name: 'John' });
      expect(substituted).toBe('Hello John, your task is «task».');
      
      // Test validation
      const validation = validateVariableUsage(content);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
    
    it('should handle invalid variables', () => {
      const content = 'Invalid: {{123invalid}} Unclosed: {{incomplete';
      
      const validation = validateVariableUsage(content);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('VariablePanel Integration', () => {
    it('should render variable panel without crashing', () => {
      const mockOnChange = vi.fn();
      
      render(
        <VariablePanel
          content="Hello {{name}}!"
          variables={{ name: 'John' }}
          onChange={mockOnChange}
        />
      );
      
      // Check that the panel renders
      expect(screen.getByText('Preview Variables')).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration', () => {
    it('should handle variable parser workflow', () => {
      // Test the complete variable processing workflow
      const content = 'Hello {{name}}, welcome to {{app_name}}!';
      const userVars = { name: 'Alice' };
      
      // 1. Parse variables from content
      const detectedVars = parseVariables(content);
      expect(detectedVars).toEqual(['name', 'app_name']);
      
      // 2. Substitute with user values
      const substituted = substituteVariables(content, userVars);
      expect(substituted).toBe('Hello Alice, welcome to «app_name»!');
      
      // 3. Validate the content
      const validation = validateVariableUsage(content);
      expect(validation.isValid).toBe(true);
    });
    
    it('should handle complex variable scenarios', () => {
      const content = `
        # Project: {{project_name}}
        
        Hello {{user_name}}, 
        
        Your task for {{project_name}} is:
        {{task_description}}
        
        Invalid variables: {{123invalid}} {{incomplete
      `;
      
      // Parse should only get valid variables
      const variables = parseVariables(content);
      expect(variables).toEqual(['project_name', 'user_name', 'task_description']);
      
      // Validation should fail due to invalid syntax
      const validation = validateVariableUsage(content);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // Substitution should work for valid variables only
      const userVars = { 
        project_name: 'PromptMaster',
        user_name: 'Bob'
      };
      
      const substituted = substituteVariables(content, userVars);
      expect(substituted).toContain('Hello Bob,');
      expect(substituted).toContain('Project: PromptMaster');
      expect(substituted).toContain('«task_description»');
    });
  });
});