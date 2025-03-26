import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { startOfDay, endOfDay } from 'date-fns';

// Async thunk for updating attendance status
export const updateAttendanceStatus = createAsyncThunk(
  'attendance/updateStatus',
  async ({ attendanceId, newStatus }) => {
    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      const updateData = {
        status: newStatus,
        markedByAdmin: true,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(attendanceRef, updateData);
      
      return {
        id: attendanceId,
        ...updateData,
        timestamp: Date.now() // Use client timestamp for Redux store
      };
    } catch (error) {
      throw new Error(`Failed to update attendance: ${error.message}`);
    }
  }
);

// Existing thunks remain unchanged
export const fetchAllAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async () => {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis() || Date.now()
    }));
  }
);

export const fetchTodayAttendance = createAsyncThunk(
  'attendance/fetchToday',
  async (batchId) => {
    const attendanceRef = collection(db, 'attendance');
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());

    const q = query(
      attendanceRef,
      where('batchId', '==', batchId),
      where('date', '>=', today.toISOString()),
      where('date', '<=', tomorrow.toISOString())
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toMillis() || Date.now()
    }));
  }
);

const initialState = {
  allRecords: [],
  todayRecords: [],
  loading: false,
  error: null,
  stats: {
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
    adminMarked: 0,
    deviceMarked: 0,
    locationVerified: 0
  }
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    addAttendanceRecord: (state, action) => {
      const newRecord = action.payload;
      state.allRecords.unshift(newRecord);
      state.todayRecords.unshift(newRecord);
      
      // Update stats
      state.stats.total++;
      if (newRecord.status === 'present') {
        state.stats.present++;
      } else {
        state.stats.absent++;
      }
      if (newRecord.markedByAdmin) state.stats.adminMarked++;
      if (newRecord.deviceId) state.stats.deviceMarked++;
      if (newRecord.location?.lat && newRecord.location?.lng) {
        state.stats.locationVerified++;
      }
      
      state.stats.percentage = (state.stats.present / state.stats.total) * 100;
    },
    clearAttendance: (state) => {
      state.todayRecords = [];
      state.stats = { ...initialState.stats };
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchAllAttendance
      .addCase(fetchAllAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.allRecords = action.payload;
        
        // Update stats
        const records = action.payload;
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0
        };
      })
      .addCase(fetchAllAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Handle fetchTodayAttendance
      .addCase(fetchTodayAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.todayRecords = action.payload;
        
        // Update today's stats
        const records = action.payload;
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0
        };
      })
      .addCase(fetchTodayAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Handle updateAttendanceStatus
      .addCase(updateAttendanceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAttendanceStatus.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update record in both collections
        const updateRecordInList = (records) => {
          const index = records.findIndex(r => r.id === action.payload.id);
          if (index !== -1) {
            records[index] = {
              ...records[index],
              ...action.payload,
              markedByAdmin: true
            };
          }
        };
        
        updateRecordInList(state.allRecords);
        updateRecordInList(state.todayRecords);
        
        // Recalculate stats
        const records = state.todayRecords;
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0
        };
      })
      .addCase(updateAttendanceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { addAttendanceRecord, clearAttendance } = attendanceSlice.actions;

export default attendanceSlice.reducer;