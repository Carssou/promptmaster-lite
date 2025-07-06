import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function NewPrompt() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Title and content cannot be empty.");
      return;
    }

    setSaving(true);
    const savingToast = toast.loading("Saving prompt...");
    try {
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await invoke("save_prompt", {
        title,
        content,
        tags: tagArray,
      });

      toast.success("Prompt saved successfully!", { id: savingToast });
      navigate("/");
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast.error(`Failed to save prompt: ${error}`, { id: savingToast });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Create New Prompt</h2>

      <div className="max-w-4xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Blog Title Generator"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="marketing, brainstorming"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Prompt Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="Generate 10 blog titles about {{topic}}..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !title || !content}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Prompt"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
