import React from 'react';
import { Sparkles, Download, BarChart3, Trash2 } from 'lucide-react';

const ActionButtons = ({ 
  onClean, 
  onInsights, 
  onDownload, 
  onReset,
  disabled = false 
}) => {
  const buttons = [
    {
      label: 'Clean Data',
      icon: Sparkles,
      onClick: onClean,
      color: 'bg-primary-600 hover:bg-primary-700',
    },
    {
      label: 'Get Insights',
      icon: BarChart3,
      onClick: onInsights,
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      label: 'Download',
      icon: Download,
      onClick: onDownload,
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      label: 'Reset',
      icon: Trash2,
      onClick: onReset,
      color: 'bg-red-600 hover:bg-red-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          disabled={disabled}
          className={`${button.color} text-white px-6 py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium`}
        >
          <button.icon className="w-5 h-5" />
          {button.label}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;