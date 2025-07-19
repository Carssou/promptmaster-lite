import { useState } from "react";
import { X, Folder, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (categoryPath: string) => void;
  parentCategory?: string;
}

export function CreateCategoryModal({
  isOpen,
  onClose,
  onCategoryCreated,
  parentCategory = "",
}: CreateCategoryModalProps) {
  const [categoryName, setCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      setError("Category name is required");
      return;
    }

    // Clean and validate category path
    const cleanPath = categoryName.trim()
      .split('/')
      .map(part => part.trim().replace(/\s+/g, "_"))
      .filter(part => part.length > 0)
      .join('/');
    
    // Validate each part of the path
    const pathParts = cleanPath.split('/');
    for (const part of pathParts) {
      if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
        setError("Category names can only contain letters, numbers, spaces, hyphens, and underscores");
        return;
      }
    }

    const fullPath = parentCategory 
      ? `${parentCategory}/${cleanPath}`
      : cleanPath;

    setCreating(true);
    setError("");

    try {
      await invoke("create_category", { categoryPath: fullPath });
      onCategoryCreated(fullPath);
      handleClose();
    } catch (err) {
      setError(err as string);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCategoryName("");
    setError("");
    setCreating(false);
    onClose();
  };

  const cleanPath = categoryName.trim()
    .split('/')
    .map(part => part.trim().replace(/\s+/g, "_"))
    .filter(part => part.length > 0)
    .join('/');
    
  const fullPath = parentCategory 
    ? `${parentCategory}/${cleanPath}`
    : cleanPath;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Folder size={20} className="mr-2 text-blue-600" />
            Create New Category
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={creating}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Parent category display */}
            {parentCategory && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Parent category:</span> {parentCategory}
              </div>
            )}

            {/* Category name input */}
            <div>
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-2">
                Category Path
              </label>
              <input
                id="categoryName"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Development/Frontend or Marketing/Email"
                disabled={creating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Path preview */}
            {categoryName.trim() && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Full category path:</div>
                <div className="text-sm font-mono text-gray-700">{fullPath}</div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle size={16} className="text-red-600 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Help text */}
            <div className="text-xs text-gray-500">
              <p>• Use "/" to create nested categories (e.g., "Development/Frontend")</p>
              <p>• Category names can contain letters, numbers, spaces, hyphens, and underscores</p>
              <p>• Spaces will be converted to underscores</p>
              <p>• Parent categories are created automatically</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !categoryName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}