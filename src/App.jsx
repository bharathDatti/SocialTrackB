import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { setUser, setLoading } from './store/slices/authSlice';
import { fetchBatches } from './store/slices/batchSlice';
import { fetchAllAttendance } from './store/slices/attendanceSlice';
import { fetchDashboardData } from './store/slices/dashboardSlice';
import AdminLayout from './layouts/AdminLayout';
import Login from './components/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';

// Lazy load components
const AdminDashboard = React.lazy(() => import('./components/admin/Dashboard'));
const BatchManagement = React.lazy(() => import('./components/admin/BatchManagement'));
const Courses = React.lazy(() => import('./components/admin/Courses'));
const Schedule = React.lazy(() => import('./components/admin/Schedule'));
const Attendance = React.lazy(() => import('./components/admin/Attendance'));
const StudentAttendance = React.lazy(() => import('./components/student/StudentAttendance'));
const AttendanceHistory = React.lazy(() => import('./components/student/AttendanceHistory'));
const ResetData = React.lazy(() => import('./components/admin/ResetData'));
const NotFound = React.lazy(() => import('./components/shared/NotFound'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="spinner-border text-primary-600" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

function App() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector(state => state.auth);

  useEffect(() => {
    if (user?.isAdmin) {
      dispatch(fetchBatches());
      dispatch(fetchAllAttendance());
      dispatch(fetchDashboardData());

      const batchesRef = collection(db, 'batches');
      const attendanceRef = collection(db, 'attendance');

      const batchesUnsubscribe = onSnapshot(
        query(batchesRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          const batches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
              updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now()
            };
          });
          dispatch(fetchBatches.fulfilled(batches));
        },
        (error) => {
          console.error('Error in batches listener:', error);
        }
      );

      const attendanceUnsubscribe = onSnapshot(
        query(attendanceRef, orderBy('timestamp', 'desc')),
        (snapshot) => {
          const records = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now()
            };
          });
          dispatch(fetchAllAttendance.fulfilled(records));
          dispatch(fetchDashboardData());
        },
        (error) => {
          console.error('Error in attendance listener:', error);
        }
      );

      return () => {
        batchesUnsubscribe();
        attendanceUnsubscribe();
      };
    }
  }, [user, dispatch]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email.endsWith('@admin.com')) {
        dispatch(setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          isAdmin: true
        }));
      } else {
        dispatch(setUser(null));
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            user?.isAdmin ? <Navigate to="/admin" replace /> : <Login />
          } 
        />

        {/* Student routes - Public */}
        <Route path="/student">
          <Route 
            path="attendance/:batchId" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <StudentAttendance />
              </Suspense>
            } 
          />
          <Route 
            path="attendance/history/:studentId" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AttendanceHistory />
              </Suspense>
            } 
          />
        </Route>

        {/* Admin routes - Private */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route 
            index 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminDashboard />
              </Suspense>
            } 
          />
          <Route 
            path="batches" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <BatchManagement />
              </Suspense>
            } 
          />
          <Route 
            path="courses" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Courses />
              </Suspense>
            } 
          />
          <Route 
            path="schedule" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Schedule />
              </Suspense>
            } 
          />
          <Route 
            path="attendance" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Attendance />
              </Suspense>
            } 
          />
          <Route 
            path="reset" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ResetData />
              </Suspense>
            } 
          />
        </Route>

        {/* Root redirect */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={user?.isAdmin ? "/admin" : "/login"} 
              replace 
            />
          } 
        />

        {/* 404 route */}
        <Route 
          path="*" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <NotFound />
            </Suspense>
          } 
        />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;