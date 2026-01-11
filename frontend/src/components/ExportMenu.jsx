import React, { useState } from 'react';
import { Download, FileText, Table, FileJson } from 'lucide-react';

const ExportMenu = ({ data, headers, fileName }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportToCSV = () => {
    const Papa = require('papaparse');
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_export.csv`;
    link.click();
    setIsOpen(false);
  };

  const exportToJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_export.json`;
    link.click();
    setIsOpen(false);
  };

  const exportToExcel = () => {
    // This would require xlsx library
    alert('Excel export - install xlsx library');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Download className="w-5 h-5" />
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileText className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Export as CSV</span>
            </button>
            <button
              onClick={exportToJSON}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
            >
              <FileJson className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Export as JSON</span>
            </button>
            <button
              onClick={exportToExcel}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
            >
              <Table className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium">Export as Excel</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportMenu;