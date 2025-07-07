// Variable substitution engine for prompt templates

export interface Variable {
  name: string;
  value: string;
  source: 'manual' | 'frontmatter' | 'fallback';
}

export interface ParsedVariables {
  variables: Variable[];
  content: string;
}

export interface VariableSubstitution {
  [key: string]: string;
}

/**
 * Parse variables from prompt content
 */
export function parseVariables(content: string): string[] {
  const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}

/**
 * Extract variables from YAML frontmatter
 */
export function extractFrontmatterVariables(content: string): Record<string, string> {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return {};

  const yamlContent = match[1];
  const variables: Record<string, string> = {};

  // Simple YAML parsing for variables section
  const variablesMatch = yamlContent.match(/variables:\s*\n((?:\s+.+\n?)*)/);
  if (variablesMatch) {
    const variablesSection = variablesMatch[1];
    const variableLines = variablesSection.split('\n').filter(line => line.trim());
    
    for (const line of variableLines) {
      const keyValueMatch = line.match(/\s*([a-zA-Z0-9_]+):\s*["']?([^"'\n]+)["']?/);
      if (keyValueMatch) {
        variables[keyValueMatch[1]] = keyValueMatch[2];
      }
    }
  }

  return variables;
}

/**
 * Substitute variables in content with values
 */
export function substituteVariables(
  content: string,
  manualOverrides: VariableSubstitution = {},
  frontmatterVars: VariableSubstitution = {}
): string {
  const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  
  return content.replace(variableRegex, (_match, varName) => {
    // Priority order: manual overrides > frontmatter > fallback
    if (manualOverrides[varName] !== undefined) {
      return manualOverrides[varName];
    }
    if (frontmatterVars[varName] !== undefined) {
      return frontmatterVars[varName];
    }
    
    // Fallback token for undefined variables
    return `«${varName}»`;
  });
}

/**
 * Validate variable syntax and find issues
 */
export function validateVariables(content: string): Array<{
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}> {
  const issues: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }> = [];

  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for unclosed braces
    const openBraces = (line.match(/\{\{/g) || []).length;
    const closeBraces = (line.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push({
        line: i + 1,
        column: line.indexOf('{{') + 1,
        message: 'Unclosed variable braces',
        severity: 'error'
      });
    }
    
    // Check for nested braces (unsupported)
    const nestedBraces = line.match(/\{\{[^}]*\{\{/);
    if (nestedBraces) {
      issues.push({
        line: i + 1,
        column: line.indexOf(nestedBraces[0]) + 1,
        message: 'Nested braces are not supported',
        severity: 'warning'
      });
    }
    
    // Check for invalid variable names
    const invalidVars = line.match(/\{\{\s*([^a-zA-Z0-9_\s}]+)\s*\}\}/g);
    if (invalidVars) {
      invalidVars.forEach(match => {
        issues.push({
          line: i + 1,
          column: line.indexOf(match) + 1,
          message: 'Variable names must contain only letters, numbers, and underscores',
          severity: 'error'
        });
      });
    }
  }
  
  return issues;
}

/**
 * Get variables with their sources and values
 */
export function getVariablesWithSources(
  content: string,
  manualOverrides: VariableSubstitution = {}
): Variable[] {
  const detectedVars = parseVariables(content);
  const frontmatterVars = extractFrontmatterVariables(content);
  
  return detectedVars.map(name => {
    if (manualOverrides[name] !== undefined) {
      return {
        name,
        value: manualOverrides[name],
        source: 'manual' as const
      };
    }
    
    if (frontmatterVars[name] !== undefined) {
      return {
        name,
        value: frontmatterVars[name],
        source: 'frontmatter' as const
      };
    }
    
    return {
      name,
      value: `«${name}»`,
      source: 'fallback' as const
    };
  });
}