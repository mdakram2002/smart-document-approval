import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  CheckSquare, 
  Bell, 
  Users, 
  GitBranch, 
  History,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: user?.role === 'ADMIN' ? 'Admin Dashboard' : user?.role === 'APPROVER' ? 'Approver Dashboard' : 'My Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUBMITTER', 'APPROVER'] },
    { name: user?.role === 'ADMIN' ? 'All Documents' : user?.role === 'APPROVER' ? 'Assigned Documents' : 'Documents', href: '/documents', icon: FileText, roles: ['ADMIN', 'SUBMITTER', 'APPROVER'] },
    { name: 'Create Document', href: '/documents/create', icon: FileText, roles: ['SUBMITTER'] },
    { name: 'My Submissions', href: '/my-submissions', icon: Send, roles: ['SUBMITTER'] },
    { name: 'My Pending Approvals', href: '/my-approvals', icon: CheckSquare, roles: ['APPROVER'] },
    { name: 'Notifications', href: '/notifications', icon: Bell, roles: ['ADMIN', 'SUBMITTER', 'APPROVER'] },
    { name: 'Manage Users / Roles', href: '/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Workflow Configuration & Approver Assignment', href: '/workflows', icon: GitBranch, roles: ['ADMIN'] },
    { name: 'Audit History', href: '/audit', icon: History, roles: ['ADMIN'] },
  ];

  const filteredNavigation = navigation.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <span className="text-xl font-bold text-gray-900">Doc Approval</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <span className="text-xl font-bold text-gray-900">Doc Approval</span>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold text-gray-900">Doc Approval</span>
          <div className="w-6" />
        </div>
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
