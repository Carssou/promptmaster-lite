import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { Plus, Clock, Tag } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import toast from "react-hot-toast";

interface Prompt {
  uuid: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function Dashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Silent reload for file watcher (no toasts)
  const silentReloadPrompts = useCallback(async () => {
    try {
      const data = await invoke<Prompt[]>("list_prompts");
      setPrompts(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to reload prompts:", error);
    }
  }, []);

  // Initial load with toast feedback
  const loadPrompts = useCallback(
    async (showToast = true) => {
      if (!showToast) {
        return silentReloadPrompts();
      }

      setLoading(true);
      const promise = invoke<Prompt[]>("list_prompts");

      toast.promise(
        promise,
        {
          loading: "Loading prompts...",
          success: (data) => {
            setPrompts(data);
            setLoading(false);
            return "Prompts loaded!";
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
    [silentReloadPrompts]
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
        <h1 className="text-3xl font-bold text-gray-900">My Prompts</h1>
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
            <p className="text-lg">No prompts yet</p>
            <p>Create your first prompt to get started!</p>
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

      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-gray-400" />
          {prompt.tags.map((tag) => (
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
