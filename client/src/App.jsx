import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Mirror from "./pages/Mirror"
import Auth from "./pages/Auth"
import Admin from "./pages/Admin"
import Syncs from "./pages/Syncing"

import ProtectedRoute from "./routes/ProtectedRoute"

function MissingRoute() {
  return <Navigate to={{pathname: "/login"}} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/sync" element={<Syncs />} />

        {/** Public access */}
        <Route path="/login" element={<Auth />} /> 

        <Route 
          path="/mirror" 
          element={
            <ProtectedRoute>
              <Mirror />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } 
        
        />

        <Route path="*" element={<MissingRoute />} />
      </Routes>  
    </BrowserRouter>
  )
}

export default App
