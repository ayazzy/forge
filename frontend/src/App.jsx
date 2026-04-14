import { Routes, Route } from "react-router-dom";
import Pipeline from "./pages/Pipeline";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Trends from "./pages/Trends";
import TryPipeline from "./pages/TryPipeline";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import Onboarding from "./pages/Onboarding";
import Stats from "./pages/Stats";
import Episodes from "./pages/Episodes";
import SavedTopics from "./pages/SavedTopics";
import Calendar from "./pages/Calendar";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/try" element={<TryPipeline />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requiresPlan><Dashboard /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute requiresPlan><Pipeline /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute requiresPlan><Settings /></ProtectedRoute>} />
        <Route path="/trends" element={<ProtectedRoute requiresPlan><Trends /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute requiresPlan><Stats /></ProtectedRoute>} />
        <Route path="/episodes" element={<ProtectedRoute requiresPlan><Episodes /></ProtectedRoute>} />
        <Route path="/saved-topics" element={<ProtectedRoute requiresPlan><SavedTopics /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute requiresPlan><Calendar /></ProtectedRoute>} />
      </Routes>
    </ErrorBoundary>
  );
}
