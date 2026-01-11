import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [currentDataset, setCurrentDataset] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addMessage = (message) => {
    setChatHistory((prev) => [...prev, message]);
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  const resetDataset = () => {
    setCurrentDataset(null);
    setUploadedFile(null);
    setChatHistory([]);
  };

  const value = {
    currentDataset,
    setCurrentDataset,
    uploadedFile,
    setUploadedFile,
    chatHistory,
    setChatHistory,
    addMessage,
    clearChat,
    resetDataset,
    isProcessing,
    setIsProcessing,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};