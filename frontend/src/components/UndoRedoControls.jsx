import React from 'react';
import { Undo, Redo } from 'lucide-react';

const UndoRedoControls = ({ onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
};

export default UndoRedoControls;