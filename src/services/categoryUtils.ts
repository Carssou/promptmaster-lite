/**
 * Category utilities for path manipulation, validation, and tree navigation
 */

export interface CategoryNode {
  path: string;
  name: string;
  children: CategoryNode[];
  count: number;
}

/**
 * Parse category path into individual components
 * @param categoryPath - The full category path (e.g., "Marketing/Email/Newsletters")
 * @returns Array of path components
 */
export function parseCategoryPath(categoryPath: string): string[] {
  if (!categoryPath || categoryPath === "Uncategorized") {
    return [];
  }
  return categoryPath.split('/').filter(part => part.trim().length > 0);
}

/**
 * Build category path from components
 * @param components - Array of path components
 * @returns Full category path string
 */
export function buildCategoryPath(components: string[]): string {
  if (components.length === 0) {
    return "Uncategorized";
  }
  return components.join('/');
}

/**
 * Get parent category path
 * @param categoryPath - The current category path
 * @returns Parent category path or "Uncategorized" if at root
 */
export function getParentCategoryPath(categoryPath: string): string {
  const components = parseCategoryPath(categoryPath);
  if (components.length <= 1) {
    return "Uncategorized";
  }
  return buildCategoryPath(components.slice(0, -1));
}

/**
 * Get category name (last component of path)
 * @param categoryPath - The full category path
 * @returns The category name
 */
export function getCategoryName(categoryPath: string): string {
  const components = parseCategoryPath(categoryPath);
  return components.length > 0 ? components[components.length - 1] : "Uncategorized";
}

/**
 * Get category depth (number of levels deep)
 * @param categoryPath - The category path
 * @returns Depth level (0 for root categories)
 */
export function getCategoryDepth(categoryPath: string): number {
  return parseCategoryPath(categoryPath).length;
}

/**
 * Check if one category is a child of another
 * @param childPath - The potential child category path
 * @param parentPath - The potential parent category path
 * @returns True if childPath is a child of parentPath
 */
export function isCategoryChild(childPath: string, parentPath: string): boolean {
  if (parentPath === "Uncategorized") {
    return getCategoryDepth(childPath) === 1;
  }
  
  // Must start with parent path + '/' and be exactly one level deeper
  if (!childPath.startsWith(parentPath + '/')) {
    return false;
  }
  
  // Check if it's exactly one level deeper
  const remainingPath = childPath.substring(parentPath.length + 1);
  return !remainingPath.includes('/');
}

/**
 * Check if one category is a descendant of another (child, grandchild, etc.)
 * @param descendantPath - The potential descendant category path
 * @param ancestorPath - The potential ancestor category path
 * @returns True if descendantPath is a descendant of ancestorPath
 */
export function isCategoryDescendant(descendantPath: string, ancestorPath: string): boolean {
  if (ancestorPath === "Uncategorized") {
    return descendantPath !== "Uncategorized";
  }
  return descendantPath.startsWith(ancestorPath + '/');
}

/**
 * Validate category name for a single component
 * @param name - The category name to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCategoryName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Category name cannot be empty" };
  }

  const trimmedName = name.trim();

  // Check length
  if (trimmedName.length > 50) {
    return { isValid: false, error: "Category name cannot exceed 50 characters" };
  }

  // Check for invalid characters
  const invalidChars = /[\\<>:"|?*]/;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: "Category name contains invalid characters (\\<>:\"|?*)" };
  }

  // Check for path separators
  if (trimmedName.includes('/')) {
    return { isValid: false, error: "Category name cannot contain forward slashes" };
  }

  // Check for leading/trailing dots (Windows restriction)
  if (trimmedName.startsWith('.') || trimmedName.endsWith('.')) {
    return { isValid: false, error: "Category name cannot start or end with a dot" };
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(trimmedName.toUpperCase())) {
    return { isValid: false, error: "Category name is a reserved system name" };
  }

  return { isValid: true };
}

/**
 * Validate a full category path
 * @param categoryPath - The full category path to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateCategoryPath(categoryPath: string): { isValid: boolean; error?: string } {
  if (!categoryPath || categoryPath.trim().length === 0) {
    return { isValid: false, error: "Category path cannot be empty" };
  }

  const trimmedPath = categoryPath.trim();

  // Special case for "Uncategorized"
  if (trimmedPath === "Uncategorized") {
    return { isValid: true };
  }

  // Check total path length
  if (trimmedPath.length > 255) {
    return { isValid: false, error: "Category path cannot exceed 255 characters" };
  }

  // Validate each component
  const components = parseCategoryPath(trimmedPath);
  
  if (components.length === 0) {
    return { isValid: false, error: "Invalid category path format" };
  }

  if (components.length > 10) {
    return { isValid: false, error: "Category path cannot have more than 10 levels" };
  }

  for (const component of components) {
    const validation = validateCategoryName(component);
    if (!validation.isValid) {
      return { isValid: false, error: `Invalid component "${component}": ${validation.error}` };
    }
  }

  return { isValid: true };
}

/**
 * Sanitize category name by removing or replacing invalid characters
 * @param name - The category name to sanitize
 * @returns Sanitized category name
 */
export function sanitizeCategoryName(name: string): string {
  if (!name) return "";
  
  return name
    .trim()
    .replace(/[\\<>:"|?*\/]/g, '') // Remove invalid characters
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 50) // Limit length
    .trim();
}

/**
 * Find a category node by path in a tree
 * @param tree - The category tree to search
 * @param targetPath - The path to find
 * @returns The category node if found, null otherwise
 */
export function findCategoryInTree(tree: CategoryNode[], targetPath: string): CategoryNode | null {
  for (const node of tree) {
    if (node.path === targetPath) {
      return node;
    }
    
    if (node.children.length > 0) {
      const found = findCategoryInTree(node.children, targetPath);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

/**
 * Get all category paths from a tree (flattened)
 * @param tree - The category tree
 * @returns Array of all category paths
 */
export function getAllCategoryPaths(tree: CategoryNode[]): string[] {
  const paths: string[] = [];
  
  function traverse(nodes: CategoryNode[]) {
    for (const node of nodes) {
      paths.push(node.path);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  
  traverse(tree);
  return paths;
}

/**
 * Get all ancestor paths for a given category path
 * @param categoryPath - The category path
 * @returns Array of ancestor paths (from root to immediate parent)
 */
export function getAncestorPaths(categoryPath: string): string[] {
  const components = parseCategoryPath(categoryPath);
  const ancestors: string[] = [];
  
  for (let i = 1; i < components.length; i++) {
    ancestors.push(buildCategoryPath(components.slice(0, i)));
  }
  
  return ancestors;
}

/**
 * Get all descendant paths for a given category path from a tree
 * @param tree - The category tree
 * @param parentPath - The parent category path
 * @returns Array of descendant paths
 */
export function getDescendantPaths(tree: CategoryNode[], parentPath: string): string[] {
  const parentNode = findCategoryInTree(tree, parentPath);
  if (!parentNode) {
    return [];
  }
  
  return getAllCategoryPaths([parentNode]).filter(path => path !== parentPath);
}

/**
 * Sort category paths alphabetically with proper hierarchical ordering
 * @param paths - Array of category paths to sort
 * @returns Sorted array of category paths
 */
export function sortCategoryPaths(paths: string[]): string[] {
  return paths.sort((a, b) => {
    const aComponents = parseCategoryPath(a);
    const bComponents = parseCategoryPath(b);
    
    // Compare component by component
    const minLength = Math.min(aComponents.length, bComponents.length);
    for (let i = 0; i < minLength; i++) {
      const comparison = aComponents[i].localeCompare(bComponents[i], undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
      if (comparison !== 0) {
        return comparison;
      }
    }
    
    // If all compared components are equal, shorter path comes first
    return aComponents.length - bComponents.length;
  });
}

/**
 * Create a breadcrumb array from a category path
 * @param categoryPath - The category path
 * @returns Array of breadcrumb objects with name and path
 */
export function createCategoryBreadcrumbs(categoryPath: string): Array<{ name: string; path: string }> {
  if (!categoryPath || categoryPath === "Uncategorized") {
    return [{ name: "Uncategorized", path: "Uncategorized" }];
  }
  
  const components = parseCategoryPath(categoryPath);
  const breadcrumbs: Array<{ name: string; path: string }> = [
    { name: "Uncategorized", path: "Uncategorized" }
  ];
  
  for (let i = 0; i < components.length; i++) {
    const path = buildCategoryPath(components.slice(0, i + 1));
    breadcrumbs.push({ name: components[i], path });
  }
  
  return breadcrumbs;
}

/**
 * Check if a category path exists in a tree
 * @param tree - The category tree
 * @param categoryPath - The path to check
 * @returns True if the path exists in the tree
 */
export function categoryExistsInTree(tree: CategoryNode[], categoryPath: string): boolean {
  return findCategoryInTree(tree, categoryPath) !== null;
}

/**
 * Generate a unique category name by appending a number if needed
 * @param tree - The category tree
 * @param baseName - The base name to make unique
 * @param parentPath - The parent category path (optional)
 * @returns A unique category name
 */
export function generateUniqueCategoryName(
  tree: CategoryNode[], 
  baseName: string, 
  parentPath?: string
): string {
  const sanitizedBase = sanitizeCategoryName(baseName);
  if (!sanitizedBase) {
    return "New Category";
  }
  
  let counter = 1;
  let candidateName = sanitizedBase;
  
  while (true) {
    const candidatePath = parentPath 
      ? `${parentPath}/${candidateName}`
      : candidateName;
      
    if (!categoryExistsInTree(tree, candidatePath)) {
      return candidateName;
    }
    
    candidateName = `${sanitizedBase} ${counter}`;
    counter++;
    
    // Prevent infinite loop
    if (counter > 999) {
      return `${sanitizedBase} ${Date.now()}`;
    }
  }
}