import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DataValidation = ({ data, headers, columnTypes }) => {
  const [validationResults, setValidationResults] = useState([]);

  useEffect(() => {
    if (data && headers && columnTypes) {
      validateData();
    }
  }, [data, headers, columnTypes]);

  const validateData = () => {
    const results = [];

    headers.forEach(header => {
      const expectedType = columnTypes[header];
      const issues = [];

      data.forEach((row, rowIndex) => {
        const value = row[header];

        // Check for missing values
        if (value === null || value === undefined || value === '') {
          issues.push({
            row: rowIndex + 1,
            type: 'missing',
            message: 'Missing value'
          });
        }
        // Check type mismatch
        else if (expectedType === 'number' && isNaN(value)) {
          issues.push({
            row: rowIndex + 1,
            type: 'type_mismatch',
            message: `Expected number, got "${value}"`
          });
        }
        // Check for outliers (basic check)
        else if (expectedType === 'number') {
          const numValue = Number(value);
          if (numValue < -1000000 || numValue > 1000000) {
            issues.push({
              row: rowIndex + 1,
              type: 'outlier',
              message: `Possible outlier: ${value}`
            });
          }
        }
      });

      if (issues.length > 0) {
        results.push({
          column: header,
          issueCount: issues.length,
          issues: issues.slice(0, 5), // Show first 5 issues
          totalIssues: issues.length
        });
      }
    });

    setValidationResults(results);
  };

  if (validationResults.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        <div>
          <p className="font-medium text-green-900 dark:text-green-100">Data looks good!</p>
          <p className="text-sm text-green-700 dark:text-green-300">No validation issues found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-900 dark:text-yellow-100">
            Data Validation Issues Found
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {validationResults.length} columns have validation issues
          </p>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {validationResults.map((result, index) => (
          <details key={index} className="bg-white dark:bg-gray-800 rounded p-3">
            <summary className="cursor-pointer font-medium text-gray-900 dark:text-white">
              {result.column} - {result.issueCount} issues
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              {result.issues.map((issue, i) => (
                <div key={i} className="text-gray-600 dark:text-gray-400 pl-4">
                  • Row {issue.row}: {issue.message}
                </div>
              ))}
              {result.totalIssues > 5 && (
                <div className="text-gray-500 dark:text-gray-500 pl-4 italic">
                  ... and {result.totalIssues - 5} more issues
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default DataValidation;