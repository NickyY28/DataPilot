import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, GripVertical, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const DataTable = ({ data, headers, onDataUpdate, onColumnReorder, onRowDelete }) => {
  const [editCell, setEditCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [tableData, setTableData] = useState(data);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [columnOrder, setColumnOrder] = useState(headers);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage] = useState(50);

  useEffect(() => {
    setTableData(data);
    setCurrentPage(0); // Reset to first page when data changes
  }, [data]);

  useEffect(() => {
    setColumnOrder(headers);
  }, [headers]);

  // Calculate pagination
  const totalPages = Math.ceil(tableData.length / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, tableData.length);
  const currentData = tableData.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToFirstPage = () => setCurrentPage(0);
  const goToLastPage = () => setCurrentPage(totalPages - 1);

  // Handle cell edit start
  const handleCellClick = (rowIndex, colName, currentValue) => {
    setEditCell({ rowIndex, colName });
    setEditValue(currentValue || '');
  };

  // Handle cell edit save
  const handleCellSave = () => {
    if (editCell) {
      const updatedData = [...tableData];
      const actualIndex = startIndex + editCell.rowIndex;
      updatedData[actualIndex][editCell.colName] = editValue;
      setTableData(updatedData);
      onDataUpdate?.(updatedData);
      setEditCell(null);
    }
  };

  // Handle cell edit cancel
  const handleCellCancel = () => {
    setEditCell(null);
    setEditValue('');
  };

  // Handle key press in edit mode
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  // Handle column drag start
  const handleColumnDragStart = (e, colIndex) => {
    setDraggedColumn(colIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle column drag over
  const handleColumnDragOver = (e, colIndex) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === colIndex) return;

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedColumn];
    newOrder.splice(draggedColumn, 1);
    newOrder.splice(colIndex, 0, draggedItem);

    setColumnOrder(newOrder);
    setDraggedColumn(colIndex);
  };

  // Handle column drag end
  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    onColumnReorder?.(columnOrder);
  };

  // Handle row delete
  const handleRowDelete = (localRowIndex) => {
    const actualIndex = startIndex + localRowIndex;
    if (window.confirm(`Are you sure you want to delete row ${actualIndex + 1}?`)) {
      const updatedData = tableData.filter((_, index) => index !== actualIndex);
      setTableData(updatedData);
      onDataUpdate?.(updatedData);
      onRowDelete?.(actualIndex);
    }
  };

  // Get cell value
  const getCellValue = (row, colName) => {
    const value = row[colName];
    if (value === null || value === undefined) return '-';
    return String(value);
  };

  // Get cell color based on type
  const getCellColor = (value) => {
    if (value === '-' || value === '') return 'text-gray-400';
    if (!isNaN(value) && value !== '') return 'text-blue-600';
    return 'text-gray-900';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Table Header Info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
          <span className="font-semibold">{endIndex}</span> of{' '}
          <span className="font-semibold">{tableData.length}</span> rows
        </div>
        <div className="text-xs text-gray-500">
          💡 Double-click to edit • Drag headers to reorder
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50">
                #
              </th>
              {columnOrder.map((header, colIndex) => (
                <th
                  key={header}
                  draggable
                  onDragStart={(e) => handleColumnDragStart(e, colIndex)}
                  onDragOver={(e) => handleColumnDragOver(e, colIndex)}
                  onDragEnd={handleColumnDragEnd}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move hover:bg-gray-100 transition-colors bg-gray-50 ${
                    draggedColumn === colIndex ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{header}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 bg-gray-50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row, rowIndex) => {
              const actualRowNumber = startIndex + rowIndex + 1;
              return (
                <tr key={actualRowNumber} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {actualRowNumber}
                  </td>
                  {columnOrder.map((colName) => {
                    const isEditing = editCell?.rowIndex === rowIndex && editCell?.colName === colName;
                    const cellValue = getCellValue(row, colName);

                    return (
                      <td
                        key={`${rowIndex}-${colName}`}
                        className="px-4 py-2 text-sm relative group"
                        onDoubleClick={() => handleCellClick(rowIndex, colName, cellValue)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyPress}
                              className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                              autoFocus
                            />
                            <button
                              onClick={handleCellSave}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCellCancel}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={`${getCellColor(cellValue)} truncate max-w-xs`}>
                              {cellValue}
                            </span>
                            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2 flex-shrink-0" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRowDelete(rowIndex)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToFirstPage}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous 50
            </button>
          </div>

          <div className="text-sm text-gray-700">
            Page <span className="font-semibold">{currentPage + 1}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              Next 50
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToLastPage}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;