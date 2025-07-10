import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";

interface ModelProvider {
  id: string;
  name: string;
  provider: string;
  active: boolean;
}

interface ModelsMultiSelectProps {
  selectedModels: string[];
  onChange: (models: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function ModelsMultiSelect({
  selectedModels,
  onChange,
  placeholder = "Select compatible models...",
  className = "",
}: ModelsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [availableModels, setAvailableModels] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(false);

  // Load models from backend
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const { invoke } = await import("@tauri-apps/api/core");
        const models = await invoke<ModelProvider[]>(
          "metadata_get_model_providers"
        );
        setAvailableModels(models);
      } catch (error) {
        console.error("Failed to load model providers:", error);
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // Filter models based on search term
  const filteredModels = availableModels.filter(
    (model) =>
      model.active &&
      (model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelProvider[]>);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      onChange(selectedModels.filter((id) => id !== modelId));
    } else {
      onChange([...selectedModels, modelId]);
    }
  };

  const removeModel = (modelId: string) => {
    onChange(selectedModels.filter((id) => id !== modelId));
  };

  const getModelName = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    return model ? model.name : modelId;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Models Display */}
      <div
        className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[42px] bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer"
        onClick={() => {
          setIsOpen(!isOpen);
          inputRef.current?.focus();
        }}
      >
        {selectedModels.length > 0 ? (
          selectedModels.map((modelId) => (
            <span
              key={modelId}
              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
            >
              {getModelName(modelId)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeModel(modelId);
                }}
                className="text-green-600 hover:text-green-800 focus:outline-none"
                aria-label={`Remove ${getModelName(modelId)}`}
              >
                <X size={14} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-500 text-sm py-1">{placeholder}</span>
        )}

        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search models..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Models List */}
          <div className="max-h-48 overflow-y-auto">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No models found
              </div>
            ) : (
              Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider}>
                  {/* Provider Header */}
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 uppercase tracking-wide">
                    {provider}
                  </div>

                  {/* Provider Models */}
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => toggleModel(model.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                    >
                      <span>{model.name}</span>
                      {selectedModels.includes(model.id) && (
                        <Check size={16} className="text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {selectedModels.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {selectedModels.length} model
                  {selectedModels.length !== 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
