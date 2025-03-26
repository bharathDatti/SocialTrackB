import React from 'react';
import { Outlet } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary-600" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                Student Attendance
              </h1>
            </div>
          </div>
        </div>
      </header>
      
      <main>
        <Outlet />
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SocialTrack by SocialPrachar. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StudentLayout;