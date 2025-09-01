import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Properties from './pages/Properties';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import MatchClients from './pages/MatchClients';
import MatchProperties from './pages/MatchProperties';
import Notifications from './pages/Notifications';
import EditProfile from './pages/EditProfile';
import AddProperty from './pages/AddProperty';
import PropertyDetails from './pages/PropertyDetails';
import EditProperty from './pages/EditProperty';
import Appointments from './pages/Appointments';
import MyProperties from './pages/MyProperties';
import { useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';

import './App.css';

/** Gate που ανακατευθύνει στο /onboarding αν δεν έχει ολοκληρωθεί */
function RequireOnboarding({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  // υποστηρίζει και παλιά ονομασία hasCompletedOnboarding
  const onboardingCompleted =
    user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;

  if (user && !onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

/** Συντόμευση: Protected + Onboarding gate μαζί */
function OnboardingProtected({ children }) {
  return (
    <ProtectedRoute>
      <RequireOnboarding>{children}</RequireOnboarding>
    </ProtectedRoute>
  );
}

function App() {
  const { authReady } = useAuth();
  if (!authReady) return <div className="p-4">Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding (προστατευμένο αλλά χωρίς το gate) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected + απαιτεί ολοκληρωμένο onboarding */}
        <Route
          path="/dashboard"
          element={
            <OnboardingProtected>
              <Dashboard />
            </OnboardingProtected>
          }
        />

        <Route
          path="/messages/property/:propertyId/user/:userId"
          element={
            <OnboardingProtected>
              <Chat />
            </OnboardingProtected>
          }
        />

        <Route
          path="/profile"
          element={
            <OnboardingProtected>
              <Profile />
            </OnboardingProtected>
          }
        />

        <Route
          path="/favorites"
          element={
            <OnboardingProtected>
              <Favorites />
            </OnboardingProtected>
          }
        />

        <Route
          path="/messages"
          element={
            <OnboardingProtected>
              <Messages />
            </OnboardingProtected>
          }
        />

        <Route
          path="/match/clients"
          element={
            <OnboardingProtected>
              <MatchClients />
            </OnboardingProtected>
          }
        />

        <Route
          path="/match/properties"
          element={
            <OnboardingProtected>
              <MatchProperties />
            </OnboardingProtected>
          }
        />

        <Route
          path="/notifications"
          element={
            <OnboardingProtected>
              <Notifications />
            </OnboardingProtected>
          }
        />

        <Route
          path="/appointments"
          element={
            <OnboardingProtected>
              <Appointments />
            </OnboardingProtected>
          }
        />

        <Route
          path="/edit-profile"
          element={
            <OnboardingProtected>
              <EditProfile />
            </OnboardingProtected>
          }
        />

        <Route
          path="/add-property"
          element={
            <OnboardingProtected>
              <AddProperty />
            </OnboardingProtected>
          }
        />

        <Route
          path="/property/:propertyId"
          element={
            <OnboardingProtected>
              <PropertyDetails />
            </OnboardingProtected>
          }
        />

        <Route
          path="/my-properties"
          element={
            <OnboardingProtected>
              <MyProperties />
            </OnboardingProtected>
          }
        />

        <Route
          path="/edit-property/:propertyId"
          element={
            <OnboardingProtected>
              <EditProperty />
            </OnboardingProtected>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;