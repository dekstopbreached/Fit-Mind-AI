import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import WorkoutPlanPage from "./pages/WorkoutPlan.jsx";
import DietPlanPage from "./pages/DietPlan.jsx";
import ProgressPage from "./pages/Progress.jsx";
import AssistantPage from "./pages/Assistant.jsx";
import PricingPage from "./pages/Pricing.jsx";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminPage from "./pages/Admin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workout" element={<WorkoutPlanPage />} />
        <Route path="/diet" element={<DietPlanPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
