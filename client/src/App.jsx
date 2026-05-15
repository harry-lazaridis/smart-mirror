import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Mirror from "./pages/Mirror"

import Auth from "./pages/Auth"
import Admin from "./pages/Admin"
import Sync from "./pages/Sync"
import Link from "./pages/Link"

import ProtectedRoute from "./routes/ProtectedRoute"

import "./styles/defStyle.css"

function MissingRoute() {
  return <Navigate to={{pathname: "/login"}} />
}

//<Route path="/path" element={<Page /> } />

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/sync" element={<Sync />} />
        <Route path="/link" element={<Link />} />

        {/** Public access */}
        <Route path="/login" element={<Auth />} /> 

        <Route path="/mirror" element={<Mirror />} />

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
