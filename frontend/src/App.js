import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import UserProfile from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import MatchClients from './pages/MatchClients';
import Notifications from './pages/Notifications';
import EditProfile from './pages/EditProfile';
import AddProperty from './pages/AddProperty';
import PropertyDetails from './pages/PropertyDetails';
import EditProperty from './pages/EditProperty';
import Appointments from './pages/Appointments';
import MyProperties from './pages/MyProperties';
import { useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import DashboardRouter from './pages/DashboardRouter';
import AppLayout from './components/AppLayout';


import './App.css';

/** Gate που ανακατευθύνει στο /onboarding αν δεν έχει ολοκληρωθεί */
function RequireOnboarding({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const isClient = user?.role === 'client';
  const onboardingCompleted =
    user?.onboardingCompleted ??
    user?.hasCompletedOnboarding ??
    !isClient;

  if (user && isClient && !onboardingCompleted && location.pathname !== '/onboarding') {
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
    <Routes>
      {/* Public routes */}
      {/* CHANGE: Το path "/" πλέον κάνει redirect στο login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
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
        element={
          <OnboardingProtected>
            <AppLayout />
          </OnboardingProtected>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardRouter />}
          handle={{
            title: { owner: "Dashboard", client: "Your Matched Properties" },
            subtitle: {
              owner: "Overview of your listings and appointments.",
              client: "Properties selected based on your preferences.",
            },
          }}
        />

        <Route
          path="/calendar"
          element={<Appointments />}
        />

        <Route
          path="/chat/:propertyId/:userId"
          element={<Chat />}
          handle={{
            title: "Messages",
            subtitle: "Chat with owners and agents",
          }}
        />

        <Route
          path="/profile"
          element={<Profile />}
          handle={{
            title: "Settings",
            subtitle: "Manage your profile and preferences",
          }}
        />
        <Route
          path="/user-profile/:userId"
          element={<UserProfile />}
        />

        <Route
          path="/favorites"
          element={<Favorites />}
          handle={{
            title: "Your Favorites",
            subtitle: "Properties you saved for later.",
          }}
        />

        <Route
          path="/messages"
          element={<Messages />}
          handle={{
            title: "Messages",
            subtitle: "Chat with owners and agents",
          }}
        />

        <Route
          path="/match/clients"
          element={<MatchClients />}
          handle={{
            title: "Match Clients",
            subtitle: "Review and manage client matches.",
          }}
        />
        <Route
          path="/notifications"
          element={<Notifications />}
          handle={{
            title: "Notifications",
            subtitle: "Stay up to date with your latest alerts.",
          }}
        />

        <Route
          path="/appointments"
          element={<Appointments />}
        />

        <Route
          path="/edit-profile"
          element={<EditProfile />}
          handle={{
            title: "Edit Profile",
            subtitle: "Update your personal information",
          }}
        />

        <Route
          path="/add-property"
          element={<AddProperty />}
          handle={{
            title: "Add Property",
            subtitle: "List a new property for clients to discover.",
          }}
        />

        <Route
          path="/property/:propertyId"
          element={<PropertyDetails />}
        />

        <Route
          path="/my-properties"
          element={<MyProperties />}
          handle={{
            title: "My Properties",
            subtitle: "Manage your active listings.",
          }}
        />

        <Route
          path="/edit-property/:propertyId"
          element={<EditProperty />}
          handle={{
            title: "Edit Property",
            subtitle: "Update your listing details.",
          }}
        />
      </Route>
    </Routes>
  );
}

export default App;
