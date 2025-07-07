import { useEffect, useRef } from 'react';

interface HotkeyConfig {
  key: string;
  modifiers?: ('ctrl' | 'cmd' | 'alt' | 'shift')[];
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useHotkeys(hotkeys: HotkeyConfig[]) {
  const hotkeyRefs = useRef<HotkeyConfig[]>([]);
  
  useEffect(() => {
    hotkeyRefs.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      hotkeyRefs.current.forEach(({ key, modifiers = [], handler, preventDefault = true }) => {
        const keyMatch = event.key.toLowerCase() === key.toLowerCase();
        const modifiersMatch = modifiers.every(modifier => {
          switch (modifier) {
            case 'ctrl':
              return event.ctrlKey;
            case 'cmd':
              return event.metaKey;
            case 'alt':
              return event.altKey;
            case 'shift':
              return event.shiftKey;
            default:
              return false;
          }
        });

        // Check that no extra modifiers are pressed
        const onlyRequiredModifiers = 
          (modifiers.includes('ctrl') || !event.ctrlKey) &&
          (modifiers.includes('cmd') || !event.metaKey) &&
          (modifiers.includes('alt') || !event.altKey) &&
          (modifiers.includes('shift') || !event.shiftKey);

        if (keyMatch && modifiersMatch && onlyRequiredModifiers) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler(event);
        }
      });
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);
}

// Platform-specific modifier detection
export function getModifierKey(): 'cmd' | 'ctrl' {
  return navigator.platform.toLowerCase().includes('mac') ? 'cmd' : 'ctrl';
}

// Common hotkey combinations
export const commonHotkeys = {
  save: (handler: () => void) => ({
    key: 's',
    modifiers: [getModifierKey()],
    handler
  }),
  
  toggleDiff: (handler: () => void) => ({
    key: 'd',
    modifiers: [getModifierKey()],
    handler
  }),
  
  runPrompt: (handler: () => void) => ({
    key: 'Enter',
    modifiers: [getModifierKey()],
    handler
  }),
  
  escape: (handler: () => void) => ({
    key: 'Escape',
    modifiers: [],
    handler
  })
};