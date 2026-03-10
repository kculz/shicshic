import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const Dashboard = () => (
  <div style={{ padding: '20px' }}>
    <h1>Admin Dashboard</h1>
    <p>Welcome to Mushikashika Admin</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>User Management</h3>
        <p>Manage drivers and passengers</p>
      </div>
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>KYC Review</h3>
        <p>Pending: 0</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', background: '#333', color: '#fff' }}>
        <Link to="/" style={{ color: '#fff', marginRight: '10px' }}>Dashboard</Link>
        <Link to="/users" style={{ color: '#fff' }}>Users</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<div>User List coming soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;
