import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Download } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

const ChartGenerator = ({ data, headers, columnTypes }) => {
  const [charts, setCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);

  useEffect(() => {
    if (data && headers && columnTypes) {
      generateInsightfulCharts();
    }
  }, [data, headers, columnTypes]);

  // Analyze data and generate appropriate charts
  const generateInsightfulCharts = () => {
    const generatedCharts = [];
    
    const numericColumns = headers.filter(h => columnTypes[h] === 'number');
    const categoricalColumns = headers.filter(h => 
      columnTypes[h] === 'categorical' || columnTypes[h] === 'text'
    );
    const dateColumns = headers.filter(h => columnTypes[h] === 'date');

    // 1. Numeric Distribution Charts (Bar Charts)
    numericColumns.slice(0, 3).forEach(col => {
      const chartData = data.slice(0, 20).map((row, index) => ({
        name: `Row ${index + 1}`,
        value: row[col] || 0,
      }));

      generatedCharts.push({
        id: `bar-${col}`,
        title: `${col} Distribution`,
        type: 'bar',
        data: chartData,
        insight: `Distribution of ${col} across the first 20 records`,
      });
    });

    // 2. Categorical Distribution (Pie Charts)
    categoricalColumns.slice(0, 2).forEach(col => {
      const frequency = {};
      data.forEach(row => {
        const value = row[col];
        if (value) {
          frequency[value] = (frequency[value] || 0) + 1;
        }
      });

      const chartData = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      if (chartData.length > 0) {
        generatedCharts.push({
          id: `pie-${col}`,
          title: `${col} Distribution`,
          type: 'pie',
          data: chartData,
          insight: `Top categories in ${col}`,
        });
      }
    });

    // 3. Trend Analysis (Line Charts for numeric columns)
    if (numericColumns.length >= 2) {
      const chartData = data.slice(0, 30).map((row, index) => {
        const dataPoint = { index: index + 1 };
        numericColumns.slice(0, 3).forEach(col => {
          dataPoint[col] = row[col] || 0;
        });
        return dataPoint;
      });

      generatedCharts.push({
        id: 'trend-multi',
        title: 'Numeric Trends Comparison',
        type: 'line',
        data: chartData,
        lines: numericColumns.slice(0, 3),
        insight: 'Comparing trends across numeric columns',
      });
    }

    // 4. Correlation Analysis (Scatter Plot)
    if (numericColumns.length >= 2) {
      const col1 = numericColumns[0];
      const col2 = numericColumns[1];
      
      const chartData = data.slice(0, 50).map(row => ({
        x: row[col1] || 0,
        y: row[col2] || 0,
      }));

      generatedCharts.push({
        id: `scatter-${col1}-${col2}`,
        title: `${col1} vs ${col2} Correlation`,
        type: 'scatter',
        data: chartData,
        xLabel: col1,
        yLabel: col2,
        insight: `Relationship between ${col1} and ${col2}`,
      });
    }

    // 5. Area Chart for cumulative data
    if (numericColumns.length > 0) {
      const col = numericColumns[0];
      const chartData = data.slice(0, 30).map((row, index) => ({
        name: `Point ${index + 1}`,
        value: row[col] || 0,
      }));

      generatedCharts.push({
        id: `area-${col}`,
        title: `${col} Trend Area`,
        type: 'area',
        data: chartData,
        insight: `Cumulative trend of ${col}`,
      });
    }

    setCharts(generatedCharts);
    if (generatedCharts.length > 0) {
      setSelectedChart(generatedCharts[0]);
    }
  };

  // Render individual chart based on type
  const renderChart = (chart) => {
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Legend />
              {chart.lines.map((line, index) => (
                <Line
                  key={line}
                  type="monotone"
                  dataKey={line}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name={chart.xLabel} />
              <YAxis dataKey="y" name={chart.yLabel} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data Points" data={chart.data} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Download chart as image
  const downloadChart = () => {
    // This would require html2canvas or similar library
    alert('Chart download feature - implement with html2canvas');
  };

  if (charts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No charts available yet. Upload data to see visualizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          Auto-Generated Insights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {charts.map((chart) => (
            <button
              key={chart.id}
              onClick={() => setSelectedChart(chart)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedChart?.id === chart.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-400'
              }`}
            >
              <div className="text-sm font-medium text-gray-900 truncate">
                {chart.title}
              </div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{chart.type} Chart</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Chart Display */}
      {selectedChart && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedChart.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedChart.insight}</p>
            </div>
            <button
              onClick={downloadChart}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <div className="mt-4">
            {renderChart(selectedChart)}
          </div>
        </div>
      )}

      {/* All Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div key={chart.id} className="bg-white rounded-lg shadow-md p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{chart.title}</h4>
            <p className="text-xs text-gray-600 mb-3">{chart.insight}</p>
            {renderChart(chart)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartGenerator;