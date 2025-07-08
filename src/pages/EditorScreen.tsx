import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Save, ArrowLeft, Eye, EyeOff, History, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { PromptEditor } from '../components/editor/PromptEditor';
import { LivePreview } from '../components/editor/LivePreview';
import { PromptDiff } from '../components/editor/PromptDiff';
import { VersionHistory } from '../components/version/VersionHistory';
import { VariablePanel } from '../components/variables/VariablePanel';
import { validateVariables } from '../services/variableParser';
import { invoke } from '@tauri-apps/api/core';

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

type ViewMode = 'edit' | 'preview' | 'diff';

// Helper function to calculate next patch version
const getNextVersion = (currentVersion: string | undefined): string => {
  if (!currentVersion) {
    return '1.0.0';
  }
  const versionParts = currentVersion.split('.').map(Number);
  if (versionParts.length === 3 && versionParts.every(n => !isNaN(n))) {
    return `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
  }
  return currentVersion;
};

export function EditorScreen() {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();
  
  // State
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffVersions, setDiffVersions] = useState<{ a: Version; b: Version } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState<any[]>([]);
  
  // Future feature flag for version bump confirmation
  const ENABLE_VERSION_BUMP_CONFIRMATION = false;

  // Load prompt data
  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) return;
      
      try {
        setLoading(true);
        
        // Load prompt from database
        const promptList = await invoke<Prompt[]>('list_prompts');
        const currentPrompt = promptList.find(p => p.uuid === promptId);
        
        if (!currentPrompt) {
          console.error('Prompt not found');
          return;
        }
        
        setPrompt(currentPrompt);
        
        // Load latest version content and info
        try {
          const [latestVersionBody, versionList] = await Promise.all([
            invoke<string | null>('get_latest_version', { promptUuid: promptId }),
            invoke<Array<{uuid: string, semver: string, created_at: string}>>('list_versions', { promptUuid: promptId })
          ]);
          
          if (latestVersionBody && versionList.length > 0) {
            setEditorContent(latestVersionBody);
            // Update prompt with latest version info
            setPrompt({
              ...currentPrompt,
              version: versionList[0].semver // First item is latest due to ORDER BY created_at DESC
            });
          } else {
            // No versions found, use the prompt's content or create first version
            console.log('No versions found, using prompt content as fallback');
            setEditorContent(currentPrompt.content || '# New Prompt\n\nStart writing your prompt here...');
          }
          
          // Version list will be loaded by VersionHistory component
        } catch (versionError) {
          console.log('Error loading versions, using prompt content as fallback');
          setEditorContent(currentPrompt.content || '# New Prompt\n\nStart writing your prompt here...');
        }
        
        // Variables will be automatically detected from content by VariablePanel
      } catch (error) {
        console.error('Error loading prompt:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrompt();
  }, [promptId]);

  // Validate variables and update markers
  useEffect(() => {
    const issues = validateVariables(editorContent);
    const markers = issues.map(issue => ({
      message: issue.message,
      severity: issue.severity,
      startLineNumber: issue.line,
      endLineNumber: issue.line,
      startColumn: issue.column,
      endColumn: issue.column + 10
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
  const handleVariableChange = useCallback((newVariables: Record<string, string>) => {
    setVariables(newVariables);
  }, []);

  // Save prompt
  const handleSave = async () => {
    if (!prompt || saving) return;
    
    // Future feature: Version bump confirmation
    if (ENABLE_VERSION_BUMP_CONFIRMATION && hasUnsavedChanges) {
      const nextVersion = getNextVersion(prompt.version);
      const confirmed = window.confirm(
        `Save changes as new version v${nextVersion}?`
      );
      if (!confirmed) return;
    }
    
    try {
      setSaving(true);
      
      // Save new version using IPC
      const newVersion = await invoke<BackendVersion>('save_new_version', {
        promptUuid: prompt.uuid,
        body: editorContent
      });
      
      // Update prompt with new content and version
      const updatedPrompt = {
        ...prompt,
        content: editorContent,
        version: newVersion.semver,
        modified_at: newVersion.created_at
      };
      
      setPrompt(updatedPrompt);
      setHasUnsavedChanges(false);
      
      // Show success toast with version information
      toast.success(`Saved successfully as v${newVersion.semver}`, {
        duration: 3000,
        icon: '💾',
      });
      
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Failed to save prompt. Please try again.', {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle version selection
  const handleVersionSelect = useCallback((version: Version) => {
    setEditorContent(version.body);
    setViewMode('edit');
  }, []);

  // Handle version diff
  const handleVersionDiff = useCallback((versionA: Version, versionB: Version) => {
    setDiffVersions({ a: versionA, b: versionB });
    setViewMode('diff');
  }, []);

  // Handle version rollback
  const handleVersionRollback = useCallback(async (version: Version) => {
    console.log('handleVersionRollback called with version:', version);
    
    if (!prompt) {
      console.log('No prompt available, aborting rollback');
      return;
    }
    
    try {
      console.log('Calling rollback_to_version IPC with versionUuid:', version.uuid);
      
      // Call the backend rollback function
      const newVersion = await invoke<BackendVersion>('rollback_to_version', {
        versionUuid: version.uuid
      });
      
      console.log('Rollback IPC successful, new version:', newVersion);
      
      // Update the editor content with the rolled back content
      setEditorContent(newVersion.body);
      setViewMode('edit');
      
      // Update the prompt with the new version info
      const updatedPrompt = {
        ...prompt,
        content: newVersion.body,
        version: newVersion.semver,
        modified_at: newVersion.created_at
      };
      
      setPrompt(updatedPrompt);
      setHasUnsavedChanges(false);
      
      // Show success message
      toast.success(`Rolled back to ${version.semver}, created new version ${newVersion.semver}`, {
        duration: 4000,
        icon: '↩️',
      });
      
      console.log(`Rolled back to version ${version.semver}, created new version ${newVersion.semver}`);
    } catch (error) {
      console.error('Error rolling back version:', error);
      toast.error('Failed to rollback version. Please try again.', {
        duration: 4000,
        icon: '❌',
      });
    }
  }, [prompt]);

  // Handle auto-diff (Cmd+D) - compare current content with previous version
  const handleAutoDiff = useCallback(async () => {
    if (!prompt) return;
    
    try {
      // Get version list to find the previous version
      const versionList = await invoke<Array<{uuid: string, semver: string, created_at: string}>>('list_versions', { 
        promptUuid: prompt.uuid 
      });
      
      if (versionList.length < 2) {
        toast('No previous version available for comparison', {
          duration: 3000,
          icon: '📄',
        });
        return;
      }
      
      // Get the previous version (second item in the list)
      const previousVersionInfo = versionList[1];
      const previousVersion = await invoke<BackendVersion | null>('get_version_by_uuid', {
        versionUuid: previousVersionInfo.uuid
      });
      
      if (!previousVersion) {
        toast.error('Could not load previous version for comparison');
        return;
      }
      
      // Create version objects for diff
      const currentVersionForDiff: Version = {
        uuid: 'current',
        semver: `${prompt.version || '1.0.0'} (current)`,
        created_at: new Date().toISOString(),
        body: editorContent,
        isLatest: true
      };
      
      const previousVersionForDiff: Version = {
        uuid: previousVersion.uuid,
        semver: previousVersion.semver,
        created_at: previousVersion.created_at,
        body: previousVersion.body,
        isLatest: false
      };
      
      // Set diff mode
      setDiffVersions({ a: previousVersionForDiff, b: currentVersionForDiff });
      setViewMode('diff');
      
      toast.success(`Comparing ${previousVersion.semver} → current`, {
        duration: 2000,
        icon: '🔍',
      });
      
    } catch (error) {
      console.error('Error loading previous version for diff:', error);
      toast.error('Failed to load previous version for comparison');
    }
  }, [prompt, editorContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'd':
            e.preventDefault();
            if (viewMode === 'diff') {
              setViewMode('edit');
              setDiffVersions(null);
            } else {
              // Auto-diff current content vs previous version
              handleAutoDiff();
            }
            break;
          case 'Enter':
            e.preventDefault();
            // Future: Run prompt
            break;
        }
      }
      
      if (e.key === 'Escape') {
        if (viewMode === 'diff') {
          setViewMode('edit');
          setDiffVersions(null);
        }
      }
    };

    // Listen for editor save events
    const handleEditorSave = () => {
      handleSave();
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('editor-save', handleEditorSave);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('editor-save', handleEditorSave);
    };
  }, [handleSave, handleAutoDiff, viewMode]);

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
            onClick={() => navigate('/')}
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
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{prompt?.title || 'Loading...'}</h1>
              <p className="text-sm text-gray-500">
                v{prompt?.version || '1.0.0'} • {hasUnsavedChanges ? `Will save as v${getNextVersion(prompt?.version)}` : 'Saved'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className={`p-2 rounded transition-colors ${
                showVersionHistory 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Version History"
            >
              <History size={20} />
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'preview' ? 'edit' : 'preview')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'preview' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title={viewMode === 'preview' ? 'Edit Mode' : 'Preview Mode'}
            >
              {viewMode === 'preview' ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`p-2 rounded transition-colors ${
                showVariables 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Variables Panel"
            >
              <Zap size={20} />
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
                saving || !hasUnsavedChanges
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
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
              <Panel defaultSize={25} minSize={20} maxSize={40}>
                <VersionHistory
                  promptUuid={prompt.uuid}
                  currentVersion={prompt.version}
                  onVersionSelect={handleVersionSelect}
                  onVersionDiff={handleVersionDiff}
                  onVersionRollback={handleVersionRollback}
                  className="h-full"
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 transition-colors" />
            </>
          )}

          {/* Editor/Preview Area */}
          <Panel defaultSize={showVariables ? 60 : 75} minSize={40}>
            <div className="h-full flex flex-col">
              {viewMode === 'diff' && diffVersions ? (
                <PromptDiff
                  versionA={diffVersions.a}
                  versionB={diffVersions.b}
                  onClose={() => {
                    setViewMode('edit');
                    setDiffVersions(null);
                  }}
                />
              ) : viewMode === 'preview' ? (
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
                    onChange={handleEditorChange}
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
              <Panel defaultSize={25} minSize={20} maxSize={40}>
                <VariablePanel
                  content={editorContent}
                  variables={variables}
                  onChange={handleVariableChange}
                  className="h-full"
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>⌘+S: Save</span>
            <span>⌘+D: Toggle diff</span>
            <span>⌘+↵: Run prompt</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{editorContent.length} characters</span>
            <span>{editorContent.split('\n').length} lines</span>
            {editorMarkers.length > 0 && (
              <span className="text-red-500">
                {editorMarkers.length} validation {editorMarkers.length === 1 ? 'issue' : 'issues'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}