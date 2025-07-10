import { useState, useRef, useEffect } from "react";
import { ChevronDown, Folder, FolderOpen, Plus } from "lucide-react";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock category tree - in real implementation, this would come from backend
  const categoryTree: CategoryNode[] = [
    {
      path: "Uncategorized",
      name: "Uncategorized",
      children: [],
      count: 5,
    },
    {
      path: "Marketing",
      name: "Marketing",
      children: [
        {
          path: "Marketing/Email",
          name: "Email",
          children: [
            {
              path: "Marketing/Email/Newsletters",
              name: "Newsletters",
              children: [],
              count: 3,
            },
            {
              path: "Marketing/Email/Campaigns",
              name: "Campaigns",
              children: [],
              count: 7,
            },
          ],
          count: 10,
        },
        {
          path: "Marketing/Social Media",
          name: "Social Media",
          children: [
            {
              path: "Marketing/Social Media/Twitter",
              name: "Twitter",
              children: [],
              count: 4,
            },
            {
              path: "Marketing/Social Media/LinkedIn",
              name: "LinkedIn",
              children: [],
              count: 2,
            },
          ],
          count: 6,
        },
        {
          path: "Marketing/SEO",
          name: "SEO",
          children: [],
          count: 8,
        },
      ],
      count: 24,
    },
    {
      path: "Development",
      name: "Development",
      children: [
        {
          path: "Development/Code Review",
          name: "Code Review",
          children: [],
          count: 5,
        },
        {
          path: "Development/Documentation",
          name: "Documentation",
          children: [],
          count: 12,
        },
        {
          path: "Development/Debugging",
          name: "Debugging",
          children: [],
          count: 3,
        },
      ],
      count: 20,
    },
    {
      path: "Content",
      name: "Content",
      children: [
        {
          path: "Content/Blog Posts",
          name: "Blog Posts",
          children: [],
          count: 15,
        },
        {
          path: "Content/Product Descriptions",
          name: "Product Descriptions",
          children: [],
          count: 8,
        },
      ],
      count: 23,
    },
  ];

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
                onClick={() => {
                  // Future: Open category management modal
                  console.log("Open category management");
                }}
              >
                <Plus size={12} className="mr-1" />
                New
              </button>
            </div>
          </div>

          {/* Category Tree */}
          <div className="max-h-48 overflow-y-auto">
            {categoryTree.map((node) => renderCategoryNode(node))}
          </div>
        </div>
      )}
    </div>
  );
}
