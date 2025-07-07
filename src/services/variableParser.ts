// Variable substitution engine for prompt templates

export interface Variable {
  name: string;
  value: string;
  source: 'manual' | 'fallback';
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
 * Substitute variables in content with values
 */
export function substituteVariables(
  content: string,
  userDefinedValues: VariableSubstitution = {}
): string {
  const variableRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  
  return content.replace(variableRegex, (_match, varName) => {
    // Priority order: user defined values > fallback
    if (userDefinedValues[varName] !== undefined) {
      return userDefinedValues[varName];
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
  userDefinedValues: VariableSubstitution = {}
): Variable[] {
  const detectedVars = parseVariables(content);
  
  return detectedVars.map(name => {
    if (userDefinedValues[name] !== undefined) {
      return {
        name,
        value: userDefinedValues[name],
        source: 'manual' as const
      };
    }
    
    return {
      name,
      value: `«${name}»`,
      source: 'fallback' as const
    };
  });
}