/**
 * Basic extensibility hooks for PromptMaster Lite
 * Simple, lightweight system for future plugin support
 */

import { MetadataSchema } from './metadataSchema';

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
  // New metadata schema hooks
  onMetadataSchemaRegister?: (schema: MetadataSchema) => void;
  onMetadataSchemaUnregister?: (schemaName: string) => void;
  onMetadataValidate?: (metadata: Record<string, any>) => Record<string, string>;
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

  /**
   * Execute metadata schema registration hooks
   */
  executeMetadataSchemaRegister(schema: MetadataSchema): void {
    this.callbacks.forEach(cb => {
      try {
        cb.onMetadataSchemaRegister?.(schema);
      } catch (error) {
        console.warn('Hook onMetadataSchemaRegister error:', error);
      }
    });
  }

  /**
   * Execute metadata schema unregistration hooks
   */
  executeMetadataSchemaUnregister(schemaName: string): void {
    this.callbacks.forEach(cb => {
      try {
        cb.onMetadataSchemaUnregister?.(schemaName);
      } catch (error) {
        console.warn('Hook onMetadataSchemaUnregister error:', error);
      }
    });
  }

  /**
   * Execute metadata validation hooks and collect additional errors
   */
  executeMetadataValidate(metadata: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};
    
    this.callbacks.forEach(cb => {
      try {
        const callbackErrors = cb.onMetadataValidate?.(metadata) || {};
        Object.assign(errors, callbackErrors);
      } catch (error) {
        console.warn('Hook onMetadataValidate error:', error);
      }
    });
    
    return errors;
  }
}

// Global hooks manager
export const hooks = new SimpleHooksManager();