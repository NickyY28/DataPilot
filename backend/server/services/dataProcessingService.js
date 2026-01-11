const fs = require('fs');
const Papa = require('papaparse');

class DataProcessingService {
  
  /**
   * Parse CSV file and return data
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({
            data: results.data,
            headers: results.meta.fields,
            rowCount: results.data.length
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Detect data types for each column
   */
  detectColumnTypes(data, headers) {
    const types = {};
    
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (values.length === 0) {
        types[header] = 'empty';
        return;
      }

      // Check if all values are numbers
      const allNumbers = values.every(val => !isNaN(val));
      if (allNumbers) {
        types[header] = 'number';
        return;
      }

      // Check if values are dates
      const datePattern = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
      const allDates = values.every(val => datePattern.test(String(val)));
      if (allDates) {
        types[header] = 'date';
        return;
      }

      // Check if categorical (limited unique values)
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length < values.length * 0.5 && uniqueValues.length < 20) {
        types[header] = 'categorical';
        return;
      }

      types[header] = 'text';
    });

    return types;
  }

  /**
   * Remove duplicate rows
   */
  removeDuplicates(data) {
    const seen = new Set();
    const cleanData = [];
    let duplicatesRemoved = 0;

    data.forEach(row => {
      const rowString = JSON.stringify(row);
      if (!seen.has(rowString)) {
        seen.add(rowString);
        cleanData.push(row);
      } else {
        duplicatesRemoved++;
      }
    });

    return {
      data: cleanData,
      duplicatesRemoved
    };
  }

  /**
   * Handle missing values
   */
  handleMissingValues(data, headers, strategy = 'remove') {
    let changes = {
      rowsRemoved: 0,
      valuesFilled: 0,
      columnsAffected: []
    };

    if (strategy === 'remove') {
      // Remove rows with any missing values
      const originalLength = data.length;
      const cleanData = data.filter(row => {
        return headers.every(header => {
          const value = row[header];
          return value !== null && value !== undefined && value !== '';
        });
      });
      changes.rowsRemoved = originalLength - cleanData.length;
      return { data: cleanData, changes };
    }

    if (strategy === 'fill') {
      // Fill missing values with mean for numbers, mode for categorical
      const columnTypes = this.detectColumnTypes(data, headers);
      
      headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
        
        if (values.length === 0) return;

        let fillValue;
        
        if (columnTypes[header] === 'number') {
          // Fill with mean
          const sum = values.reduce((acc, val) => acc + Number(val), 0);
          fillValue = sum / values.length;
          fillValue = Math.round(fillValue * 100) / 100; // Round to 2 decimals
        } else {
          // Fill with mode (most frequent value)
          const frequency = {};
          values.forEach(val => {
            frequency[val] = (frequency[val] || 0) + 1;
          });
          fillValue = Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
          );
        }

        // Apply fill
        data.forEach(row => {
          if (row[header] === null || row[header] === undefined || row[header] === '') {
            row[header] = fillValue;
            changes.valuesFilled++;
            if (!changes.columnsAffected.includes(header)) {
              changes.columnsAffected.push(header);
            }
          }
        });
      });
    }

    return { data, changes };
  }

  /**
   * Remove outliers using IQR method
   */
  removeOutliers(data, headers) {
    const columnTypes = this.detectColumnTypes(data, headers);
    let outliersRemoved = 0;
    const affectedColumns = [];

    // Only process numeric columns
    const numericColumns = headers.filter(h => columnTypes[h] === 'number');

    numericColumns.forEach(column => {
      const values = data.map(row => Number(row[column])).filter(val => !isNaN(val)).sort((a, b) => a - b);
      
      if (values.length === 0) return;

      // Calculate Q1, Q3, and IQR
      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);
      const q1 = values[q1Index];
      const q3 = values[q3Index];
      const iqr = q3 - q1;
      
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Filter out outliers
      const originalLength = data.length;
      data = data.filter(row => {
        const value = Number(row[column]);
        return value >= lowerBound && value <= upperBound;
      });

      if (data.length < originalLength) {
        affectedColumns.push(column);
        outliersRemoved += (originalLength - data.length);
      }
    });

    return {
      data,
      outliersRemoved,
      affectedColumns
    };
  }

  /**
   * Standardize data formats
   */
  standardizeFormats(data, headers) {
    const changes = [];
    
    headers.forEach(header => {
      data.forEach(row => {
        const value = row[header];
        
        if (typeof value === 'string') {
          // Trim whitespace
          const trimmed = value.trim();
          if (trimmed !== value) {
            row[header] = trimmed;
            if (!changes.includes(header)) {
              changes.push(header);
            }
          }

          // Standardize case for categorical columns
          const uniqueValues = [...new Set(data.map(r => r[header]))];
          if (uniqueValues.length < 20) {
            row[header] = trimmed.toLowerCase();
          }
        }
      });
    });

    return { data, changes };
  }

  /**
   * Get basic statistics
   */
  getStatistics(data, headers) {
    const columnTypes = this.detectColumnTypes(data, headers);
    const stats = {};

    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      
      stats[header] = {
        type: columnTypes[header],
        count: values.length,
        missing: data.length - values.length
      };

      if (columnTypes[header] === 'number') {
        const numbers = values.map(v => Number(v));
        const sum = numbers.reduce((acc, val) => acc + val, 0);
        const mean = sum / numbers.length;
        const sorted = numbers.sort((a, b) => a - b);
        
        stats[header] = {
          ...stats[header],
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          mean: Math.round(mean * 100) / 100,
          median: sorted[Math.floor(sorted.length / 2)]
        };
      } else if (columnTypes[header] === 'categorical' || columnTypes[header] === 'text') {
        const uniqueValues = [...new Set(values)];
        stats[header] = {
          ...stats[header],
          uniqueValues: uniqueValues.length,
          topValues: this.getTopValues(values, 5)
        };
      }
    });

    return stats;
  }

  /**
   * Get top N most frequent values
   */
  getTopValues(values, n = 5) {
    const frequency = {};
    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value, count]) => ({ value, count }));
  }
}

module.exports = new DataProcessingService();