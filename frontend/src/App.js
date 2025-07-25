import{ BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Properties from './pages/Properties';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import EditProfile from './pages/EditProfile';

//import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path = "/" element={<Home/>}/>
        <Route path = "/login" element={<Login/>}/>
        <Route path = "/register" element={<Register/>}/>

        <Route 
          path = "/dashboard"
          element = {
            <ProtectedRoute>
              <Dashboard/>
            </ProtectedRoute>
          }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

          <Route
            path="/favorites"
            element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
            }/>

          <Route
            path="/messages"
            element={
            <ProtectedRoute>
              <Messages/>
            </ProtectedRoute>
            }/>
          <Route
            path="/notifications"
            element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
            
            }/>
          <Route
            path="/edit-profile"
            element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
            
            }/>
      </Routes>
    </Router>
  );
}
export default App;
