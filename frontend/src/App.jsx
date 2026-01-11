import React from 'react';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <div className="App dark:bg-gray-900 min-h-screen">
          <Dashboard />
        </div>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;