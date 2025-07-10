/**
 * Basic extensibility hooks for PromptMaster Lite
 * Simple, lightweight system for future plugin support
 */

export interface EditorMarker {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface HookCallbacks {
  onSave?: (content: string, promptUuid: string) => void;
  onContentChange?: (content: string, promptUuid: string) => void;
  onVersionCreated?: (version: string, promptUuid: string) => void;
  getEditorMarkers?: (content: string) => EditorMarker[];
}

class SimpleHooksManager {
  private callbacks: HookCallbacks[] = [];

  /**
   * Register hook callbacks
   */
  register(callbacks: HookCallbacks): () => void {
    this.callbacks.push(callbacks);
    
    // Return unregister function
    return () => {
      const index = this.callbacks.indexOf(callbacks);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Execute onSave hooks
   */
  executeSave(content: string, promptUuid: string): void {
    this.callbacks.forEach(cb => {
      try {
        cb.onSave?.(content, promptUuid);
      } catch (error) {
        console.warn('Hook onSave error:', error);
      }
    });
  }

  /**
   * Execute onContentChange hooks
   */
  executeContentChange(content: string, promptUuid: string): void {
    this.callbacks.forEach(cb => {
      try {
        cb.onContentChange?.(content, promptUuid);
      } catch (error) {
        console.warn('Hook onContentChange error:', error);
      }
    });
  }

  /**
   * Execute onVersionCreated hooks
   */
  executeVersionCreated(version: string, promptUuid: string): void {
    this.callbacks.forEach(cb => {
      try {
        cb.onVersionCreated?.(version, promptUuid);
      } catch (error) {
        console.warn('Hook onVersionCreated error:', error);
      }
    });
  }

  /**
   * Get all editor markers from registered callbacks
   */
  getEditorMarkers(content: string): EditorMarker[] {
    const markers: EditorMarker[] = [];
    
    this.callbacks.forEach(cb => {
      try {
        const callbackMarkers = cb.getEditorMarkers?.(content) || [];
        markers.push(...callbackMarkers);
      } catch (error) {
        console.warn('Hook getEditorMarkers error:', error);
      }
    });
    
    return markers;
  }
}

// Global hooks manager
export const hooks = new SimpleHooksManager();