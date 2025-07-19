import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Clock, Tag } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import toast from "react-hot-toast";

interface Prompt {
  uuid: string;
  title: string;
  tags: string[] | string;
  created_at: string;
  updated_at: string;
  category_path?: string;
}

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Silent reload for file watcher (no toasts)
  const silentReloadPrompts = useCallback(async () => {
    try {
      let data;
      if (selectedCategory) {
        data = await invoke<Prompt[]>("get_prompts_by_category", { categoryPath: selectedCategory });
      } else {
        data = await invoke<Prompt[]>("list_prompts");
      }
      setPrompts(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to reload prompts:", error);
    }
  }, [selectedCategory]);

  // Initial load with toast feedback
  const loadPrompts = useCallback(
    async (showToast = true) => {
      if (!showToast) {
        return silentReloadPrompts();
      }

      setLoading(true);
      const promise = selectedCategory 
        ? invoke<Prompt[]>("get_prompts_by_category", { categoryPath: selectedCategory })
        : invoke<Prompt[]>("list_prompts");

      const loadingMessage = selectedCategory 
        ? `Loading ${selectedCategory} prompts...`
        : "Loading prompts...";

      toast.promise(
        promise,
        {
          loading: loadingMessage,
          success: (data) => {
            setPrompts(data);
            setLoading(false);
            const message = selectedCategory 
              ? `${data.length} prompts in ${selectedCategory}`
              : `${data.length} prompts loaded!`;
            return message;
          },
          error: (error) => {
            console.error("Failed to load prompts:", error);
            setLoading(false);
            return `Failed to load prompts: ${error}`;
          },
        },
        { id: "loading-prompts-toast" }
      );
    },
    [selectedCategory, silentReloadPrompts]
  );

  useEffect(() => {
    loadPrompts(); // Initial load with toast

    const unlisten = listen("file-changed", (event) => {
      console.log("File changed event received:", event.payload);

      // Debounce rapid file changes
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }

      reloadTimeoutRef.current = setTimeout(() => {
        silentReloadPrompts(); // Silent reload, no toast spam
      }, 500); // Wait 500ms after last file change
    });

    return () => {
      unlisten.then((f) => f());
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [loadPrompts, silentReloadPrompts]);

  // Reload when category changes
  useEffect(() => {
    loadPrompts(false); // Don't show toast when filtering
  }, [selectedCategory, loadPrompts]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-600">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {selectedCategory ? `${selectedCategory} Prompts` : 'My Prompts'}
          </h1>
          {selectedCategory && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Showing prompts in "{selectedCategory}" and subcategories
            </p>
          )}
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          New Prompt
        </Link>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-500 mb-4">
            {selectedCategory ? (
              <>
                <p className="text-lg">No prompts in "{selectedCategory}"</p>
                <p>Create a new prompt and assign it to this category!</p>
              </>
            ) : (
              <>
                <p className="text-lg">No prompts yet</p>
                <p>Create your first prompt to get started!</p>
              </>
            )}
          </div>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create First Prompt
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.uuid} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptCard({ prompt }: { prompt: Prompt }) {
  const updatedDate = new Date(prompt.updated_at).toLocaleDateString();
  
  // Parse tags from string to array if needed
  const tags = Array.isArray(prompt.tags) 
    ? prompt.tags 
    : prompt.tags 
      ? JSON.parse(prompt.tags || '[]').filter((tag: string) => tag.trim() !== '')
      : [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <Link to={`/editor/${prompt.uuid}`} className="block">
        <h2 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
          {prompt.title}
        </h2>
      </Link>

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Clock size={14} />
        <span>Updated {updatedDate}</span>
      </div>

      {prompt.category_path && prompt.category_path !== 'Uncategorized' && (
        <div className="text-sm text-blue-600 mb-3">
          {prompt.category_path}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-gray-400" />
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
