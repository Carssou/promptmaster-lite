import { useState } from "react";
import { X, Edit3, AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface RenameCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryRenamed: () => void;
  currentCategoryPath: string;
}

export function RenameCategoryModal({
  isOpen,
  onClose,
  onCategoryRenamed,
  currentCategoryPath,
}: RenameCategoryModalProps) {
  const [newCategoryPath, setNewCategoryPath] = useState(currentCategoryPath);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryPath.trim()) {
      setError("Category path is required");
      return;
    }

    if (newCategoryPath.trim() === currentCategoryPath) {
      setError("New category path must be different from current path");
      return;
    }

    // Clean and validate category path
    const cleanPath = newCategoryPath.trim()
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

    setRenaming(true);
    setError("");

    try {
      await invoke("rename_category", { 
        oldPath: currentCategoryPath, 
        newPath: cleanPath 
      });
      onCategoryRenamed();
      handleClose();
    } catch (err) {
      setError(err as string);
    } finally {
      setRenaming(false);
    }
  };

  const handleClose = () => {
    setNewCategoryPath(currentCategoryPath);
    setError("");
    setRenaming(false);
    onClose();
  };

  const cleanPath = newCategoryPath.trim()
    .split('/')
    .map(part => part.trim().replace(/\s+/g, "_"))
    .filter(part => part.length > 0)
    .join('/');

  const getParentPath = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('/');
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Edit3 size={20} className="mr-2 text-blue-600" />
            Rename Category
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={renaming}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Current category display */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Current:</span> {currentCategoryPath}
            </div>

            {/* Parent category display */}
            {getParentPath(currentCategoryPath) && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Parent:</span> {getParentPath(currentCategoryPath)}
              </div>
            )}

            {/* New category path input */}
            <div>
              <label htmlFor="newCategoryPath" className="block text-sm font-medium text-gray-700 mb-2">
                New Category Path
              </label>
              <input
                id="newCategoryPath"
                type="text"
                value={newCategoryPath}
                onChange={(e) => setNewCategoryPath(e.target.value)}
                placeholder="Enter new category path..."
                disabled={renaming}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Path preview */}
            {newCategoryPath.trim() && newCategoryPath.trim() !== currentCategoryPath && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-500 mb-1">New path preview:</div>
                <div className="text-sm font-mono text-gray-700">{cleanPath}</div>
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
              <p>• Renaming will update all prompts in this category and subcategories</p>
              <p>• Use "/" to change the category hierarchy</p>
              <p>• Spaces will be converted to underscores</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={renaming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={renaming || !newCategoryPath.trim() || newCategoryPath.trim() === currentCategoryPath}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {renaming ? "Renaming..." : "Rename Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}