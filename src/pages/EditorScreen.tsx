import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  History,
  Zap,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { PromptEditor } from "../components/editor/PromptEditor";
import { LivePreview } from "../components/editor/LivePreview";
import { PromptDiff } from "../components/editor/PromptDiff";
import { VersionHistory } from "../components/version/VersionHistory";
import { VariablePanel } from "../components/variables/VariablePanel";
import { KeyboardShortcutsModal } from "../components/help/KeyboardShortcutsModal";
import { DynamicMetadataSidebar } from "../components/metadata/DynamicMetadataSidebar";
import { validateVariables } from "../services/variableParser";
import { getModifierKey } from "../hooks/useHotkeys";
import { invoke } from "@tauri-apps/api/core";

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
}

interface BackendVersion {
  uuid: string;
  prompt_uuid: string;
  semver: string;
  body: string;
  metadata?: string;
  created_at: string;
  parent_uuid?: string;
}

interface Prompt {
  uuid: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  modified_at: string;
  version: string;
}

type ViewMode = "edit" | "preview" | "diff";

// Helper function to calculate next patch version
const getNextVersion = (currentVersion: string | undefined): string => {
  if (!currentVersion) {
    return "1.0.0";
  }
  const versionParts = currentVersion.split(".").map(Number);
  if (versionParts.length === 3 && versionParts.every((n) => !isNaN(n))) {
    return `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
  }
  return currentVersion;
};

export function EditorScreen() {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();

  // Platform-specific modifier key
  const modifierKey = getModifierKey();
  const modifierSymbol = modifierKey === "cmd" ? "⌘" : "Ctrl";

  // State
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [diffVersions, setDiffVersions] = useState<{
    a: Version;
    b: Version;
  } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMetadataSidebar, setShowMetadataSidebar] = useState(false);

  // Load prompt data
  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) return;

      try {
        setLoading(true);

        // Load prompt from database
        const promptList = await invoke<Prompt[]>("list_prompts");
        const currentPrompt = promptList.find((p) => p.uuid === promptId);

        if (!currentPrompt) {
          console.error("Prompt not found");
          return;
        }

        setPrompt(currentPrompt);

        // Load latest version content and info
        try {
          const [latestVersionBody, versionList] = await Promise.all([
            invoke<string | null>("get_latest_version", {
              promptUuid: promptId,
            }),
            invoke<Array<{ uuid: string; semver: string; created_at: string }>>(
              "list_versions",
              { promptUuid: promptId }
            ),
          ]);

          if (latestVersionBody && versionList.length > 0) {
            setEditorContent(latestVersionBody);
            setPrompt({
              ...currentPrompt,
              version: versionList[0].semver,
            });
          } else {
            setEditorContent(
              currentPrompt.content ||
                "# New Prompt\n\nStart writing your prompt here..."
            );
          }
        } catch (versionError) {
          console.log(
            "Error loading versions, using prompt content as fallback"
          );
          setEditorContent(
            currentPrompt.content ||
              "# New Prompt\n\nStart writing your prompt here..."
          );
        }
      } catch (error) {
        console.error("Error loading prompt:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPrompt();
  }, [promptId]);

  // Validate variables and update markers
  useEffect(() => {
    const issues = validateVariables(editorContent);
    const markers = issues.map((issue) => ({
      message: issue.message,
      severity: issue.severity,
      startLineNumber: issue.line,
      endLineNumber: issue.line,
      startColumn: issue.column,
      endColumn: issue.column + 10,
    }));

    setEditorMarkers(markers);
  }, [editorContent]);

  // Track unsaved changes
  useEffect(() => {
    if (prompt) {
      setHasUnsavedChanges(editorContent !== prompt.content);
    }
  }, [editorContent, prompt]);

  // Handle editor content changes
  const handleEditorChange = useCallback((value: string) => {
    setEditorContent(value);
  }, []);

  // Handle variable changes
  const handleVariableChange = useCallback(
    (newVariables: Record<string, string>) => {
      setVariables(newVariables);
    },
    []
  );

  // Save prompt
  const handleSave = async () => {
    if (!prompt || saving) return;

    try {
      setSaving(true);

      const newVersion = await invoke<BackendVersion>("save_new_version", {
        promptUuid: prompt.uuid,
        body: editorContent,
      });

      const updatedPrompt = {
        ...prompt,
        content: editorContent,
        version: newVersion.semver,
        modified_at: newVersion.created_at,
      };

      setPrompt(updatedPrompt);
      setHasUnsavedChanges(false);

      toast.success(`Saved as v${newVersion.semver}`, {
        duration: 3000,
        icon: "💾",
      });
    } catch (error) {
      console.error("Error saving prompt:", error);
      const errorMessage =
        typeof error === "string"
          ? error
          : "Failed to save prompt. Please try again.";
      toast.error(errorMessage, {
        duration: 6000,
        icon: "❌",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle version selection
  const handleVersionSelect = useCallback((version: Version) => {
    setEditorContent(version.body);
    setViewMode("edit");
  }, []);

  // Handle version diff
  const handleVersionDiff = useCallback(
    (versionA: Version, versionB: Version) => {
      setDiffVersions({ a: versionA, b: versionB });
      setViewMode("diff");
    },
    []
  );

  // Handle version rollback
  const handleVersionRollback = useCallback(
    async (version: Version) => {
      if (!prompt) return;

      try {
        const newVersion = await invoke<BackendVersion>("rollback_to_version", {
          versionUuid: version.uuid,
        });

        setEditorContent(newVersion.body);
        setViewMode("edit");

        const updatedPrompt = {
          ...prompt,
          content: newVersion.body,
          version: newVersion.semver,
          modified_at: newVersion.created_at,
        };

        setPrompt(updatedPrompt);
        setHasUnsavedChanges(false);

        toast.success(
          `Rolled back to ${version.semver}, created v${newVersion.semver}`,
          {
            duration: 4000,
            icon: "↩️",
          }
        );
      } catch (error) {
        console.error("Error rolling back version:", error);
        const errorMessage =
          typeof error === "string"
            ? error
            : "Failed to rollback version. Please try again.";
        toast.error(errorMessage, {
          duration: 6000,
          icon: "❌",
        });
      }
    },
    [prompt]
  );

  // Memoize handlers to prevent unnecessary re-renders
  const memoizedHandlers = useMemo(
    () => ({
      onVersionSelect: handleVersionSelect,
      onVersionDiff: handleVersionDiff,
      onVersionRollback: handleVersionRollback,
      onEditorChange: handleEditorChange,
      onVariableChange: handleVariableChange,
    }),
    [
      handleVersionSelect,
      handleVersionDiff,
      handleVersionRollback,
      handleEditorChange,
      handleVariableChange,
    ]
  );

  // Handle auto-diff (Cmd+D)
  const handleAutoDiff = useCallback(async () => {
    if (!prompt) return;

    try {
      const versionList = await invoke<
        Array<{ uuid: string; semver: string; created_at: string }>
      >("list_versions", {
        promptUuid: prompt.uuid,
      });

      if (versionList.length < 2) {
        toast("No previous version available for comparison", {
          duration: 3000,
          icon: "📄",
        });
        return;
      }

      const previousVersionInfo = versionList[1];
      const previousVersion = await invoke<BackendVersion | null>(
        "get_version_by_uuid",
        {
          versionUuid: previousVersionInfo.uuid,
        }
      );

      if (!previousVersion) {
        toast.error("Could not load previous version for comparison");
        return;
      }

      const currentVersionForDiff: Version = {
        uuid: "current",
        semver: `${prompt.version || "1.0.0"} (current)`,
        created_at: new Date().toISOString(),
        body: editorContent,
        isLatest: true,
      };

      const previousVersionForDiff: Version = {
        uuid: previousVersion.uuid,
        semver: previousVersion.semver,
        created_at: previousVersion.created_at,
        body: previousVersion.body,
        isLatest: false,
      };

      setDiffVersions({ a: previousVersionForDiff, b: currentVersionForDiff });
      setViewMode("diff");

      toast.success(`Comparing ${previousVersion.semver} → current`, {
        duration: 2000,
        icon: "🔍",
      });
    } catch (error) {
      console.error("Error loading previous version for diff:", error);
      toast.error("Failed to load previous version for comparison");
    }
  }, [prompt, editorContent]);

  // Handle metadata save
  const handleMetadataSave = async (data: any) => {
    if (!prompt) return;

    try {
      console.log("Saving metadata:", data);
      toast.success("Metadata saved successfully!", {
        duration: 3000,
        icon: "📝",
      });
    } catch (error) {
      console.error("Error saving metadata:", error);
      toast.error("Failed to save metadata. Please try again.", {
        duration: 6000,
        icon: "❌",
      });
      throw error;
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            handleSave();
            break;
          case "d":
            e.preventDefault();
            if (viewMode === "diff") {
              setViewMode("edit");
              setDiffVersions(null);
            } else {
              handleAutoDiff();
            }
            break;
          case "/":
          case "?":
            e.preventDefault();
            setShowHelpModal(true);
            break;
          case "b":
            e.preventDefault();
            setShowVersionHistory(!showVersionHistory);
            break;
          case "k":
            e.preventDefault();
            setViewMode(viewMode === "preview" ? "edit" : "preview");
            break;
          case "i":
            e.preventDefault();
            setShowMetadataSidebar(!showMetadataSidebar);
            break;
        }
      }

      if (e.key === "Escape") {
        if (showMetadataSidebar) {
          setShowMetadataSidebar(false);
        } else if (showHelpModal) {
          setShowHelpModal(false);
        } else if (viewMode === "diff") {
          setViewMode("edit");
          setDiffVersions(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [
    handleSave,
    handleAutoDiff,
    viewMode,
    showHelpModal,
    showMetadataSidebar,
    showVersionHistory,
  ]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Prompt not found</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {prompt?.title || "Loading..."}
              </h1>
              <p className="text-sm text-gray-500">
                v{prompt?.version || "1.0.0"} •{" "}
                {hasUnsavedChanges
                  ? `Will save as v${getNextVersion(prompt?.version)}`
                  : "Saved"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={`p-2 rounded-md transition-colors ${
                showVersionHistory
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="Version History"
            >
              <History size={20} />
            </button>

            <button
              onClick={() =>
                setViewMode(viewMode === "preview" ? "edit" : "preview")
              }
              className={`p-2 rounded-md transition-colors ${
                viewMode === "preview"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title={viewMode === "preview" ? "Edit Mode" : "Preview Mode"}
            >
              {viewMode === "preview" ? (
                <Eye size={20} />
              ) : (
                <EyeOff size={20} />
              )}
            </button>

            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`p-2 rounded-md transition-colors ${
                showVariables
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="Variables Panel"
            >
              <Zap size={20} />
            </button>

            <button
              onClick={() => setShowMetadataSidebar(!showMetadataSidebar)}
              className={`p-2 rounded-md transition-colors ${
                showMetadataSidebar
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              title="Metadata"
            >
              <Settings size={20} />
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                saving || !hasUnsavedChanges
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Version History Sidebar */}
          {showVersionHistory && prompt && (
            <>
              <Panel
                defaultSize={showVariables ? 22 : 25}
                minSize={20}
                maxSize={40}
              >
                <VersionHistory
                  promptUuid={prompt.uuid}
                  currentVersion={prompt.version}
                  onVersionSelect={memoizedHandlers.onVersionSelect}
                  onVersionDiff={memoizedHandlers.onVersionDiff}
                  onVersionRollback={memoizedHandlers.onVersionRollback}
                  className="h-full"
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 transition-colors" />
            </>
          )}

          {/* Editor/Preview Area */}
          <Panel
            defaultSize={
              showVersionHistory && showVariables
                ? 56
                : showVersionHistory
                ? 75
                : showVariables
                ? 75
                : 100
            }
            minSize={40}
          >
            <div className="h-full flex flex-col">
              {viewMode === "diff" && diffVersions ? (
                <PromptDiff
                  versionA={diffVersions.a}
                  versionB={diffVersions.b}
                  onClose={() => {
                    setViewMode("edit");
                    setDiffVersions(null);
                  }}
                />
              ) : viewMode === "preview" ? (
                <div className="flex-1 min-h-0">
                  <LivePreview
                    content={editorContent}
                    variables={variables}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <PromptEditor
                    value={editorContent}
                    onChange={memoizedHandlers.onEditorChange}
                    markers={editorMarkers}
                  />
                </div>
              )}
            </div>
          </Panel>

          {/* Variables Panel */}
          {showVariables && (
            <>
              <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 transition-colors" />
              <Panel defaultSize={22} minSize={20} maxSize={40}>
                <VariablePanel
                  content={editorContent}
                  variables={variables}
                  onChange={memoizedHandlers.onVariableChange}
                  className="h-full"
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>{modifierSymbol}+S: Save</span>
            <span>{modifierSymbol}+D: Diff</span>
            <span>{modifierSymbol}+B: History</span>
            <span>{modifierSymbol}+K: Preview</span>
            <span>{modifierSymbol}+?: Help</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{editorContent.length} characters</span>
            <span>{editorContent.split("\n").length} lines</span>
            {editorMarkers.length > 0 && (
              <span className="text-red-500">
                {editorMarkers.length} validation{" "}
                {editorMarkers.length === 1 ? "issue" : "issues"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Metadata Sidebar */}
      {prompt && (
        <DynamicMetadataSidebar
          isOpen={showMetadataSidebar}
          onClose={() => setShowMetadataSidebar(false)}
          versionUuid={prompt.uuid}
          initialData={{
            title: prompt.title,
            tags: prompt.tags,
            models: [],
            categoryPath: "Uncategorized",
            notes: "",
          }}
          onSave={handleMetadataSave}
        />
      )}
    </div>
  );
}
