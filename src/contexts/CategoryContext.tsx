import { createContext, useContext } from "react";

interface CategoryContextType {
  refreshCategories: () => Promise<void>;
  refreshTrigger: number; // Add a trigger to force re-renders
}

export const CategoryContext = createContext<CategoryContextType | null>(null);

export const useCategoryContext = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    // Return a no-op function if context is not available
    return { refreshCategories: async () => {}, refreshTrigger: 0 };
  }
  return context;
};