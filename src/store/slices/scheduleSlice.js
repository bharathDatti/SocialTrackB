import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const fetchStudentHistory = createAsyncThunk(
  'schedule/fetchStudentHistory',
  async ({ batchId, studentId }, { rejectWithValue }) => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('batchId', '==', batchId),
        where('studentId', '==', Number(studentId))
      );

      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now()
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Client-side sorting

      const total = history.length;
      const present = history.filter(record => record.status === 'present').length;
      const absent = total - present;
      const online = history.filter(record => record.mode === 'online').length;
      const offline = history.filter(record => record.mode === 'offline').length;
      const adminMarked = history.filter(record => record.markedByAdmin).length;
      const deviceMarked = history.filter(record => record.deviceId).length;
      const locationVerified = history.filter(record => record.location?.lat && record.location?.lng).length;

      return {
        history,
        stats: {
          total,
          present,
          absent,
          online,
          offline,
          percentage: total > 0 ? (present / total) * 100 : 0,
          adminMarked,
          deviceMarked,
          locationVerified
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  history: [],
  loading: false,
  error: null,
  stats: {
    total: 0,
    present: 0,
    absent: 0,
    online: 0,
    offline: 0,
    percentage: 0,
    adminMarked: 0,
    deviceMarked: 0,
    locationVerified: 0
  }
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    clearHistory: (state) => {
      state.history = [];
      state.stats = { ...initialState.stats };
      state.error = null;
    },
    updateHistory: (state, action) => {
      const newRecord = action.payload;
      
      // Ensure timestamp is a number
      if (!newRecord.timestamp || typeof newRecord.timestamp === 'object') {
        newRecord.timestamp = Date.now();
      }
      
      const exists = state.history.some(record => record.id === newRecord.id);
      if (!exists) {
        state.history.unshift(newRecord);
        
        // Update stats
        state.stats.total++;
        if (newRecord.status === 'present') {
          state.stats.present++;
          if (newRecord.mode === 'online') {
            state.stats.online++;
          } else {
            state.stats.offline++;
          }
        } else {
          state.stats.absent++;
        }
        
        if (newRecord.markedByAdmin) state.stats.adminMarked++;
        if (newRecord.deviceId) state.stats.deviceMarked++;
        if (newRecord.location?.lat && newRecord.location?.lng) {
          state.stats.locationVerified++;
        }
        
        state.stats.percentage = (state.stats.present / state.stats.total) * 100;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.history;
        state.stats = action.payload.stats;
      })
      .addCase(fetchStudentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.history = [];
        state.stats = { ...initialState.stats };
      });
  }
});

export const { clearHistory, updateHistory } = scheduleSlice.actions;
export default scheduleSlice.reducer;