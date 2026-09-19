import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./state/AppContext";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Mentions from "./pages/Mentions";
import Clips from "./pages/Clips";
import Reports from "./pages/Reports";
import Advertisers from "./pages/Advertisers";
import Library from "./pages/Library";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function LoginGate() {
  const { user } = useApp();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <div className="noise" aria-hidden />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route
            element={
              <RequireAuth>
                <Shell />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analyze" element={<Analyze />} />
            <Route path="mentions" element={<Mentions />} />
            <Route path="clips" element={<Clips />} />
            <Route path="reports" element={<Reports />} />
            <Route path="advertisers" element={<Advertisers />} />
            <Route path="library" element={<Library />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
