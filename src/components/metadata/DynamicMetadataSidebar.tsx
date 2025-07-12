import { useState, useEffect } from 'react';
import { X, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  metadataSchemaRegistry,
  MetadataFieldSchema,
  MetadataSchemaGroup,
  ValidationResult
} from '../../services/metadataSchema';
import { DynamicFormField } from './DynamicFormField';

interface DynamicMetadataSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  versionUuid: string;
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  className?: string;
}

export function DynamicMetadataSidebar({
  isOpen,
  onClose,
  versionUuid: _versionUuid,
  initialData = {},
  onSave,
  className = "",
}: DynamicMetadataSidebarProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    errors: {},
    warnings: {}
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Get schema data
  const schema = metadataSchemaRegistry.getCompiledSchema();
  const groups = metadataSchemaRegistry.getGroups();

  // Reset form when opening with new data
  useEffect(() => {
    if (isOpen) {
      const defaultData = metadataSchemaRegistry.getDefaultMetadata();
      setFormData({
        ...defaultData,
        ...initialData,
      });
      setValidationResult({ valid: true, errors: {}, warnings: {} });
    }
  }, [isOpen, initialData]);

  // Validate form data whenever it changes
  useEffect(() => {
    const result = metadataSchemaRegistry.validate(formData);
    setValidationResult(result);
  }, [formData]);

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSave = async () => {
    if (!validationResult.valid) return;

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving metadata:', error);
      setValidationResult(prev => ({
        ...prev,
        errors: { ...prev.errors, general: 'Failed to save metadata. Please try again.' }
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const toggleGroup = (groupKey: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupKey)) {
      newCollapsed.delete(groupKey);
    } else {
      newCollapsed.add(groupKey);
    }
    setCollapsedGroups(newCollapsed);
  };

  const getVisibleFields = (groupKey: string): MetadataFieldSchema[] => {
    return metadataSchemaRegistry.getFieldsByGroup(groupKey).filter(field => {
      return metadataSchemaRegistry.isDependencySatisfied(field, formData);
    });
  };

  const renderGroup = (group: MetadataSchemaGroup) => {
    const fields = getVisibleFields(group.key);
    if (fields.length === 0) return null;

    const isCollapsed = collapsedGroups.has(group.key);
    const hasErrors = fields.some(field => validationResult.errors[field.key]);

    return (
      <div key={group.key} className="border-b border-gray-200 last:border-b-0">
        {/* Group Header */}
        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${
            hasErrors ? 'bg-red-50' : ''
          }`}
        >
          <div className="flex items-center space-x-2">
            {isCollapsed ? (
              <ChevronRight size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
            <span className="font-medium text-gray-900">{group.label}</span>
            {hasErrors && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                Error
              </span>
            )}
          </div>
        </button>

        {/* Group Content */}
        {!isCollapsed && (
          <div className="p-3 space-y-4 bg-gray-50">
            {group.description && (
              <p className="text-sm text-gray-600 mb-3">{group.description}</p>
            )}
            {fields.map(field => (
              <DynamicFormField
                key={field.key}
                field={field}
                value={formData[field.key]}
                onChange={(value) => handleFieldChange(field.key, value)}
                error={validationResult.errors[field.key]}
                disabled={saving}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 flex flex-col ${className}`}
        role="dialog"
        aria-labelledby="metadata-sidebar-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2
              id="metadata-sidebar-title"
              className="text-lg font-semibold text-gray-900"
            >
              Prompt Metadata
            </h2>
            <p className="text-sm text-gray-500">
              {schema.description || 'Configure prompt metadata and settings'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            aria-label="Close metadata sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Validation Summary */}
          {validationResult.errors.general && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{validationResult.errors.general}</p>
            </div>
          )}

          {!validationResult.valid && !validationResult.errors.general && (
            <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-600">
                Please fix the validation errors below before saving.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div>
            {groups.map(group => renderGroup(group))}
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {Object.keys(validationResult.errors).length > 0 && (
                <span className="text-red-600">
                  {Object.keys(validationResult.errors).length} validation error(s)
                </span>
              )}
              {Object.keys(validationResult.warnings).length > 0 && (
                <span className="text-yellow-600 ml-2">
                  {Object.keys(validationResult.warnings).length} warning(s)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !validationResult.valid}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}