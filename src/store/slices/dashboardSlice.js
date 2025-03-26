import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Async thunk for fetching dashboard data
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async () => {
    try {
      // Get today's date range
      const today = new Date();
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();
      
      // Get last 7 days for trends
      const last7Days = subDays(today, 7).toISOString();

      // Fetch today's attendance
      const attendanceRef = collection(db, 'attendance');
      const todayQuery = query(
        attendanceRef,
        where('date', '>=', startToday),
        where('date', '<=', endToday)
      );
      const todaySnapshot = await getDocs(todayQuery);
      const todayAttendance = todaySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          date: data.date || new Date().toISOString()
        };
      });

      // Fetch last 7 days attendance for trends
      const trendQuery = query(
        attendanceRef,
        where('date', '>=', last7Days),
        orderBy('date', 'desc')
      );
      const trendSnapshot = await getDocs(trendQuery);
      const attendanceTrends = trendSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          date: data.date || new Date().toISOString()
        };
      });

      // Fetch recent activities
      const recentQuery = query(
        attendanceRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const recentSnapshot = await getDocs(recentQuery);
      const recentActivities = recentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          date: data.date || new Date().toISOString()
        };
      });

      return {
        todayAttendance,
        attendanceTrends,
        recentActivities
      };
    } catch (error) {
      throw error;
    }
  }
);

const initialState = {
  todayAttendance: [],
  attendanceTrends: [],
  recentActivities: [],
  loading: false,
  error: null,
  stats: {
    todayPresent: 0,
    todayAbsent: 0,
    todayTotal: 0,
    weeklyAverage: 0,
    onlinePresent: 0,
    offlinePresent: 0
  }
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateStats: (state) => {
      // Update today's stats
      const todayPresent = state.todayAttendance.filter(record => record.status === 'present').length;
      const todayTotal = state.todayAttendance.length;
      
      // Calculate mode-wise attendance
      const onlinePresent = state.todayAttendance.filter(record => 
        record.status === 'present' && record.mode === 'online'
      ).length;
      const offlinePresent = state.todayAttendance.filter(record => 
        record.status === 'present' && record.mode === 'offline'
      ).length;
      
      // Calculate weekly average
      const weeklyPresent = state.attendanceTrends.filter(record => record.status === 'present').length;
      const weeklyTotal = state.attendanceTrends.length;
      
      state.stats = {
        todayPresent,
        todayAbsent: todayTotal - todayPresent,
        todayTotal,
        weeklyAverage: weeklyTotal ? (weeklyPresent / weeklyTotal) * 100 : 0,
        onlinePresent,
        offlinePresent
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAttendance = action.payload.todayAttendance;
        state.attendanceTrends = action.payload.attendanceTrends;
        state.recentActivities = action.payload.recentActivities;
        
        // Update stats
        const todayPresent = action.payload.todayAttendance.filter(record => record.status === 'present').length;
        const todayTotal = action.payload.todayAttendance.length;
        const onlinePresent = action.payload.todayAttendance.filter(record => 
          record.status === 'present' && record.mode === 'online'
        ).length;
        const offlinePresent = action.payload.todayAttendance.filter(record => 
          record.status === 'present' && record.mode === 'offline'
        ).length;
        const weeklyPresent = action.payload.attendanceTrends.filter(record => record.status === 'present').length;
        const weeklyTotal = action.payload.attendanceTrends.length;
        
        state.stats = {
          todayPresent,
          todayAbsent: todayTotal - todayPresent,
          todayTotal,
          weeklyAverage: weeklyTotal ? (weeklyPresent / weeklyTotal) * 100 : 0,
          onlinePresent,
          offlinePresent
        };
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { updateStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;