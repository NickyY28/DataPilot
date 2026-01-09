import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { dataAPI } from '../services/api';
import FileUpload from '../components/FileUpload';
import DataPreview from '../components/DataPreview';
import ChatInterface from '../components/ChatInterface';
import ActionButtons from '../components/ActionButtons';
import StatisticsCard from '../components/StatisticsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';
import { 
  Database, 
  Columns, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

const Dashboard = () => {
  const {
    currentDataset,
    setCurrentDataset,
    setUploadedFile,
    chatHistory,
    addMessage,
    resetDataset,
    isProcessing,
    setIsProcessing,
  } = useData();

  const [alert, setAlert] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Show alert with auto-dismiss
  const showAlert = (type, message, duration = 5000) => {
    setAlert({ type, message });
    if (duration) {
      setTimeout(() => setAlert(null), duration);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const response = await dataAPI.uploadCSV(file);
      
      if (response.success) {
        setCurrentDataset(response);
        setUploadedFile(file);
        showAlert('success', `File "${response.info.fileName}" uploaded successfully!`);
        
        // Add welcome message to chat
        addMessage({
          role: 'assistant',
          content: `Great! I've loaded "${response.info.fileName}" with ${response.info.rowCount} rows and ${response.info.columnCount} columns. How can I help you analyze this data?`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      showAlert('error', error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle chat messages
  const handleSendMessage = async (message) => {
    if (!currentDataset) {
      showAlert('error', 'Please upload a dataset first');
      return;
    }

    // Add user message
    addMessage({ role: 'user', content: message });
    setIsProcessing(true);

    try {
      // Check if it's a command or question
      const lowerMessage = message.toLowerCase();
      const isCommand = 
        lowerMessage.includes('clean') ||
        lowerMessage.includes('remove') ||
        lowerMessage.includes('fill') ||
        lowerMessage.includes('outlier') ||
        lowerMessage.includes('standardize');

      let response;
      
      if (isCommand) {
        // Process as command
        response = await dataAPI.processCommand(currentDataset.dataId, message);
        
        if (response.success) {
          // Update dataset with new row count
          setCurrentDataset(prev => ({
            ...prev,
            info: {
              ...prev.info,
              rowCount: response.result.rowsAfter,
            },
          }));
          
          addMessage({
            role: 'assistant',
            content: response.explanation,
          });
        }
      } else {
        // Process as question
        response = await dataAPI.askQuestion(currentDataset.dataId, message);
        
        if (response.success) {
          addMessage({
            role: 'assistant',
            content: response.answer,
          });
        }
      }
    } catch (error) {
      console.error('Message error:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      });
      showAlert('error', error.response?.data?.message || 'Failed to process message');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle clean data button
  const handleCleanData = async () => {
    if (!currentDataset) return;
    
    setIsProcessing(true);
    try {
      const response = await dataAPI.processCommand(currentDataset.dataId, 'clean this data');
      
      if (response.success) {
        setCurrentDataset(prev => ({
          ...prev,
          info: {
            ...prev.info,
            rowCount: response.result.rowsAfter,
          },
        }));
        
        addMessage({
          role: 'assistant',
          content: response.explanation,
        });
        
        showAlert('success', `Data cleaned! Removed ${response.result.rowsChanged} problematic rows.`);
      }
    } catch (error) {
      console.error('Clean error:', error);
      showAlert('error', 'Failed to clean data');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle get insights button
  const handleGetInsights = async () => {
    if (!currentDataset) return;
    
    setIsProcessing(true);
    try {
      const response = await dataAPI.getInsights(currentDataset.dataId);
      
      if (response.success) {
        addMessage({
          role: 'assistant',
          content: response.insights,
        });
        
        showAlert('success', 'Insights generated successfully!');
      }
    } catch (error) {
      console.error('Insights error:', error);
      showAlert('error', 'Failed to generate insights');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download button
  const handleDownload = async () => {
    if (!currentDataset) return;
    
    try {
      await dataAPI.downloadData(
        currentDataset.dataId,
        `cleaned_${currentDataset.info.fileName}`
      );
      showAlert('success', 'File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      showAlert('error', 'Failed to download file');
    }
  };

  // Handle reset button
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset? All data will be lost.')) {
      resetDataset();
      showAlert('info', 'Dataset reset successfully');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-400 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">InsightStream</h1>
                <p className="text-sm text-gray-500">AI-Powered Data Analysis</p>
              </div>
            </div>
            {currentDataset && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Dataset Loaded
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert */}
        {alert && (
          <div className="mb-6">
            <Alert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          </div>
        )}

        {/* File Upload Section */}
        {!currentDataset ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to InsightStream
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Upload your CSV file to get started. Our AI will help you clean,
                analyze, and gain insights from your data.
              </p>
            </div>
            <FileUpload onFileUpload={handleFileUpload} isUploading={isUploading} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatisticsCard
                title="Total Rows"
                value={currentDataset.info.rowCount.toLocaleString()}
                icon={Database}
                color="blue"
              />
              <StatisticsCard
                title="Total Columns"
                value={currentDataset.info.columnCount}
                icon={Columns}
                color="purple"
              />
              <StatisticsCard
                title="File Name"
                value={currentDataset.info.fileName.length > 15 
                  ? currentDataset.info.fileName.substring(0, 15) + '...'
                  : currentDataset.info.fileName}
                icon={CheckCircle}
                color="green"
                subtitle="CSV File"
              />
              <StatisticsCard
                title="Status"
                value="Ready"
                icon={CheckCircle}
                color="green"
                subtitle="All systems go"
              />
            </div>

            {/* Action Buttons */}
            <ActionButtons
              onClean={handleCleanData}
              onInsights={handleGetInsights}
              onDownload={handleDownload}
              onReset={handleReset}
              disabled={isProcessing}
            />

            {/* Main Grid: Data Preview & Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Preview */}
              <div className="lg:col-span-1">
                <DataPreview
                  data={currentDataset.info}
                  fileName={currentDataset.info.fileName}
                  rowCount={currentDataset.info.rowCount}
                  columnCount={currentDataset.info.columnCount}
                />
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-1">
                <ChatInterface
                  onSendMessage={handleSendMessage}
                  messages={chatHistory}
                  isLoading={isProcessing}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            InsightStream © 2025 - AI-Powered Data Analysis Platform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;