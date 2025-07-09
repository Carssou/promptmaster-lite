import { useRef, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { X, Copy, Download } from 'lucide-react';
import * as monaco from 'monaco-editor';
import { DiffSkeleton } from '../ui/Skeleton';

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
}

interface PromptDiffProps {
  versionA: Version;
  versionB: Version;
  onClose: () => void;
  height?: string;
}

export function PromptDiff({ versionA, versionB, onClose, height = '600px' }: PromptDiffProps) {
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [, setIsEditorReady] = useState(false);
  const [diffStats, setDiffStats] = useState<{
    additions: number;
    deletions: number;
    total: number;
  } | null>(null);

  // Determine which version is newer
  const newerVersion = new Date(versionA.created_at) > new Date(versionB.created_at) ? versionA : versionB;
  const olderVersion = newerVersion === versionA ? versionB : versionA;

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneDiffEditor, monaco: typeof import('monaco-editor')) => {
    diffEditorRef.current = editor;
    setIsEditorReady(true);

    // Define custom theme for high contrast diff colors
    monaco.editor.defineTheme('diff-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'ffffff' }, // White text
      ],
      colors: {
        'diffEditor.insertedTextBackground': '#1e4620', // Dark green for additions
        'diffEditor.removedTextBackground': '#4b1818', // Dark red for deletions  
        'diffEditor.insertedLineBackground': '#0e2f13', // Darker green for line background
        'diffEditor.removedLineBackground': '#2b1111', // Darker red for line background
        'diffEditor.border': '#444444',
        'editor.background': '#1e1e1e',
        'editor.foreground': '#ffffff'
      }
    });
    
    monaco.editor.setTheme('diff-theme');

    // Calculate diff statistics
    const changes = editor.getLineChanges();
    if (changes) {
      const stats = changes.reduce((acc, change) => {
        if (change.modifiedEndLineNumber > 0) {
          acc.additions += change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
        }
        if (change.originalEndLineNumber > 0) {
          acc.deletions += change.originalEndLineNumber - change.originalStartLineNumber + 1;
        }
        return acc;
      }, { additions: 0, deletions: 0, total: 0 });
      
      stats.total = stats.additions + stats.deletions;
      setDiffStats(stats);
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      onClose();
    });

    editor.addCommand(monaco.KeyCode.Escape, () => {
      onClose();
    });
  };

  const handleCopyDiff = async () => {
    if (!diffEditorRef.current) return;

    try {
      const model = diffEditorRef.current.getModel();
      if (model) {
        const originalText = model.original.getValue();
        const modifiedText = model.modified.getValue();
        
        const diffText = `--- ${olderVersion.semver} (${formatDate(olderVersion.created_at)})
+++ ${newerVersion.semver} (${formatDate(newerVersion.created_at)})
@@ Original @@
${originalText}

@@ Modified @@
${modifiedText}`;
        
        await navigator.clipboard.writeText(diffText);
        // Could show a toast here
      }
    } catch (error) {
      console.error('Failed to copy diff:', error);
    }
  };

  const handleDownloadDiff = () => {
    if (!diffEditorRef.current) return;

    const model = diffEditorRef.current.getModel();
    if (model) {
      const originalText = model.original.getValue();
      const modifiedText = model.modified.getValue();
      
      const diffText = `--- ${olderVersion.semver} (${formatDate(olderVersion.created_at)})
+++ ${newerVersion.semver} (${formatDate(newerVersion.created_at)})
@@ Original @@
${originalText}

@@ Modified @@
${modifiedText}`;
      
      const blob = new Blob([diffText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diff-${olderVersion.semver}-${newerVersion.semver}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if content is too large for diff (>2MB)
  const totalSize = olderVersion.body.length + newerVersion.body.length;
  const isTooLarge = totalSize > 2 * 1024 * 1024; // 2MB

  if (isTooLarge) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Diff Too Large</h3>
          <p className="text-gray-600 mb-4">
            The content is too large to display in the diff viewer ({Math.round(totalSize / 1024)}KB).
          </p>
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold text-gray-900">
            {olderVersion.semver} → {newerVersion.semver}
          </h3>
          
          {diffStats && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600">+{diffStats.additions}</span>
              <span className="text-red-600">-{diffStats.deletions}</span>
              <span className="text-gray-500">({diffStats.total} changes)</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyDiff}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Copy diff to clipboard"
          >
            <Copy size={18} />
          </button>
          
          <button
            onClick={handleDownloadDiff}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Download diff as file"
          >
            <Download size={18} />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Close diff (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Version Info */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Original: {formatDate(olderVersion.created_at)}</span>
            <span>Modified: {formatDate(newerVersion.created_at)}</span>
          </div>
          <div className="text-xs text-gray-500">
            Press Esc or Cmd+D to close
          </div>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height={height}
          language="markdown"
          loading={<DiffSkeleton className="h-full" />}
          theme="vs-dark"
          original={olderVersion.body}
          modified={newerVersion.body}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            renderSideBySide: false,
            ignoreTrimWhitespace: true,
            renderOverviewRuler: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            diffWordWrap: 'on',
            enableSplitViewResizing: true,
            renderIndicators: true,
            folding: false,
            lineNumbers: 'on',
            glyphMargin: false,
            // Theme is set in handleEditorDidMount
          }}
        />
      </div>

      {/* Footer with shortcuts */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>⌘+D: Close diff</span>
            <span>Esc: Close diff</span>
          </div>
          <div>
            Monaco Diff Editor
          </div>
        </div>
      </div>
    </div>
  );
}