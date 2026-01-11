import { useEffect } from 'react';

const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check each shortcut
      shortcuts.forEach(({ key, ctrlKey, shiftKey, altKey, action }) => {
        const isCtrlMatch = ctrlKey ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const isShiftMatch = shiftKey ? event.shiftKey : !event.shiftKey;
        const isAltMatch = altKey ? event.altKey : !event.altKey;
        const isKeyMatch = event.key.toLowerCase() === key.toLowerCase();

        if (isCtrlMatch && isShiftMatch && isAltMatch && isKeyMatch) {
          event.preventDefault();
          action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export default useKeyboardShortcuts;