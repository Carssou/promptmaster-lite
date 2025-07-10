/**
 * Plugin Registry for PromptMaster Lite
 * Simplified interface for registering plugins and their metadata schemas
 */

import { hooks, HookCallbacks } from './hooks';
import { metadataSchemaRegistry, MetadataSchema } from './metadataSchema';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  license?: string;
  dependencies?: Record<string, string>;
  metadataSchema?: MetadataSchema;
  hooks?: HookCallbacks;
}

export interface RegisteredPlugin {
  manifest: PluginManifest;
  active: boolean;
  registeredAt: Date;
  unregister: () => void;
}

class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();

  /**
   * Register a plugin with its metadata schema and hooks
   */
  register(manifest: PluginManifest): RegisteredPlugin {
    const existingPlugin = this.plugins.get(manifest.name);
    if (existingPlugin) {
      console.warn(`Plugin ${manifest.name} is already registered. Unregistering the old version.`);
      existingPlugin.unregister();
    }

    // Register metadata schema if provided
    if (manifest.metadataSchema) {
      metadataSchemaRegistry.register(manifest.metadataSchema);
    }

    // Register hooks if provided
    let unregisterHooks: (() => void) | undefined;
    if (manifest.hooks) {
      unregisterHooks = hooks.register(manifest.hooks);
    }

    // Create unregister function
    const unregister = () => {
      // Unregister metadata schema
      if (manifest.metadataSchema) {
        metadataSchemaRegistry.unregister(manifest.metadataSchema.name);
      }

      // Unregister hooks
      if (unregisterHooks) {
        unregisterHooks();
      }

      // Remove from registry
      this.plugins.delete(manifest.name);
    };

    const plugin: RegisteredPlugin = {
      manifest,
      active: true,
      registeredAt: new Date(),
      unregister
    };

    this.plugins.set(manifest.name, plugin);
    
    console.log(`Plugin ${manifest.name} v${manifest.version} registered successfully`);
    
    return plugin;
  }

  /**
   * Unregister a plugin by name
   */
  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Plugin ${name} is not registered`);
      return false;
    }

    plugin.unregister();
    console.log(`Plugin ${name} unregistered successfully`);
    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): RegisteredPlugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    const plugins = this.getPlugins();
    return {
      total: plugins.length,
      active: plugins.filter(p => p.active).length,
      withMetadataSchema: plugins.filter(p => p.manifest.metadataSchema).length,
      withHooks: plugins.filter(p => p.manifest.hooks).length
    };
  }

  /**
   * Validate plugin manifest
   */
  validateManifest(manifest: PluginManifest): string[] {
    const errors: string[] = [];

    if (!manifest.name) {
      errors.push('Plugin name is required');
    }

    if (!manifest.version) {
      errors.push('Plugin version is required');
    }

    if (manifest.name && !/^[a-zA-Z0-9-_]+$/.test(manifest.name)) {
      errors.push('Plugin name must contain only alphanumeric characters, hyphens, and underscores');
    }

    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    if (manifest.metadataSchema) {
      // Validate metadata schema
      if (!manifest.metadataSchema.name) {
        errors.push('Metadata schema name is required');
      }

      if (!manifest.metadataSchema.version) {
        errors.push('Metadata schema version is required');
      }

      if (!manifest.metadataSchema.fields || manifest.metadataSchema.fields.length === 0) {
        errors.push('Metadata schema must have at least one field');
      }

      // Validate fields
      manifest.metadataSchema.fields?.forEach((field, index) => {
        if (!field.key) {
          errors.push(`Field ${index} is missing a key`);
        }

        if (!field.type) {
          errors.push(`Field ${field.key || index} is missing a type`);
        }

        if (!field.label) {
          errors.push(`Field ${field.key || index} is missing a label`);
        }

        if (field.key && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key)) {
          errors.push(`Field key ${field.key} must start with a letter or underscore and contain only alphanumeric characters and underscores`);
        }
      });
    }

    return errors;
  }

  /**
   * Register a plugin with validation
   */
  registerWithValidation(manifest: PluginManifest): RegisteredPlugin {
    const errors = this.validateManifest(manifest);
    if (errors.length > 0) {
      throw new Error(`Plugin validation failed:\n${errors.join('\n')}`);
    }

    return this.register(manifest);
  }
}

// Example plugin manifests for testing
export const examplePlugins = {
  seoPlugin: {
    name: 'seo-metadata',
    version: '1.0.0',
    description: 'SEO-focused metadata fields for content prompts',
    author: 'PromptMaster Team',
    metadataSchema: {
      name: 'seo-metadata',
      version: '1.0.0',
      description: 'SEO metadata fields',
      groups: [
        {
          key: 'seo',
          label: 'SEO & Content',
          description: 'Search engine optimization and content metadata',
          icon: 'Search',
          order: 10
        }
      ],
      fields: [
        {
          key: 'targetKeywords',
          type: 'multiselect' as const,
          label: 'Target Keywords',
          description: 'Primary keywords for SEO optimization',
          group: 'seo',
          order: 0,
          validation: {
            max: 5
          },
          placeholder: 'Add target keywords...'
        },
        {
          key: 'contentType',
          type: 'select' as const,
          label: 'Content Type',
          description: 'Type of content this prompt generates',
          group: 'seo',
          order: 1,
          options: [
            { value: 'blog-post', label: 'Blog Post' },
            { value: 'social-media', label: 'Social Media' },
            { value: 'email', label: 'Email' },
            { value: 'ad-copy', label: 'Ad Copy' },
            { value: 'product-description', label: 'Product Description' }
          ],
          placeholder: 'Select content type...'
        },
        {
          key: 'targetAudience',
          type: 'string' as const,
          label: 'Target Audience',
          description: 'Primary audience for this content',
          group: 'seo',
          order: 2,
          validation: {
            max: 100
          },
          placeholder: 'e.g., Tech professionals, Small business owners...'
        },
        {
          key: 'brandGuidelines',
          type: 'textarea' as const,
          label: 'Brand Guidelines',
          description: 'Specific brand voice and style guidelines',
          group: 'seo',
          order: 3,
          placeholder: 'Enter brand voice, tone, and style requirements...'
        }
      ]
    },
    hooks: {
      onMetadataValidate: (metadata: Record<string, any>) => {
        const errors: Record<string, string> = {};
        
        // Custom validation for SEO fields
        if (metadata.targetKeywords && metadata.targetKeywords.length > 0) {
          const invalidKeywords = metadata.targetKeywords.filter((kw: string) => 
            kw.length < 2 || kw.length > 50
          );
          if (invalidKeywords.length > 0) {
            errors.targetKeywords = 'Keywords must be between 2 and 50 characters';
          }
        }

        if (metadata.contentType === 'social-media' && metadata.targetKeywords && metadata.targetKeywords.length > 3) {
          errors.targetKeywords = 'Social media content should have at most 3 target keywords';
        }

        return errors;
      }
    }
  } as PluginManifest
};

// Global plugin registry
export const pluginRegistry = new PluginRegistry();