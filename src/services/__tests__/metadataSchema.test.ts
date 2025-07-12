/**
 * Tests for the metadata schema system
 */

import { 
  MetadataSchemaRegistry, 
  metadataSchemaRegistry, 
  coreMetadataSchema,
  MetadataSchema
} from '../metadataSchema';

describe('MetadataSchemaRegistry', () => {
  let registry: MetadataSchemaRegistry;

  beforeEach(() => {
    registry = new MetadataSchemaRegistry();
  });

  describe('Schema Registration', () => {
    const testSchema: MetadataSchema = {
      name: 'test-schema',
      version: '1.0.0',
      description: 'Test schema',
      groups: [
        {
          key: 'test-group',
          label: 'Test Group',
          order: 0
        }
      ],
      fields: [
        {
          key: 'testField',
          type: 'string',
          label: 'Test Field',
          group: 'test-group',
          required: true,
          validation: {
            max: 50
          }
        }
      ]
    };

    it('should register a schema', () => {
      registry.register(testSchema);
      
      const schemas = registry.getSchemas();
      expect(schemas).toHaveLength(1);
      expect(schemas[0]).toEqual(testSchema);
    });

    it('should unregister a schema', () => {
      registry.register(testSchema);
      registry.unregister('test-schema');
      
      const schemas = registry.getSchemas();
      expect(schemas).toHaveLength(0);
    });

    it('should compile schemas with all fields', () => {
      registry.register(testSchema);
      
      const compiled = registry.getCompiledSchema();
      expect(compiled.fields).toHaveLength(1);
      expect(compiled.fields[0].key).toBe('testField');
      expect(compiled.groups).toHaveLength(1);
      expect(compiled.groups[0].key).toBe('test-group');
    });

    it('should merge multiple schemas', () => {
      const schema2: MetadataSchema = {
        name: 'test-schema-2',
        version: '1.0.0',
        description: 'Second test schema',
        groups: [
          {
            key: 'test-group-2',
            label: 'Test Group 2',
            order: 1
          }
        ],
        fields: [
          {
            key: 'testField2',
            type: 'number',
            label: 'Test Field 2',
            group: 'test-group-2'
          }
        ]
      };

      registry.register(testSchema);
      registry.register(schema2);
      
      const compiled = registry.getCompiledSchema();
      expect(compiled.fields).toHaveLength(2);
      expect(compiled.groups).toHaveLength(2);
    });
  });

  describe('Field Validation', () => {
    const validationSchema: MetadataSchema = {
      name: 'validation-schema',
      version: '1.0.0',
      description: 'Validation test schema',
      groups: [
        {
          key: 'validation',
          label: 'Validation',
          order: 0
        }
      ],
      fields: [
        {
          key: 'requiredString',
          type: 'string',
          label: 'Required String',
          group: 'validation',
          required: true,
          validation: {
            min: 5,
            max: 20
          }
        },
        {
          key: 'optionalNumber',
          type: 'number',
          label: 'Optional Number',
          group: 'validation',
          validation: {
            min: 0,
            max: 100
          }
        },
        {
          key: 'selectField',
          type: 'select',
          label: 'Select Field',
          group: 'validation',
          options: [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' }
          ]
        },
        {
          key: 'arrayField',
          type: 'array',
          label: 'Array Field',
          group: 'validation',
          validation: {
            min: 1,
            max: 3
          }
        }
      ]
    };

    beforeEach(() => {
      registry.register(validationSchema);
    });

    it('should validate required fields', () => {
      const result = registry.validate({});
      
      expect(result.valid).toBe(false);
      expect(result.errors.requiredString).toBeDefined();
    });

    it('should validate string length constraints', () => {
      const result = registry.validate({
        requiredString: 'abc' // Too short
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.requiredString).toContain('at least 5');
    });

    it('should validate number constraints', () => {
      const result = registry.validate({
        requiredString: 'valid string',
        optionalNumber: 150 // Too high
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.optionalNumber).toContain('at most 100');
    });

    it('should validate select options', () => {
      const result = registry.validate({
        requiredString: 'valid string',
        selectField: 'invalid-option'
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.selectField).toContain('must be one of');
    });

    it('should validate array length', () => {
      const result = registry.validate({
        requiredString: 'valid string',
        arrayField: ['item1', 'item2', 'item3', 'item4'] // Too many items
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.arrayField).toContain('at most 3');
    });

    it('should pass validation for valid data', () => {
      const result = registry.validate({
        requiredString: 'valid string',
        optionalNumber: 50,
        selectField: 'option1',
        arrayField: ['item1', 'item2']
      });
      
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('Field Dependencies', () => {
    const dependencySchema: MetadataSchema = {
      name: 'dependency-schema',
      version: '1.0.0',
      description: 'Dependency test schema',
      groups: [
        {
          key: 'dependency',
          label: 'Dependency',
          order: 0
        }
      ],
      fields: [
        {
          key: 'enableFeature',
          type: 'boolean',
          label: 'Enable Feature',
          group: 'dependency',
          default: false
        },
        {
          key: 'featureConfig',
          type: 'string',
          label: 'Feature Configuration',
          group: 'dependency',
          dependencies: [
            {
              field: 'enableFeature',
              value: true
            }
          ]
        },
        {
          key: 'tags',
          type: 'array',
          label: 'Tags',
          group: 'dependency',
          default: []
        },
        {
          key: 'advancedOptions',
          type: 'string',
          label: 'Advanced Options',
          group: 'dependency',
          dependencies: [
            {
              field: 'tags',
              value: 'advanced',
              condition: 'contains'
            }
          ]
        }
      ]
    };

    beforeEach(() => {
      registry.register(dependencySchema);
    });

    it('should check dependency satisfaction for equals condition', () => {
      const satisfied = registry.isDependencySatisfied(
        dependencySchema.fields[1], // featureConfig
        { enableFeature: true }
      );
      
      expect(satisfied).toBe(true);
    });

    it('should check dependency satisfaction for contains condition', () => {
      const satisfied = registry.isDependencySatisfied(
        dependencySchema.fields[3], // advancedOptions
        { tags: ['basic', 'advanced', 'experimental'] }
      );
      
      expect(satisfied).toBe(true);
    });

    it('should return false for unsatisfied dependencies', () => {
      const satisfied = registry.isDependencySatisfied(
        dependencySchema.fields[1], // featureConfig
        { enableFeature: false }
      );
      
      expect(satisfied).toBe(false);
    });
  });

  describe('Default Metadata', () => {
    const defaultSchema: MetadataSchema = {
      name: 'default-schema',
      version: '1.0.0',
      description: 'Default values test schema',
      groups: [
        {
          key: 'defaults',
          label: 'Defaults',
          order: 0
        }
      ],
      fields: [
        {
          key: 'stringWithDefault',
          type: 'string',
          label: 'String with Default',
          group: 'defaults',
          default: 'default value'
        },
        {
          key: 'numberWithDefault',
          type: 'number',
          label: 'Number with Default',
          group: 'defaults',
          default: 42
        },
        {
          key: 'booleanWithDefault',
          type: 'boolean',
          label: 'Boolean with Default',
          group: 'defaults',
          default: true
        },
        {
          key: 'arrayWithDefault',
          type: 'array',
          label: 'Array with Default',
          group: 'defaults',
          default: ['item1', 'item2']
        }
      ]
    };

    beforeEach(() => {
      registry.register(defaultSchema);
    });

    it('should generate default metadata from schema', () => {
      const defaults = registry.getDefaultMetadata();
      
      expect(defaults).toEqual({
        stringWithDefault: 'default value',
        numberWithDefault: 42,
        booleanWithDefault: true,
        arrayWithDefault: ['item1', 'item2']
      });
    });
  });

  describe('Fields by Group', () => {
    const groupSchema: MetadataSchema = {
      name: 'group-schema',
      version: '1.0.0',
      description: 'Group organization test schema',
      groups: [
        {
          key: 'group1',
          label: 'Group 1',
          order: 0
        },
        {
          key: 'group2',
          label: 'Group 2',
          order: 1
        }
      ],
      fields: [
        {
          key: 'field1',
          type: 'string',
          label: 'Field 1',
          group: 'group1',
          order: 1
        },
        {
          key: 'field2',
          type: 'string',
          label: 'Field 2',
          group: 'group1',
          order: 0
        },
        {
          key: 'field3',
          type: 'string',
          label: 'Field 3',
          group: 'group2',
          order: 0
        }
      ]
    };

    beforeEach(() => {
      registry.register(groupSchema);
    });

    it('should return fields for a specific group', () => {
      const group1Fields = registry.getFieldsByGroup('group1');
      
      expect(group1Fields).toHaveLength(2);
      expect(group1Fields[0].key).toBe('field2'); // Order 0 comes first
      expect(group1Fields[1].key).toBe('field1'); // Order 1 comes second
    });

    it('should return empty array for non-existent group', () => {
      const nonExistentFields = registry.getFieldsByGroup('non-existent');
      
      expect(nonExistentFields).toHaveLength(0);
    });

    it('should return groups sorted by order', () => {
      const groups = registry.getGroups();
      
      expect(groups).toHaveLength(2);
      expect(groups[0].key).toBe('group1');
      expect(groups[1].key).toBe('group2');
    });
  });
});

describe('Core Metadata Schema', () => {
  it('should have all required core fields', () => {
    const coreFields = coreMetadataSchema.fields;
    const fieldKeys = coreFields.map(f => f.key);
    
    expect(fieldKeys).toContain('title');
    expect(fieldKeys).toContain('tags');
    expect(fieldKeys).toContain('categoryPath');
    expect(fieldKeys).toContain('models');
    expect(fieldKeys).toContain('notes');
  });

  it('should have proper field types', () => {
    const titleField = coreMetadataSchema.fields.find(f => f.key === 'title');
    const tagsField = coreMetadataSchema.fields.find(f => f.key === 'tags');
    const modelsField = coreMetadataSchema.fields.find(f => f.key === 'models');
    
    expect(titleField?.type).toBe('string');
    expect(tagsField?.type).toBe('multiselect');
    expect(modelsField?.type).toBe('multiselect');
  });

  it('should have required title field', () => {
    const titleField = coreMetadataSchema.fields.find(f => f.key === 'title');
    
    expect(titleField?.required).toBe(true);
  });
});

describe('Global Registry', () => {
  it('should have core schema registered by default', () => {
    const schemas = metadataSchemaRegistry.getSchemas();
    
    expect(schemas.length).toBeGreaterThan(0);
    expect(schemas.some(s => s.name === 'core')).toBe(true);
  });

  it('should validate against core schema', () => {
    const result = metadataSchemaRegistry.validate({
      title: 'Test Title',
      tags: ['tag1', 'tag2'],
      categoryPath: 'Test Category',
      models: ['gpt-4'],
      notes: 'Test notes'
    });
    
    expect(result.valid).toBe(true);
  });
});