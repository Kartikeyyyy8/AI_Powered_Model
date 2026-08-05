import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { DatasetProvider } from './context/DatasetContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DatasetProvider>
      <App />
    </DatasetProvider>
  </React.StrictMode>,
);


