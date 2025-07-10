/**
 * Example Plugin for PromptMaster Lite
 * Demonstrates how to create and register a plugin with custom metadata fields
 */

import { pluginRegistry, PluginManifest } from '../services/pluginRegistry';

// Example: Technical Documentation Plugin
const technicalDocsPlugin: PluginManifest = {
  name: 'technical-docs',
  version: '1.0.0',
  description: 'Metadata fields for technical documentation prompts',
  author: 'Example Developer',
  metadataSchema: {
    name: 'technical-docs',
    version: '1.0.0',
    description: 'Technical documentation metadata',
    groups: [
      {
        key: 'technical',
        label: 'Technical Details',
        description: 'Technical documentation specific fields',
        icon: 'Code',
        order: 5
      }
    ],
    fields: [
      {
        key: 'apiVersion',
        type: 'string',
        label: 'API Version',
        description: 'Version of the API being documented',
        group: 'technical',
        order: 0,
        validation: {
          pattern: '^v?\\d+\\.\\d+\\.\\d+$'
        },
        placeholder: 'e.g., v1.2.3'
      },
      {
        key: 'programmingLanguage',
        type: 'select',
        label: 'Programming Language',
        description: 'Primary programming language',
        group: 'technical',
        order: 1,
        options: [
          { value: 'javascript', label: 'JavaScript' },
          { value: 'typescript', label: 'TypeScript' },
          { value: 'python', label: 'Python' },
          { value: 'rust', label: 'Rust' },
          { value: 'go', label: 'Go' },
          { value: 'java', label: 'Java' },
          { value: 'csharp', label: 'C#' },
          { value: 'cpp', label: 'C++' }
        ],
        placeholder: 'Select language...'
      },
      {
        key: 'complexity',
        type: 'select',
        label: 'Complexity Level',
        description: 'Technical complexity of the documentation',
        group: 'technical',
        order: 2,
        options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' },
          { value: 'expert', label: 'Expert' }
        ],
        default: 'intermediate'
      },
      {
        key: 'codeExamples',
        type: 'boolean',
        label: 'Include Code Examples',
        description: 'Whether to include code examples in documentation',
        group: 'technical',
        order: 3,
        default: true
      },
      {
        key: 'prerequisites',
        type: 'multiselect',
        label: 'Prerequisites',
        description: 'Required knowledge or setup',
        group: 'technical',
        order: 4,
        options: [
          { value: 'basic-programming', label: 'Basic Programming' },
          { value: 'web-development', label: 'Web Development' },
          { value: 'databases', label: 'Database Knowledge' },
          { value: 'apis', label: 'API Experience' },
          { value: 'cloud-platforms', label: 'Cloud Platforms' },
          { value: 'docker', label: 'Docker/Containers' },
          { value: 'version-control', label: 'Version Control (Git)' }
        ],
        placeholder: 'Select prerequisites...'
      }
    ]
  },
  hooks: {
    onMetadataValidate: (metadata: Record<string, any>) => {
      const errors: Record<string, string> = {};
      
      // Custom validation: API version format
      if (metadata.apiVersion && !/^v?\d+\.\d+\.\d+$/.test(metadata.apiVersion)) {
        errors.apiVersion = 'API version must follow semantic versioning (e.g., v1.2.3)';
      }

      // Custom validation: Code examples requirement for advanced content
      if (metadata.complexity === 'advanced' && !metadata.codeExamples) {
        errors.codeExamples = 'Advanced documentation should include code examples';
      }

      return errors;
    }
  }
};

// Example: Marketing Campaign Plugin
const marketingPlugin: PluginManifest = {
  name: 'marketing-campaign',
  version: '1.0.0',
  description: 'Metadata fields for marketing campaign prompts',
  author: 'Marketing Team',
  metadataSchema: {
    name: 'marketing-campaign',
    version: '1.0.0',
    description: 'Marketing campaign metadata',
    groups: [
      {
        key: 'campaign',
        label: 'Campaign Details',
        description: 'Marketing campaign specific information',
        icon: 'Target',
        order: 6
      }
    ],
    fields: [
      {
        key: 'campaignType',
        type: 'select',
        label: 'Campaign Type',
        description: 'Type of marketing campaign',
        group: 'campaign',
        order: 0,
        required: true,
        options: [
          { value: 'email', label: 'Email Marketing' },
          { value: 'social-media', label: 'Social Media' },
          { value: 'content-marketing', label: 'Content Marketing' },
          { value: 'ppc', label: 'Pay-Per-Click' },
          { value: 'influencer', label: 'Influencer Marketing' },
          { value: 'event', label: 'Event Marketing' }
        ]
      },
      {
        key: 'targetDemographics',
        type: 'multiselect',
        label: 'Target Demographics',
        description: 'Primary demographic targets',
        group: 'campaign',
        order: 1,
        options: [
          { value: 'gen-z', label: 'Gen Z (18-24)' },
          { value: 'millennials', label: 'Millennials (25-40)' },
          { value: 'gen-x', label: 'Gen X (41-56)' },
          { value: 'boomers', label: 'Baby Boomers (57+)' },
          { value: 'students', label: 'Students' },
          { value: 'professionals', label: 'Working Professionals' },
          { value: 'parents', label: 'Parents' },
          { value: 'seniors', label: 'Seniors' }
        ],
        validation: {
          min: 1,
          max: 3
        }
      },
      {
        key: 'campaignGoal',
        type: 'select',
        label: 'Campaign Goal',
        description: 'Primary objective of the campaign',
        group: 'campaign',
        order: 2,
        options: [
          { value: 'brand-awareness', label: 'Brand Awareness' },
          { value: 'lead-generation', label: 'Lead Generation' },
          { value: 'sales-conversion', label: 'Sales Conversion' },
          { value: 'customer-retention', label: 'Customer Retention' },
          { value: 'product-launch', label: 'Product Launch' },
          { value: 'event-promotion', label: 'Event Promotion' }
        ]
      },
      {
        key: 'budget',
        type: 'select',
        label: 'Budget Range',
        description: 'Campaign budget range',
        group: 'campaign',
        order: 3,
        options: [
          { value: 'low', label: 'Low ($0-$1K)' },
          { value: 'medium', label: 'Medium ($1K-$10K)' },
          { value: 'high', label: 'High ($10K-$100K)' },
          { value: 'enterprise', label: 'Enterprise ($100K+)' }
        ]
      },
      {
        key: 'duration',
        type: 'number',
        label: 'Campaign Duration (days)',
        description: 'Length of campaign in days',
        group: 'campaign',
        order: 4,
        validation: {
          min: 1,
          max: 365
        },
        default: 30
      }
    ]
  },
  hooks: {
    onMetadataValidate: (metadata: Record<string, any>) => {
      const errors: Record<string, string> = {};
      
      // Custom validation: Budget vs Duration
      if (metadata.budget === 'low' && metadata.duration > 90) {
        errors.duration = 'Low budget campaigns should typically be shorter than 90 days';
      }

      // Custom validation: Target demographics for certain campaign types
      if (metadata.campaignType === 'social-media' && !metadata.targetDemographics?.includes('gen-z') && !metadata.targetDemographics?.includes('millennials')) {
        errors.targetDemographics = 'Social media campaigns should target Gen Z or Millennials';
      }

      return errors;
    }
  }
};

// Function to demonstrate plugin registration
export function registerExamplePlugins() {
  console.log('Registering example plugins...');
  
  try {
    // Register technical documentation plugin
    const techPlugin = pluginRegistry.registerWithValidation(technicalDocsPlugin);
    console.log('Technical docs plugin registered:', techPlugin.manifest.name);
    
    // Register marketing campaign plugin
    const marketingPluginInstance = pluginRegistry.registerWithValidation(marketingPlugin);
    console.log('Marketing campaign plugin registered:', marketingPluginInstance.manifest.name);
    
    // Log registry stats
    const stats = pluginRegistry.getStats();
    console.log('Plugin registry stats:', stats);
    
    return {
      technicalDocs: techPlugin,
      marketing: marketingPluginInstance
    };
  } catch (error) {
    console.error('Failed to register example plugins:', error);
    throw error;
  }
}

// Function to demonstrate plugin unregistration
export function unregisterExamplePlugins() {
  console.log('Unregistering example plugins...');
  
  pluginRegistry.unregister('technical-docs');
  pluginRegistry.unregister('marketing-campaign');
  
  console.log('Example plugins unregistered');
}

// Export the plugin manifests for testing
export { technicalDocsPlugin, marketingPlugin };