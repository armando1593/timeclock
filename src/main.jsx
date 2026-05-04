import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppEmpleado from './AppEmpleado'
import AppAdmin    from './AppAdmin'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/empleado" element={<AppEmpleado />} />
        <Route path="/admin"    element={<AppAdmin />} />
        <Route path="/"         element={<Navigate to="/empleado" replace />} />
        <Route path="*"         element={<Navigate to="/empleado" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
