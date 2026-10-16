import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import CreateDocument from './pages/CreateDocument';
import DocumentDetail from './pages/DocumentDetail';
import MySubmissions from './pages/MySubmissions';
import MyApprovals from './pages/MyApprovals';
import Notifications from './pages/Notifications';
import UserManagement from './pages/UserManagement';
import WorkflowManagement from './pages/WorkflowManagement';
import AuditHistory from './pages/AuditHistory';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; roles: string[] }> = ({ children, roles }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/create" element={<RoleRoute roles={['SUBMITTER']}><CreateDocument /></RoleRoute>} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="documents/:id/edit" element={<RoleRoute roles={['SUBMITTER']}><CreateDocument /></RoleRoute>} />
            <Route path="my-submissions" element={<RoleRoute roles={['SUBMITTER']}><MySubmissions /></RoleRoute>} />
            <Route path="my-approvals" element={<RoleRoute roles={['APPROVER']}><MyApprovals /></RoleRoute>} />
            <Route path="notifications" element={<Notifications />} />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="workflows"
              element={
                <AdminRoute>
                  <WorkflowManagement />
                </AdminRoute>
              }
            />
            <Route
              path="audit"
              element={
                <AdminRoute>
                  <AuditHistory />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
