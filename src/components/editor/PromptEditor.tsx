import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useDebounce } from '../../hooks/useDebounce';
import { usePerformanceMonitor, PerformanceProfiler } from '../../hooks/usePerformanceMonitor';
import { EditorSkeleton } from '../ui/Skeleton';
import { hooks } from '../../services/hooks';

interface Marker {
  message: string;
  severity: 'error' | 'warning' | 'info';
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  markers?: Marker[];
  debounceMs?: number;
  promptUuid?: string; // For hooks integration
}

function PromptEditorComponent({ 
  value, 
  onChange, 
  readOnly = false, 
  markers = [],
  debounceMs = 300,
  promptUuid
}: PromptEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  // Performance monitoring
  const { trackKeystroke } = usePerformanceMonitor('PromptEditor');
  
  // Debounce the onChange callback to reduce re-renders
  const debouncedOnChange = useDebounce((newValue: string) => {
    onChange(newValue);
    // Execute content change hooks
    if (promptUuid) {
      hooks.executeContentChange(newValue, promptUuid);
    }
  }, debounceMs);

  // Memoize completion provider to avoid recreation on every mount
  const completionProvider = useMemo(() => ({
    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      return {
        suggestions: [
          {
            label: 'frontmatter',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '---',
              'uuid: "${1:uuid}"',
              'version: "${2:1.0.0}"',
              'title: "${3:Title}"',
              'tags: [${4:"tag1", "tag2"}]',
              'variables:',
              '  ${5:variable_name}: "${6:default_value}"',
              'created: ${7:2025-07-06}',
              'modified: ${8:2025-07-06}',
              '---',
              '',
              '${9:Your prompt content here...}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: 'YAML frontmatter template for prompts'
          },
          {
            label: 'variable',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: '{{${1:variable_name}}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: 'Variable placeholder with double braces'
          }
        ]
      };
    }
  }), []);

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);

    // Configure markdown snippets with memoized provider
    monaco.languages.registerCompletionItemProvider('markdown', completionProvider);

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // This will be handled by the parent component
      const saveEvent = new CustomEvent('editor-save', { detail: { value: editor.getValue() } });
      window.dispatchEvent(saveEvent);
    });
  }, [completionProvider]);

  // Memoize monaco markers to avoid recreation
  const monacoMarkers = useMemo(() => {
    if (!monacoRef.current) return [];
    
    // Combine provided markers with hook markers
    const hookMarkers = hooks.getEditorMarkers(value);
    const allMarkers = [...markers, ...hookMarkers];
    
    return allMarkers.map(marker => ({
      ...marker,
      severity: marker.severity === 'error' 
        ? monacoRef.current!.MarkerSeverity.Error 
        : marker.severity === 'warning'
        ? monacoRef.current!.MarkerSeverity.Warning
        : monacoRef.current!.MarkerSeverity.Info
    }));
  }, [markers, value]);

  // Update markers when they change
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    monacoRef.current.editor.setModelMarkers(model, 'prompteditor', monacoMarkers);
  }, [monacoMarkers, isEditorReady]);

  // Update value when prop changes (but not when typing)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  return (
    <PerformanceProfiler id="PromptEditor">
      <div className="h-full w-full border border-gray-300 rounded-lg overflow-hidden" data-testid="prompt-editor">
        <div className="h-full">
          <Editor
            height="600px"
            width="100%"
            defaultLanguage="markdown"
            theme="vs-dark"
            value={value}
            onChange={(val) => {
              trackKeystroke(() => {
                const newValue = val || '';
                setLocalValue(newValue);
                debouncedOnChange(newValue);
              });
            }}
            onMount={handleEditorDidMount}
            loading={<EditorSkeleton className="h-full" />}
            options={{
              readOnly,
              wordWrap: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              folding: true,
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              selectionHighlight: false,
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnPaste: true,
              formatOnType: true,
              suggest: {
                showKeywords: false,
                showSnippets: true,
                showFunctions: false,
                showVariables: true
              }
            }}
          />
        </div>
      </div>
    </PerformanceProfiler>
  );
}

export const PromptEditor = memo(PromptEditorComponent);