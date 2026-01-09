import React from 'react';
import { Table, Download, Info } from 'lucide-react';

const DataPreview = ({ data, fileName, rowCount, columnCount }) => {
  if (!data || !data.preview || data.preview.length === 0) {
    return null;
  }

  const headers = Object.keys(data.preview[0]);
  const rows = data.preview.slice(0, 10); // Show first 10 rows

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Table className="w-6 h-6 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {fileName}
            </h3>
            <p className="text-sm text-gray-500">
              {rowCount} rows × {columnCount} columns
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {row[header] !== null && row[header] !== undefined
                      ? String(row[header])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rowCount > 10 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          <p>Showing first 10 rows of {rowCount}</p>
        </div>
      )}
    </div>
  );
};

export default DataPreview;