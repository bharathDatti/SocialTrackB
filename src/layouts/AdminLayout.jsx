import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  LogOut, 
  Menu, 
  X,
  BookOpen,
  CheckSquare,
  RefreshCw
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { auth } from '../firebase/config';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
    { icon: <Users size={20} />, label: 'Batches', path: '/admin/batches' },
    { icon: <BookOpen size={20} />, label: 'Courses', path: '/admin/courses' },
    { icon: <Calendar size={20} />, label: 'Student History', path: '/admin/schedule' },
    { icon: <CheckSquare size={20} />, label: 'Attendance', path: '/admin/attendance' },
    { 
      icon: <RefreshCw size={20} />, 
      label: 'Reset Data', 
      path: '/admin/reset',
      className: 'text-red-600 hover:bg-red-50'
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-gray-900 text-white transition-all duration-300 ease-in-out z-30
          ${sidebarOpen ? 'w-64' : 'w-16'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {sidebarOpen && <h5 className="text-lg font-semibold">Admin Panel</h5>}
          <button 
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="mt-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center px-4 py-3 ${item.className || 'text-gray-300 hover:bg-gray-800 hover:text-white'} transition-colors`}
            >
              <span className="inline-flex items-center justify-center w-8 h-8">
                {item.icon}
              </span>
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors mt-auto"
          >
            <span className="inline-flex items-center justify-center w-8 h-8">
              <LogOut size={20} />
            </span>
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <header className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-800">
              Student Attendance Management
            </h1>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;