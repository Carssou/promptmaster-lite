import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Save, ArrowLeft, Eye, EyeOff, History, Zap } from 'lucide-react';
import { PromptEditor } from '../components/editor/PromptEditor';
import { LivePreview } from '../components/editor/LivePreview';
import { PromptDiff } from '../components/editor/PromptDiff';
import { VersionHistory } from '../components/version/VersionHistory';
import { VariablePanel } from '../components/variables/VariablePanel';
import { validateVariables } from '../services/variableParser';
// import { invoke } from '@tauri-apps/api/core';

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
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

export function EditorScreen() {
  const { promptId } = useParams<{ promptId: string }>();
  const navigate = useNavigate();
  
  // State
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [diffVersions, setDiffVersions] = useState<{ a: Version; b: Version } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState<any[]>([]);

  // Load prompt data
  useEffect(() => {
    const loadPrompt = async () => {
      if (!promptId) return;
      
      try {
        setLoading(true);
        
        // Mock data for now - will be replaced with IPC calls
        const mockPrompt: Prompt = {
          uuid: promptId,
          title: 'Sample Prompt',
          content: `---
uuid: ${promptId}
version: "1.0.0"
title: "Sample Prompt"
tags: ["example", "test"]
variables:
  user_name: "John Doe"
  task_type: "analysis"
created: 2025-07-06
modified: 2025-07-06
---

# {{task_type}} Task

Hello {{user_name}}, 

Please perform the following {{task_type}}:

{{task_description}}

## Requirements
- Be thorough and detailed
- Use examples where applicable
- Consider edge cases

Thank you!`,
          tags: ['example', 'test'],
          created_at: '2025-07-06T08:00:00Z',
          modified_at: '2025-07-06T08:00:00Z',
          version: '1.0.0'
        };
        
        setPrompt(mockPrompt);
        setEditorContent(mockPrompt.content);
        
        // Initialize variables from content
        setVariables({
          user_name: 'John Doe',
          task_type: 'analysis',
          task_description: 'Analyze the provided data and create a comprehensive report'
        });
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
    
    try {
      setSaving(true);
      
      // Mock save operation - will be replaced with IPC call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update prompt with new content
      const updatedPrompt = {
        ...prompt,
        content: editorContent,
        modified_at: new Date().toISOString()
      };
      
      setPrompt(updatedPrompt);
      setHasUnsavedChanges(false);
      
      // Show success toast (would be implemented with a toast system)
      console.log('Prompt saved successfully');
      
    } catch (error) {
      console.error('Error saving prompt:', error);
      // Show error toast
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
    try {
      // Mock rollback operation - will be replaced with IPC call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEditorContent(version.body);
      setViewMode('edit');
      
      console.log(`Rolled back to version ${version.semver}`);
    } catch (error) {
      console.error('Error rolling back version:', error);
    }
  }, []);

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
              // Enter diff mode with mock versions
              const mockVersionA = {
                uuid: 'v1',
                semver: '1.0.0',
                created_at: '2025-07-06T08:21:00Z',
                body: 'Previous version of the prompt...\n\n# Old Task\n\nThis was the old content.',
                isLatest: false
              };
              const mockVersionB = {
                uuid: 'v2',
                semver: '1.0.1',
                created_at: '2025-07-06T08:32:00Z',
                body: editorContent,
                isLatest: true
              };
              setDiffVersions({ a: mockVersionA, b: mockVersionB });
              setViewMode('diff');
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
  }, [handleSave, viewMode]);

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
              <h1 className="text-xl font-semibold text-gray-900">{prompt.title}</h1>
              <p className="text-sm text-gray-500">
                v{prompt.version} • {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
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
          {showVersionHistory && (
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