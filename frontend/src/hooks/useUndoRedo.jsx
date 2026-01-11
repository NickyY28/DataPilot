import { useState, useCallback } from 'react';

const useUndoRedo = (initialState) => {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentState = history[currentIndex];

  const setState = useCallback((newState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);
      // Keep only last 50 states to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(prev => prev);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state: currentState,
    setState,
    undo,
    redo,
    canUndo,
    canRedo
  };
};

export default useUndoRedo;