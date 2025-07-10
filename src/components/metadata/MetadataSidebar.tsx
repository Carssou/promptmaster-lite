import { useState, useEffect } from "react";
import { X, Save, Tag, Settings, FileText, Folder } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { ModelsMultiSelect } from "./ModelsMultiSelect";
import { CategoryPicker } from "./CategoryPicker";
import { NotesEditor } from "./NotesEditor";

interface MetadataFormData {
  title: string;
  tags: string[];
  models: string[];
  categoryPath: string;
  notes: string;
}

interface MetadataSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  versionUuid: string;
  initialData?: Partial<MetadataFormData>;
  onSave: (data: MetadataFormData) => Promise<void>;
  className?: string;
}

export function MetadataSidebar({
  isOpen,
  onClose,
  versionUuid: _versionUuid,
  initialData = {},
  onSave,
  className = "",
}: MetadataSidebarProps) {
  const [formData, setFormData] = useState<MetadataFormData>({
    title: "",
    tags: [],
    models: [],
    categoryPath: "Uncategorized",
    notes: "",
    ...initialData,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        tags: [],
        models: [],
        categoryPath: "Uncategorized",
        notes: "",
        ...initialData,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (formData.tags.length > 10) {
      newErrors.tags = "Maximum 10 tags allowed";
    }

    if (formData.tags.some((tag) => tag.length > 25)) {
      newErrors.tags = "Each tag must be 25 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving metadata:", error);
      setErrors({ general: "Failed to save metadata. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleFieldChange = (field: keyof MetadataFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ${className}`}
        role="dialog"
        aria-labelledby="metadata-sidebar-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2
            id="metadata-sidebar-title"
            className="text-lg font-semibold text-gray-900"
          >
            Prompt Metadata
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
            aria-label="Close metadata sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-2">
            <label
              htmlFor="metadata-title"
              className="flex items-center text-sm font-medium text-gray-700"
            >
              <FileText size={16} className="mr-2" />
              Title
            </label>
            <input
              id="metadata-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="Enter prompt title..."
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-white"
              }`}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-600">
                {errors.title}
              </p>
            )}
          </div>

          {/* Tags Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Tag size={16} className="mr-2" />
              Tags
            </label>
            <TagsInput
              tags={formData.tags}
              onChange={(tags: string[]) => handleFieldChange("tags", tags)}
              placeholder="Add tags..."
              maxTags={10}
              maxTagLength={25}
              error={errors.tags}
            />
            {errors.tags && (
              <p className="text-sm text-red-600">{errors.tags}</p>
            )}
            <p className="text-xs text-gray-500">
              Maximum 10 tags, 25 characters each
            </p>
          </div>

          {/* Models Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Settings size={16} className="mr-2" />
              Compatible Models
            </label>
            <ModelsMultiSelect
              selectedModels={formData.models}
              onChange={(models: string[]) =>
                handleFieldChange("models", models)
              }
              placeholder="Select compatible models..."
            />
            <p className="text-xs text-gray-500">
              Select AI models this prompt works well with
            </p>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Folder size={16} className="mr-2" />
              Category
            </label>
            <CategoryPicker
              categoryPath={formData.categoryPath}
              onChange={(path: string) =>
                handleFieldChange("categoryPath", path)
              }
              placeholder="Select category..."
            />
            <p className="text-xs text-gray-500">
              Organize your prompt in the category tree
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <FileText size={16} className="mr-2" />
              Notes
            </label>
            <NotesEditor
              content={formData.notes}
              onChange={(notes: string) => handleFieldChange("notes", notes)}
              placeholder="Add notes about this prompt..."
            />
            <p className="text-xs text-gray-500">
              Markdown supported. Notes appear as tooltips in list views.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
