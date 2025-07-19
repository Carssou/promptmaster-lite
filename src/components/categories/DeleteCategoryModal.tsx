import { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryDeleted: () => void;
  categoryPath: string;
}

export function DeleteCategoryModal({
  isOpen,
  onClose,
  onCategoryDeleted,
  categoryPath,
}: DeleteCategoryModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      await invoke("delete_category", { categoryPath });
      onCategoryDeleted();
      handleClose();
    } catch (err) {
      setError(err as string);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setError("");
    setDeleting(false);
    onClose();
  };

  const getParentCategory = (path: string) => {
    const parts = path.split('/');
    if (parts.length <= 1) return "Uncategorized";
    return parts.slice(0, -1).join('/');
  };

  const hasSubcategories = categoryPath.includes('/') || categoryPath !== "Uncategorized";
  const parentCategory = getParentCategory(categoryPath);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Trash2 size={20} className="mr-2 text-red-600" />
            Delete Category
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={deleting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Warning */}
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle size={20} className="text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  This action cannot be undone
                </h3>
                <p className="text-sm text-red-700">
                  You are about to delete the category <strong>"{categoryPath}"</strong>
                </p>
              </div>
            </div>

            {/* Category info */}
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Category to delete:</span> {categoryPath}
              </div>
              {categoryPath !== "Uncategorized" && (
                <div>
                  <span className="font-medium">Prompts will be moved to:</span> {parentCategory}
                </div>
              )}
            </div>

            {/* What will happen */}
            <div className="p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">What will happen:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All prompts in "{categoryPath}" will be moved to "{parentCategory}"</li>
                <li>• Any subcategories will be moved up one level</li>
                <li>• The category structure will be reorganized automatically</li>
              </ul>
            </div>

            {/* Error display */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle size={16} className="text-red-600 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}