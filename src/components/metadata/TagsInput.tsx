import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxTagLength?: number;
  error?: string;
  className?: string;
}

export function TagsInput({
  tags,
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  maxTagLength = 25,
  error,
  className = "",
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Mock existing tags for autocomplete - in real implementation, this would come from backend
  const existingTags = [
    "marketing",
    "email",
    "social-media",
    "content",
    "copywriting",
    "seo",
    "blog",
    "product",
    "sales",
    "customer-service",
    "technical",
    "documentation",
    "code",
    "debugging",
    "analysis",
    "summarization",
    "translation",
    "creative",
    "brainstorming",
    "research",
  ];

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = existingTags
        .filter(
          (tag) =>
            tag.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(tag)
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    setFocusedSuggestionIndex(-1);
  }, [inputValue, tags]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();

    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) return;
    if (trimmedTag.length > maxTagLength) return;

    // Validate tag format (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedTag)) return;

    onChange([...tags, trimmedTag]);
    setInputValue("");
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (
          focusedSuggestionIndex >= 0 &&
          suggestions[focusedSuggestionIndex]
        ) {
          addTag(suggestions[focusedSuggestionIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
        break;
      case "Backspace":
        if (!inputValue && tags.length > 0) {
          removeTag(tags[tags.length - 1]);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (showSuggestions) {
          setFocusedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (showSuggestions) {
          setFocusedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
        break;
      case "Tab":
        if (showSuggestions && focusedSuggestionIndex >= 0) {
          e.preventDefault();
          addTag(suggestions[focusedSuggestionIndex]);
        }
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }, 200);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing Tags */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-blue-600 hover:text-blue-800 focus:outline-none"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}

        {/* Input Field */}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
            maxLength={maxTagLength}
          />
        )}

        {/* Add Button */}
        {tags.length < maxTags && inputValue.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="text-blue-600 hover:text-blue-800 focus:outline-none p-1"
            aria-label="Add tag"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                index === focusedSuggestionIndex ? "bg-gray-100" : ""
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
        <span>
          {tags.length}/{maxTags} tags
        </span>
        <span>Press Enter to add, Backspace to remove</span>
      </div>
    </div>
  );
}
