import {
  parseCategoryPath,
  buildCategoryPath,
  getParentCategoryPath,
  getCategoryName,
  getCategoryDepth,
  isCategoryChild,
  isCategoryDescendant,
  validateCategoryName,
  validateCategoryPath,
  sanitizeCategoryName,
  findCategoryInTree,
  getAllCategoryPaths,
  getAncestorPaths,
  getDescendantPaths,
  sortCategoryPaths,
  createCategoryBreadcrumbs,
  categoryExistsInTree,
  generateUniqueCategoryName,
  CategoryNode
} from '../categoryUtils';

// Mock category tree for testing
const mockCategoryTree: CategoryNode[] = [
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
        ],
        count: 10,
      },
      {
        path: "Marketing/Social Media",
        name: "Social Media",
        children: [],
        count: 6,
      },
    ],
    count: 24,
  },
  {
    path: "Development",
    name: "Development",
    children: [],
    count: 20,
  },
];

describe('categoryUtils', () => {
  describe('parseCategoryPath', () => {
    it('should parse category path correctly', () => {
      expect(parseCategoryPath("Marketing/Email/Newsletters")).toEqual(["Marketing", "Email", "Newsletters"]);
      expect(parseCategoryPath("Marketing")).toEqual(["Marketing"]);
      expect(parseCategoryPath("Uncategorized")).toEqual([]);
      expect(parseCategoryPath("")).toEqual([]);
    });

    it('should handle paths with extra spaces', () => {
      expect(parseCategoryPath("Marketing / Email / Newsletters")).toEqual(["Marketing ", " Email ", " Newsletters"]);
    });
  });

  describe('buildCategoryPath', () => {
    it('should build category path correctly', () => {
      expect(buildCategoryPath(["Marketing", "Email", "Newsletters"])).toBe("Marketing/Email/Newsletters");
      expect(buildCategoryPath(["Marketing"])).toBe("Marketing");
      expect(buildCategoryPath([])).toBe("Uncategorized");
    });
  });

  describe('getParentCategoryPath', () => {
    it('should get parent category path correctly', () => {
      expect(getParentCategoryPath("Marketing/Email/Newsletters")).toBe("Marketing/Email");
      expect(getParentCategoryPath("Marketing/Email")).toBe("Marketing");
      expect(getParentCategoryPath("Marketing")).toBe("Uncategorized");
      expect(getParentCategoryPath("Uncategorized")).toBe("Uncategorized");
    });
  });

  describe('getCategoryName', () => {
    it('should get category name correctly', () => {
      expect(getCategoryName("Marketing/Email/Newsletters")).toBe("Newsletters");
      expect(getCategoryName("Marketing")).toBe("Marketing");
      expect(getCategoryName("Uncategorized")).toBe("Uncategorized");
      expect(getCategoryName("")).toBe("Uncategorized");
    });
  });

  describe('getCategoryDepth', () => {
    it('should get category depth correctly', () => {
      expect(getCategoryDepth("Marketing/Email/Newsletters")).toBe(3);
      expect(getCategoryDepth("Marketing/Email")).toBe(2);
      expect(getCategoryDepth("Marketing")).toBe(1);
      expect(getCategoryDepth("Uncategorized")).toBe(0);
    });
  });

  describe('isCategoryChild', () => {
    it('should check if category is a direct child', () => {
      expect(isCategoryChild("Marketing/Email", "Marketing")).toBe(true);
      expect(isCategoryChild("Marketing/Email/Newsletters", "Marketing/Email")).toBe(true);
      expect(isCategoryChild("Marketing/Email/Newsletters", "Marketing")).toBe(false); // grandchild, not child
      expect(isCategoryChild("Marketing", "Uncategorized")).toBe(true);
      expect(isCategoryChild("Development", "Marketing")).toBe(false);
    });
  });

  describe('isCategoryDescendant', () => {
    it('should check if category is a descendant', () => {
      expect(isCategoryDescendant("Marketing/Email", "Marketing")).toBe(true);
      expect(isCategoryDescendant("Marketing/Email/Newsletters", "Marketing")).toBe(true);
      expect(isCategoryDescendant("Marketing/Email/Newsletters", "Marketing/Email")).toBe(true);
      expect(isCategoryDescendant("Marketing", "Uncategorized")).toBe(true);
      expect(isCategoryDescendant("Development", "Marketing")).toBe(false);
      expect(isCategoryDescendant("Uncategorized", "Marketing")).toBe(false);
    });
  });

  describe('validateCategoryName', () => {
    it('should validate category names correctly', () => {
      expect(validateCategoryName("Marketing")).toEqual({ isValid: true });
      expect(validateCategoryName("Email & Social")).toEqual({ isValid: true });
      expect(validateCategoryName("")).toEqual({ isValid: false, error: "Category name cannot be empty" });
      expect(validateCategoryName("Name/With/Slash")).toEqual({ isValid: false, error: "Category name cannot contain forward slashes" });
      expect(validateCategoryName("Name<>")).toEqual({ isValid: false, error: "Category name contains invalid characters (\\<>:\"|?*)" });
      expect(validateCategoryName("CON")).toEqual({ isValid: false, error: "Category name is a reserved system name" });
    });

    it('should validate long names', () => {
      const longName = "a".repeat(51);
      expect(validateCategoryName(longName)).toEqual({ isValid: false, error: "Category name cannot exceed 50 characters" });
    });
  });

  describe('validateCategoryPath', () => {
    it('should validate category paths correctly', () => {
      expect(validateCategoryPath("Marketing/Email")).toEqual({ isValid: true });
      expect(validateCategoryPath("Uncategorized")).toEqual({ isValid: true });
      expect(validateCategoryPath("")).toEqual({ isValid: false, error: "Category path cannot be empty" });
      expect(validateCategoryPath("Marketing/Email/Name<>")).toEqual({ 
        isValid: false, 
        error: "Invalid component \"Name<>\": Category name contains invalid characters (\\<>:\"|?*)" 
      });
    });

    it('should validate path depth', () => {
      const deepPath = Array(11).fill("Level").join("/");
      expect(validateCategoryPath(deepPath)).toEqual({ 
        isValid: false, 
        error: "Category path cannot have more than 10 levels" 
      });
    });
  });

  describe('sanitizeCategoryName', () => {
    it('should sanitize category names', () => {
      expect(sanitizeCategoryName("Marketing")).toBe("Marketing");
      expect(sanitizeCategoryName("Name<>")).toBe("Name");
      expect(sanitizeCategoryName("Name/With/Slash")).toBe("NameWithSlash");
      expect(sanitizeCategoryName("  Name  ")).toBe("Name");
      expect(sanitizeCategoryName(".hidden.")).toBe("hidden");
    });
  });

  describe('findCategoryInTree', () => {
    it('should find categories in tree', () => {
      const found = findCategoryInTree(mockCategoryTree, "Marketing/Email");
      expect(found).toBeTruthy();
      expect(found?.name).toBe("Email");
      
      const notFound = findCategoryInTree(mockCategoryTree, "NonExistent");
      expect(notFound).toBeNull();
    });
  });

  describe('getAllCategoryPaths', () => {
    it('should get all category paths from tree', () => {
      const paths = getAllCategoryPaths(mockCategoryTree);
      expect(paths).toContain("Uncategorized");
      expect(paths).toContain("Marketing");
      expect(paths).toContain("Marketing/Email");
      expect(paths).toContain("Marketing/Email/Newsletters");
      expect(paths).toContain("Marketing/Social Media");
      expect(paths).toContain("Development");
    });
  });

  describe('getAncestorPaths', () => {
    it('should get ancestor paths', () => {
      const ancestors = getAncestorPaths("Marketing/Email/Newsletters");
      expect(ancestors).toEqual(["Marketing", "Marketing/Email"]);
      
      const singleAncestor = getAncestorPaths("Marketing/Email");
      expect(singleAncestor).toEqual(["Marketing"]);
      
      const noAncestors = getAncestorPaths("Marketing");
      expect(noAncestors).toEqual([]);
    });
  });

  describe('getDescendantPaths', () => {
    it('should get descendant paths', () => {
      const descendants = getDescendantPaths(mockCategoryTree, "Marketing");
      expect(descendants).toContain("Marketing/Email");
      expect(descendants).toContain("Marketing/Email/Newsletters");
      expect(descendants).toContain("Marketing/Social Media");
      expect(descendants).not.toContain("Marketing");
    });
  });

  describe('sortCategoryPaths', () => {
    it('should sort category paths correctly', () => {
      const unsorted = ["Marketing/Email", "Development", "Marketing", "Marketing/Email/Newsletters"];
      const sorted = sortCategoryPaths(unsorted);
      expect(sorted).toEqual(["Development", "Marketing", "Marketing/Email", "Marketing/Email/Newsletters"]);
    });
  });

  describe('createCategoryBreadcrumbs', () => {
    it('should create breadcrumbs correctly', () => {
      const breadcrumbs = createCategoryBreadcrumbs("Marketing/Email/Newsletters");
      expect(breadcrumbs).toEqual([
        { name: "Uncategorized", path: "Uncategorized" },
        { name: "Marketing", path: "Marketing" },
        { name: "Email", path: "Marketing/Email" },
        { name: "Newsletters", path: "Marketing/Email/Newsletters" }
      ]);
      
      const uncategorized = createCategoryBreadcrumbs("Uncategorized");
      expect(uncategorized).toEqual([
        { name: "Uncategorized", path: "Uncategorized" }
      ]);
    });
  });

  describe('categoryExistsInTree', () => {
    it('should check if category exists in tree', () => {
      expect(categoryExistsInTree(mockCategoryTree, "Marketing")).toBe(true);
      expect(categoryExistsInTree(mockCategoryTree, "Marketing/Email")).toBe(true);
      expect(categoryExistsInTree(mockCategoryTree, "NonExistent")).toBe(false);
    });
  });

  describe('generateUniqueCategoryName', () => {
    it('should generate unique category names', () => {
      const unique1 = generateUniqueCategoryName(mockCategoryTree, "Marketing");
      expect(unique1).toBe("Marketing 1");
      
      const unique2 = generateUniqueCategoryName(mockCategoryTree, "NewCategory");
      expect(unique2).toBe("NewCategory");
      
      const sanitized = generateUniqueCategoryName(mockCategoryTree, "Name<>");
      expect(sanitized).toBe("Name");
    });
  });
});