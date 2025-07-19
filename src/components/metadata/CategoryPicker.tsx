import { useState, useRef, useEffect } from "react";
import { ChevronDown, Folder, FolderOpen, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { CreateCategoryModal } from "../categories/CreateCategoryModal";
import { useCategoryContext } from "../../contexts/CategoryContext";

interface CategoryNode {
  path: string;
  name: string;
  children: CategoryNode[];
  count: number;
}

interface CategoryPickerProps {
  categoryPath: string;
  onChange: (path: string) => void;
  placeholder?: string;
  className?: string;
}

export function CategoryPicker({
  categoryPath,
  onChange,
  placeholder = "Select category...",
  className = "",
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { refreshTrigger } = useCategoryContext();

  // Helper function to find if a category exists in the tree
  const findCategoryInTree = (tree: CategoryNode[], targetPath: string): boolean => {
    for (const node of tree) {
      if (node.path === targetPath) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findCategoryInTree(node.children, targetPath)) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper function to find the best replacement category when one is deleted
  const findBestReplacement = (deletedPath: string, tree: CategoryNode[]): string => {
    // Try to find the parent category
    const pathParts = deletedPath.split('/');
    if (pathParts.length > 1) {
      // Try parent categories from most specific to least specific
      for (let i = pathParts.length - 1; i > 0; i--) {
        const parentPath = pathParts.slice(0, i).join('/');
        if (findCategoryInTree(tree, parentPath)) {
          return parentPath;
        }
      }
    }
    
    // If no parent found, default to Uncategorized
    return "Uncategorized";
  };

  // Helper function to add a new category to the tree structure
  const addCategoryToTree = (tree: CategoryNode[], newCategory: CategoryNode) => {
    const pathParts = newCategory.path.split('/');
    
    if (pathParts.length === 1) {
      // Root level category
      if (!tree.find(node => node.path === newCategory.path)) {
        tree.push(newCategory);
        tree.sort((a, b) => a.name.localeCompare(b.name));
      }
    } else {
      // Nested category - find or create parent
      const parentPath = pathParts.slice(0, -1).join('/');
      let parentNode = findNodeInTree(tree, parentPath);
      
      if (!parentNode) {
        // Create parent node recursively
        const parentCategory: CategoryNode = {
          path: parentPath,
          name: pathParts[pathParts.length - 2],
          children: [],
          count: 0
        };
        addCategoryToTree(tree, parentCategory);
        parentNode = findNodeInTree(tree, parentPath);
      }
      
      if (parentNode && !parentNode.children.find(child => child.path === newCategory.path)) {
        parentNode.children.push(newCategory);
        parentNode.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  };

  // Helper function to find a specific node in the tree
  const findNodeInTree = (tree: CategoryNode[], targetPath: string): CategoryNode | null => {
    for (const node of tree) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children.length > 0) {
        const found = findNodeInTree(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Load category tree from backend
  const loadCategories = async () => {
    setLoading(true);
    try {
      const tree = await invoke<CategoryNode[]>("get_category_tree");
      setCategoryTree(tree);
    } catch (error) {
      console.error("Failed to load categories:", error);
      // Fallback to empty tree
      setCategoryTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Refresh when categories change in other parts of the app
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadCategories();
    }
  }, [refreshTrigger]);

  // Check if selected category still exists after refresh
  useEffect(() => {
    if (categoryPath && categoryTree.length > 0) {
      const categoryExists = findCategoryInTree(categoryTree, categoryPath);
      
      if (!categoryExists) {
        // Category was deleted, try to find the best replacement
        const replacement = findBestReplacement(categoryPath, categoryTree);
        onChange(replacement);
      }
    }
  }, [categoryTree, categoryPath, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-expand path to selected category
  useEffect(() => {
    if (categoryPath && categoryPath !== "Uncategorized") {
      const pathParts = categoryPath.split("/");
      const newExpanded = new Set<string>();

      for (let i = 0; i < pathParts.length - 1; i++) {
        const parentPath = pathParts.slice(0, i + 1).join("/");
        newExpanded.add(parentPath);
      }

      setExpandedPaths(newExpanded);
    }
  }, [categoryPath]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const selectCategory = (path: string) => {
    onChange(path);
    setIsOpen(false);
  };

  const handleCategoryCreated = (categoryPath: string) => {
    // Set the newly created category as selected immediately
    onChange(categoryPath);
    setIsOpen(false);
    
    // Add the new category to the tree temporarily so it appears in the dropdown
    const newCategory: CategoryNode = {
      path: categoryPath,
      name: categoryPath.split('/').pop() || categoryPath,
      children: [],
      count: 0
    };
    
    // Add to tree and rebuild hierarchy
    setCategoryTree(prevTree => {
      const updatedTree = [...prevTree];
      addCategoryToTree(updatedTree, newCategory);
      return updatedTree;
    });
  };

  const getDisplayName = (path: string) => {
    if (path === "Uncategorized") return "Uncategorized";
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const renderCategoryNode = (node: CategoryNode, level: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = categoryPath === node.path;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
            isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700"
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => selectCategory(node.path)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.path);
              }}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </button>
          ) : (
            <div className="mr-1 p-1">
              <Folder size={14} />
            </div>
          )}

          <span className="flex-1">{node.name}</span>

          <span className="text-xs text-gray-500 ml-2">{node.count}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Category Display */}
      <div
        className="flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <Folder size={16} className="mr-2 text-gray-500" />
          <span className="text-sm">
            {categoryPath ? getDisplayName(categoryPath) : placeholder}
          </span>
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </div>

      {/* Category Path Breadcrumb */}
      {categoryPath && categoryPath !== "Uncategorized" && (
        <div className="mt-1 text-xs text-gray-500">{categoryPath}</div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Select Category
              </span>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={12} className="mr-1" />
                New
              </button>
            </div>
          </div>

          {/* Category Tree */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Loading categories...
              </div>
            ) : categoryTree.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No categories found. Create prompts to populate categories.
              </div>
            ) : (
              categoryTree.map((node) => renderCategoryNode(node))
            )}
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
