import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Download } from 'lucide-react';

// Register components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
);

const AIChartComponent = ({ chartConfig }) => {
    if (!chartConfig) return null;

    // Enhance the config with responsive options and styling if not present
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: !!chartConfig.title,
                text: chartConfig.title || 'AI Generated Chart',
            },
            // Reduce padding to maximize space
            layout: {
                padding: 10
            }
        },
        ...chartConfig.options
    };

    const data = {
        labels: chartConfig.labels,
        datasets: chartConfig.datasets.map((ds, index) => ({
            ...ds,
            // Add default colors if missing, cycling through a preset palette
            backgroundColor: ds.backgroundColor || [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 159, 64, 0.5)',
            ][index % 6],
            borderColor: ds.borderColor || [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
            ][index % 6],
            borderWidth: 1,
        }))
    };

    const downloadChart = () => {
        // Since canvas is rendered by Chart.js, we can find it
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mt-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-700">{chartConfig.title}</h4>
                <button onClick={downloadChart} className="text-gray-500 hover:text-primary-600" title="Download Chart">
                    <Download size={16} />
                </button>
            </div>
            <div className="h-64 w-full">
                <Chart type={chartConfig.type} data={data} options={options} />
            </div>
        </div>
    );
};

export default AIChartComponent;
