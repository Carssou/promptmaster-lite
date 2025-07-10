import { useState, useRef } from "react";
import { Eye, EyeOff, HelpCircle } from "lucide-react";

interface NotesEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function NotesEditor({
  content,
  onChange,
  placeholder = "Add notes about this prompt...",
  className = "",
}: NotesEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simple markdown renderer for preview
  const renderMarkdown = (text: string): string => {
    return (
      text
        // Headers
        .replace(
          /^### (.*$)/gm,
          '<h3 class="text-sm font-semibold text-gray-900 mb-1">$1</h3>'
        )
        .replace(
          /^## (.*$)/gm,
          '<h2 class="text-base font-semibold text-gray-900 mb-2">$1</h2>'
        )
        .replace(
          /^# (.*$)/gm,
          '<h1 class="text-lg font-bold text-gray-900 mb-2">$1</h1>'
        )
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        // Code
        .replace(
          /`(.*?)`/g,
          '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
        )
        // Links
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        // Line breaks
        .replace(/\n/g, "<br>")
    );
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);
    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const markdownHelp = [
    { syntax: "**bold**", description: "Bold text" },
    { syntax: "*italic*", description: "Italic text" },
    { syntax: "`code`", description: "Inline code" },
    { syntax: "# Header", description: "Header (# ## ###)" },
    { syntax: "[link](url)", description: "Link" },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => insertMarkdown("**", "**")}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-semibold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("*", "*")}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("`", "`")}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-mono"
            title="Code"
          >
            &lt;&gt;
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("[", "](url)")}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Link"
          >
            🔗
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Markdown help"
          >
            <HelpCircle size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`p-1 rounded ${
              isPreviewMode
                ? "text-blue-600 bg-blue-50"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title={isPreviewMode ? "Edit mode" : "Preview mode"}
          >
            {isPreviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Markdown Syntax
          </h4>
          <div className="space-y-1">
            {markdownHelp.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">
                  {item.syntax}
                </code>
                <span className="text-blue-700">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor/Preview */}
      <div className="border border-gray-300 rounded-md">
        {isPreviewMode ? (
          <div className="p-3 min-h-[100px] bg-gray-50">
            {content ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(content),
                }}
              />
            ) : (
              <p className="text-gray-500 text-sm italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            placeholder={placeholder}
            className="w-full p-3 min-h-[100px] resize-y border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={4}
          />
        )}
      </div>

      {/* Character Count */}
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>Markdown supported</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}
