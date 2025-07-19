import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { RenameCategoryModal } from "./RenameCategoryModal";
import { DeleteCategoryModal } from "./DeleteCategoryModal";

export interface CategoryNode {
  path: string;
  name: string;
  children: CategoryNode[];
  count: number;
}

interface CategoryTreeProps {
  onCategorySelect?: (categoryPath: string) => void;
  selectedCategory?: string;
  className?: string;
}

export interface CategoryTreeRef {
  refresh: () => Promise<void>;
}

export const CategoryTree = forwardRef<CategoryTreeRef, CategoryTreeProps>(({ 
  onCategorySelect, 
  selectedCategory,
  className = "" 
}, ref) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['Uncategorized']));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; categoryPath: string } | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");

  // Fetch category tree from backend
  const fetchCategoryTree = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching category tree from backend...");
      const tree = await invoke<CategoryNode[]>("get_category_tree");
      console.log("Received category tree:", tree);
      setCategoryTree(tree);
    } catch (err) {
      console.error("Failed to fetch category tree:", err);
      setError(err as string);
      setCategoryTree([]);
    } finally {
      setLoading(false);
    }
  };

  // Load category tree on mount
  useEffect(() => {
    fetchCategoryTree();
  }, []);

  // Expose refresh function to parent components
  useImperativeHandle(ref, () => ({
    refresh: fetchCategoryTree
  }));

  // Auto-expand path to selected category
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "Uncategorized") {
      const pathParts = selectedCategory.split("/");
      const newExpanded = new Set(expandedPaths);

      for (let i = 0; i < pathParts.length - 1; i++) {
        const parentPath = pathParts.slice(0, i + 1).join("/");
        newExpanded.add(parentPath);
      }

      setExpandedPaths(newExpanded);
    }
  }, [selectedCategory]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleCategoryClick = (path: string) => {
    onCategorySelect?.(path);
  };

  const handleContextMenu = (e: React.MouseEvent, categoryPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't show context menu for "Uncategorized" since it can't be renamed or deleted
    if (categoryPath === "Uncategorized") {
      return;
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      categoryPath
    });
  };

  const handleRename = (categoryPath: string) => {
    setCategoryToRename(categoryPath);
    setShowRenameModal(true);
    setContextMenu(null);
  };

  const handleCategoryRenamed = () => {
    fetchCategoryTree(); // Refresh the tree
  };

  const handleDelete = (categoryPath: string) => {
    setCategoryToDelete(categoryPath);
    setShowDeleteModal(true);
    setContextMenu(null);
  };

  const handleCategoryDeleted = () => {
    fetchCategoryTree(); // Refresh the tree
  };

  const renderCategoryNode = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedCategory === node.path;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.path} className="select-none">
        <div
          className={`group flex items-center py-1.5 px-2 text-sm cursor-pointer rounded-md transition-colors ${
            isSelected 
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => handleCategoryClick(node.path)}
          onContextMenu={(e) => handleContextMenu(e, node.path)}
          data-testid={`category-item-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.path);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              data-testid={`category-toggle-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-5 flex justify-center">
              <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          )}

          {/* Folder Icon */}
          <div className="mr-2">
            {hasChildren && isExpanded ? (
              <FolderOpen size={16} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <Folder size={16} className="text-gray-500 dark:text-gray-400" />
            )}
          </div>

          {/* Category Name */}
          <span className="flex-1 truncate" title={node.name}>
            {node.name}
          </span>

          {/* Count Badge */}
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
            {node.count}
          </span>

          {/* Context Menu Button */}
          {node.path !== "Uncategorized" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, node.path);
              }}
              className="ml-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
              data-testid={`category-menu-${node.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              <MoreHorizontal size={12} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Categories
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">
          Loading categories...
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="px-2 py-4">
          <div className="text-sm text-red-600 dark:text-red-400 mb-2">
            Failed to load categories
          </div>
          <button
            onClick={fetchCategoryTree}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Category Tree */}
      {!loading && !error && (
        <div className="space-y-0.5" data-testid="category-tree">
          {categoryTree.length === 0 ? (
            <div className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400">
              No categories found
            </div>
          ) : (
            categoryTree.map((node) => renderCategoryNode(node))
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          data-testid="category-context-menu"
        >
          <button
            type="button"
            onClick={() => handleRename(contextMenu.categoryPath)}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-testid="category-rename"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => handleDelete(contextMenu.categoryPath)}
            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-testid="category-delete"
          >
            Delete
          </button>
        </div>
      )}

      {/* Rename Category Modal */}
      <RenameCategoryModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onCategoryRenamed={handleCategoryRenamed}
        currentCategoryPath={categoryToRename}
      />

      {/* Delete Category Modal */}
      <DeleteCategoryModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onCategoryDeleted={handleCategoryDeleted}
        categoryPath={categoryToDelete}
      />
    </div>
  );
});