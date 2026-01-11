import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

const TableFilters = ({ headers, onFilter, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('all');

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch(value, selectedColumn);
  };

  const handleColumnChange = (column) => {
    setSelectedColumn(column);
    onSearch(searchTerm, column);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('', selectedColumn);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search in data..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Column Filter */}
        <div className="md:w-64">
          <select
            value={selectedColumn}
            onChange={(e) => handleColumnChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Columns</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default TableFilters;