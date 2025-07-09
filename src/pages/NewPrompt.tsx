import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import { PromptEditor } from "../components/editor/PromptEditor";
import { validateVariables } from "../services/variableParser";

export function NewPrompt() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState<any[]>([]);

  // Handle editor content changes
  const handleEditorChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  const handleSave = useCallback(async () => {
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
      const errorMessage =
        typeof error === "string"
          ? error
          : "Failed to save prompt. Please try again.";
      toast.error(errorMessage, { id: savingToast, duration: 6000 });
    } finally {
      setSaving(false);
    }
  }, [title, content, tags, navigate]);

  // Validate variables and update markers
  useEffect(() => {
    const issues = validateVariables(content);
    const markers = issues.map((issue) => ({
      message: issue.message,
      severity: issue.severity,
      startLineNumber: issue.line,
      endLineNumber: issue.line,
      startColumn: issue.column,
      endColumn: issue.column + 10,
    }));

    setEditorMarkers(markers);
  }, [content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleSave]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Create New Prompt
              </h1>
              <p className="text-sm text-gray-500">
                Use variables like {"{{"}
                <code>variable_name</code>
                {"}}"} to make your prompt dynamic
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !title || !content}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
              saving || !title || !content
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : "Save Prompt"}</span>
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Blog Title Generator"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="marketing, brainstorming"
            />
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <PromptEditor
          value={content}
          onChange={handleEditorChange}
          markers={editorMarkers}
        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>⌘+S: Save</span>
            <span>
              Use {"{{"}
              <code>variable_name</code>
              {"}}"} for dynamic content
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{content.length} characters</span>
            <span>{content.split("\n").length} lines</span>
            {editorMarkers.length > 0 && (
              <span className="text-red-500">
                {editorMarkers.length} validation{" "}
                {editorMarkers.length === 1 ? "issue" : "issues"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
