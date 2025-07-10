/**
 * Metadata Schema System for PromptMaster Lite
 * Enables plugins to register custom metadata fields with validation and form generation
 */

import { hooks } from './hooks';

export interface MetadataFieldSchema {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'select' | 'multiselect' | 'textarea' | 'markdown';
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customValidator?: (value: any) => string | null;
  };
  options?: Array<{ value: any; label: string }>;
  placeholder?: string;
  icon?: string;
  group?: string;
  order?: number;
  dependencies?: {
    field: string;
    value: any;
    condition?: 'equals' | 'not_equals' | 'contains' | 'not_contains';
  }[];
}

export interface MetadataSchemaGroup {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  order?: number;
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface MetadataSchema {
  name: string;
  version: string;
  description?: string;
  groups: MetadataSchemaGroup[];
  fields: MetadataFieldSchema[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export class MetadataSchemaRegistry {
  private schemas: Map<string, MetadataSchema> = new Map();
  private compiledSchema: MetadataSchema | null = null;
  private cacheVersion = 0;

  /**
   * Register a new metadata schema
   */
  register(schema: MetadataSchema): void {
    this.schemas.set(schema.name, schema);
    this.invalidateCache();
    
    // Execute registration hooks
    hooks.executeMetadataSchemaRegister(schema);
  }

  /**
   * Unregister a metadata schema
   */
  unregister(name: string): void {
    this.schemas.delete(name);
    this.invalidateCache();
    
    // Execute unregistration hooks
    hooks.executeMetadataSchemaUnregister(name);
  }

  /**
   * Get all registered schemas
   */
  getSchemas(): MetadataSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get compiled schema with all fields from all registered schemas
   */
  getCompiledSchema(): MetadataSchema {
    if (!this.compiledSchema) {
      this.compileSchema();
    }
    return this.compiledSchema!;
  }

  /**
   * Validate metadata against all registered schemas
   */
  validate(metadata: Record<string, any>): ValidationResult {
    const schema = this.getCompiledSchema();
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Schema-based validation
    for (const field of schema.fields) {
      const value = metadata[field.key];
      const error = this.validateField(field, value);
      if (error) {
        errors[field.key] = error;
      }
    }

    // Hook-based validation
    const hookErrors = hooks.executeMetadataValidate(metadata);
    Object.assign(errors, hookErrors);

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get form field components for a specific group
   */
  getFieldsByGroup(groupKey: string): MetadataFieldSchema[] {
    const schema = this.getCompiledSchema();
    return schema.fields
      .filter(field => field.group === groupKey)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get all groups sorted by order
   */
  getGroups(): MetadataSchemaGroup[] {
    const schema = this.getCompiledSchema();
    return schema.groups.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get field schema by key
   */
  getField(key: string): MetadataFieldSchema | null {
    const schema = this.getCompiledSchema();
    return schema.fields.find(field => field.key === key) || null;
  }

  /**
   * Check if field dependencies are satisfied
   */
  isDependencySatisfied(field: MetadataFieldSchema, metadata: Record<string, any>): boolean {
    if (!field.dependencies) return true;

    return field.dependencies.every(dep => {
      const depValue = metadata[dep.field];
      const condition = dep.condition || 'equals';

      switch (condition) {
        case 'equals':
          return depValue === dep.value;
        case 'not_equals':
          return depValue !== dep.value;
        case 'contains':
          return Array.isArray(depValue) && depValue.includes(dep.value);
        case 'not_contains':
          return !Array.isArray(depValue) || !depValue.includes(dep.value);
        default:
          return true;
      }
    });
  }

  /**
   * Get default metadata based on schema defaults
   */
  getDefaultMetadata(): Record<string, any> {
    const schema = this.getCompiledSchema();
    const defaults: Record<string, any> = {};

    for (const field of schema.fields) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    }

    return defaults;
  }

  private validateField(field: MetadataFieldSchema, value: any): string | null {
    // Required field validation
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    // Skip validation for empty optional fields
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Type validation
    const typeError = this.validateType(field, value);
    if (typeError) return typeError;

    // Custom validation
    if (field.validation) {
      const validationError = this.validateConstraints(field, value);
      if (validationError) return validationError;
    }

    return null;
  }

  private validateType(field: MetadataFieldSchema, value: any): string | null {
    switch (field.type) {
      case 'string':
      case 'textarea':
      case 'markdown':
        if (typeof value !== 'string') {
          return `${field.label} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${field.label} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field.label} must be a boolean`;
        }
        break;
      case 'array':
      case 'multiselect':
        if (!Array.isArray(value)) {
          return `${field.label} must be an array`;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `${field.label} must be an object`;
        }
        break;
      case 'select':
        if (field.options && !field.options.some(opt => opt.value === value)) {
          return `${field.label} must be one of: ${field.options.map(opt => opt.label).join(', ')}`;
        }
        break;
    }

    return null;
  }

  private validateConstraints(field: MetadataFieldSchema, value: any): string | null {
    const validation = field.validation!;

    // Min/Max validation
    if (validation.min !== undefined) {
      if (typeof value === 'number' && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (typeof value === 'string' && value.length < validation.min) {
        return `${field.label} must be at least ${validation.min} characters`;
      }
      if (Array.isArray(value) && value.length < validation.min) {
        return `${field.label} must have at least ${validation.min} items`;
      }
    }

    if (validation.max !== undefined) {
      if (typeof value === 'number' && value > validation.max) {
        return `${field.label} must be at most ${validation.max}`;
      }
      if (typeof value === 'string' && value.length > validation.max) {
        return `${field.label} must be at most ${validation.max} characters`;
      }
      if (Array.isArray(value) && value.length > validation.max) {
        return `${field.label} must have at most ${validation.max} items`;
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    // Custom validation
    if (validation.customValidator) {
      const error = validation.customValidator(value);
      if (error) return error;
    }

    return null;
  }

  private compileSchema(): void {
    const allGroups = new Map<string, MetadataSchemaGroup>();
    const allFields: MetadataFieldSchema[] = [];

    // Merge all schemas
    for (const schema of this.schemas.values()) {
      // Merge groups
      for (const group of schema.groups) {
        if (!allGroups.has(group.key)) {
          allGroups.set(group.key, group);
        }
      }

      // Merge fields
      for (const field of schema.fields) {
        // Check for conflicts
        const existingField = allFields.find(f => f.key === field.key);
        if (existingField) {
          console.warn(`Field key conflict: ${field.key} is defined in multiple schemas`);
        }
        allFields.push(field);
      }
    }

    this.compiledSchema = {
      name: 'compiled',
      version: this.cacheVersion.toString(),
      description: 'Compiled schema from all registered schemas',
      groups: Array.from(allGroups.values()),
      fields: allFields
    };
  }

  private invalidateCache(): void {
    this.compiledSchema = null;
    this.cacheVersion++;
  }
}

// Core metadata schema for built-in fields
export const coreMetadataSchema: MetadataSchema = {
  name: 'core',
  version: '1.0.0',
  description: 'Core metadata fields for PromptMaster Lite',
  groups: [
    {
      key: 'basic',
      label: 'Basic Information',
      description: 'Essential prompt metadata',
      icon: 'FileText',
      order: 0
    },
    {
      key: 'organization',
      label: 'Organization',
      description: 'Categorization and tagging',
      icon: 'Folder',
      order: 1
    },
    {
      key: 'technical',
      label: 'Technical Details',
      description: 'Model compatibility and settings',
      icon: 'Settings',
      order: 2
    },
    {
      key: 'documentation',
      label: 'Documentation',
      description: 'Notes and additional information',
      icon: 'Book',
      order: 3
    }
  ],
  fields: [
    {
      key: 'title',
      type: 'string',
      label: 'Title',
      description: 'Prompt title',
      required: true,
      group: 'basic',
      order: 0,
      validation: {
        max: 100
      },
      placeholder: 'Enter prompt title...'
    },
    {
      key: 'tags',
      type: 'multiselect',
      label: 'Tags',
      description: 'Categorization tags',
      group: 'organization',
      order: 0,
      default: [],
      validation: {
        max: 10
      },
      placeholder: 'Add tags...'
    },
    {
      key: 'categoryPath',
      type: 'string',
      label: 'Category',
      description: 'Hierarchical category path',
      group: 'organization',
      order: 1,
      default: 'Uncategorized',
      placeholder: 'Select category...'
    },
    {
      key: 'models',
      type: 'multiselect',
      label: 'Compatible Models',
      description: 'AI models this prompt works well with',
      group: 'technical',
      order: 0,
      default: [],
      placeholder: 'Select compatible models...'
    },
    {
      key: 'notes',
      type: 'markdown',
      label: 'Notes',
      description: 'Additional notes and documentation',
      group: 'documentation',
      order: 0,
      default: '',
      placeholder: 'Add notes about this prompt...'
    }
  ]
};

// Global registry instance
export const metadataSchemaRegistry = new MetadataSchemaRegistry();

// Register core schema
metadataSchemaRegistry.register(coreMetadataSchema);