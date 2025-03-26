import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import batchReducer from './slices/batchSlice';
import attendanceReducer from './slices/attendanceSlice';
import scheduleReducer from './slices/scheduleSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    batches: batchReducer,
    attendance: attendanceReducer,
    schedule: scheduleReducer,
    dashboard: dashboardReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'attendance/addAttendanceRecord',
          'attendance/setAttendanceRecords',
          'attendance/updateAttendanceStatus/fulfilled',
          'dashboard/fetchData/fulfilled',
          'schedule/updateHistory',
          'schedule/fetchStudentHistory/fulfilled'
        ],
        ignoredActionPaths: [
          'meta.arg',
          'payload.arg',
          'payload.timestamp',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.date'
        ],
        ignoredPaths: [
          'attendance.allRecords',
          'attendance.todayRecords',
          'dashboard.recentActivities',
          'dashboard.todayAttendance',
          'dashboard.attendanceTrends',
          'schedule.history'
        ],
      },
    }),
});

export default store;