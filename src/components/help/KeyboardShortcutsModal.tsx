import { X, Command, Zap, Eye, History, Save, GitCompare, ArrowLeft, Play } from 'lucide-react';
import { getModifierKey } from '../../hooks/useHotkeys';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  modifiers: string[];
  description: string;
  icon: React.ReactNode;
  category: 'editing' | 'navigation' | 'view' | 'version';
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modifierKey = getModifierKey();
  const modifierSymbol = modifierKey === 'cmd' ? '⌘' : 'Ctrl';
  
  const shortcuts: Shortcut[] = [
    // Editing
    {
      key: 'S',
      modifiers: [modifierSymbol],
      description: 'Save prompt and create new version',
      icon: <Save size={16} />,
      category: 'editing'
    },
    {
      key: '↵',
      modifiers: [modifierSymbol],
      description: 'Run prompt (future feature)',
      icon: <Play size={16} />,
      category: 'editing'
    },
    
    // View
    {
      key: 'D',
      modifiers: [modifierSymbol],
      description: 'Toggle diff view (current vs previous)',
      icon: <GitCompare size={16} />,
      category: 'view'
    },
    {
      key: 'Esc',
      modifiers: [],
      description: 'Exit diff mode',
      icon: <X size={16} />,
      category: 'view'
    },
    
    // Navigation
    {
      key: 'B',
      modifiers: [modifierSymbol],
      description: 'Toggle version history sidebar',
      icon: <History size={16} />,
      category: 'navigation'
    },
    {
      key: 'K',
      modifiers: [modifierSymbol],
      description: 'Toggle preview mode',
      icon: <Eye size={16} />,
      category: 'navigation'
    },
    {
      key: '?',
      modifiers: [modifierSymbol],
      description: 'Show keyboard shortcuts',
      icon: <Command size={16} />,
      category: 'navigation'
    },
    
    // Navigation
    {
      key: '←',
      modifiers: [modifierSymbol],
      description: 'Go back to dashboard',
      icon: <ArrowLeft size={16} />,
      category: 'navigation'
    }
  ];
  
  const categories = {
    editing: 'Editing',
    view: 'View & Compare',
    navigation: 'Navigation',
    version: 'Version Control'
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'editing': return 'text-blue-600';
      case 'view': return 'text-green-600';
      case 'navigation': return 'text-purple-600';
      case 'version': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Command className="text-blue-600" size={24} />
            <h2 id="shortcuts-modal-title" className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close keyboard shortcuts dialog"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Use these keyboard shortcuts to navigate and edit more efficiently in PromptMaster Lite.
          </p>
          
          {/* Shortcuts by category */}
          <div className="space-y-6">
            {Object.entries(categories).map(([categoryKey, categoryName]) => {
              const categoryShortcuts = shortcuts.filter(s => s.category === categoryKey);
              
              if (categoryShortcuts.length === 0) return null;
              
              return (
                <div key={categoryKey}>
                  <h3 className={`text-lg font-medium mb-3 ${getCategoryColor(categoryKey)}`}>
                    {categoryName}
                  </h3>
                  
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(categoryKey)} bg-opacity-10`}>
                            {shortcut.icon}
                          </div>
                          <span className="text-gray-900">{shortcut.description}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {shortcut.modifiers.map((modifier, i) => (
                            <span key={i}>
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md shadow-sm">
                                {modifier}
                              </kbd>
                              {i < shortcut.modifiers.length - 1 && (
                                <span className="text-gray-400 mx-1">+</span>
                              )}
                            </span>
                          ))}
                          {shortcut.modifiers.length > 0 && (
                            <span className="text-gray-400 mx-1">+</span>
                          )}
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md shadow-sm">
                            {shortcut.key}
                          </kbd>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <Zap size={16} />
              <span className="font-medium">Pro Tip</span>
            </div>
            <p className="text-blue-600 text-sm mt-1">
              Hold <kbd className="px-1 py-0.5 text-xs bg-blue-100 rounded">Shift</kbd> and click on two versions in the history panel to compare them in diff mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}