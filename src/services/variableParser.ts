// Variable substitution engine for prompt templates
// Optimized with memoization for better performance

// Cache for parsed variables to avoid recomputation
const parseCache = new Map<string, string[]>();
const validateCache = new Map<string, Array<{
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}>>;

// Pre-compiled regex patterns for better performance
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const SUBSTITUTION_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const OPEN_BRACES_REGEX = /\{\{/g;
const CLOSE_BRACES_REGEX = /\}\}/g;
const NESTED_BRACES_REGEX = /\{\{[^}]*\{\{/;
const INVALID_VARS_REGEX = /\{\{\s*([^a-zA-Z0-9_\s}]+)\s*\}\}/g;

// Cache cleanup function to prevent memory leaks
function cleanupCache() {
  if (parseCache.size > 100) {
    parseCache.clear();
  }
  if (validateCache.size > 100) {
    validateCache.clear();
  }
}

// Debounced cache cleanup
let cleanupTimeout: NodeJS.Timeout | null = null;
function scheduleCleanup() {
  if (cleanupTimeout) clearTimeout(cleanupTimeout);
  cleanupTimeout = setTimeout(cleanupCache, 30000); // Clean every 30 seconds
}

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
 * Parse variables from prompt content with memoization
 */
export function parseVariables(content: string): string[] {
  // Check cache first
  const cached = parseCache.get(content);
  if (cached) {
    return cached;
  }

  const variables: string[] = [];
  const variableSet = new Set<string>(); // Use Set for O(1) duplicate checking
  let match;

  // Reset regex state
  VARIABLE_REGEX.lastIndex = 0;

  while ((match = VARIABLE_REGEX.exec(content)) !== null) {
    const varName = match[1];
    if (!variableSet.has(varName)) {
      variableSet.add(varName);
      variables.push(varName);
    }
  }

  // Cache result
  parseCache.set(content, variables);
  scheduleCleanup();

  return variables;
}


/**
 * Substitute variables in content with values (optimized)
 */
export function substituteVariables(
  content: string,
  userDefinedValues: VariableSubstitution = {}
): string {
  // Reset regex state
  SUBSTITUTION_REGEX.lastIndex = 0;
  
  return content.replace(SUBSTITUTION_REGEX, (_match, varName) => {
    // Priority order: user defined values > fallback
    if (userDefinedValues[varName] !== undefined) {
      return userDefinedValues[varName];
    }
    
    // Fallback token for undefined variables
    return `«${varName}»`;
  });
}

/**
 * Validate variable syntax and find issues (with memoization)
 */
export function validateVariables(content: string): Array<{
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}> {
  // Check cache first
  const cached = validateCache.get(content);
  if (cached) {
    return cached;
  }

  const issues: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }> = [];

  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for unclosed braces using pre-compiled regex
    const openBraces = (line.match(OPEN_BRACES_REGEX) || []).length;
    const closeBraces = (line.match(CLOSE_BRACES_REGEX) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push({
        line: i + 1,
        column: line.indexOf('{{') + 1,
        message: 'Unclosed variable braces',
        severity: 'error'
      });
    }
    
    // Check for nested braces (unsupported)
    const nestedBraces = line.match(NESTED_BRACES_REGEX);
    if (nestedBraces) {
      issues.push({
        line: i + 1,
        column: line.indexOf(nestedBraces[0]) + 1,
        message: 'Nested braces are not supported',
        severity: 'warning'
      });
    }
    
    // Check for invalid variable names
    INVALID_VARS_REGEX.lastIndex = 0;
    const invalidVars = line.match(INVALID_VARS_REGEX);
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
  
  // Cache result
  validateCache.set(content, issues);
  scheduleCleanup();
  
  return issues;
}

/**
 * Get variables with their sources and values (optimized)
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

/**
 * Clear all caches (for testing or memory management)
 */
export function clearCaches(): void {
  parseCache.clear();
  validateCache.clear();
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout);
    cleanupTimeout = null;
  }
}