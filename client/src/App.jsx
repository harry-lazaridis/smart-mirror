import { BrowserRouter, Routes, Route } from "react-router-dom"

import Mirror from "./pages/Mirror"
import Auth from "./pages/Auth"
import Admin from "./pages/Admin"
import ProtectedRoute from "./routes/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>  
    </BrowserRouter>
  )
}

export default App
