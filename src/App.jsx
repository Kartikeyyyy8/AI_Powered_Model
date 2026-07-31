import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Validation from './pages/Validation';
import Anomaly from './pages/Anomaly';
import Quality from './pages/Quality';
import AIExplanation from './pages/AIExplanation';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/anomaly" element={<Anomaly />} />
              <Route path="/quality" element={<Quality />} />
              <Route path="/ai-explanation" element={<AIExplanation />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
