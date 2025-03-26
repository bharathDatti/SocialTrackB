import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Fetch all batches
export const fetchBatches = createAsyncThunk(
  'batches/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const batchesRef = collection(db, 'batches');
      const q = query(batchesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
          updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now(),
          students: data.students || []
        };
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add a new batch
export const addNewBatch = createAsyncThunk(
  'batches/addBatch',
  async (batchData, { rejectWithValue, dispatch }) => {
    try {
      const newBatch = {
        ...batchData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        students: batchData.students || []
      };
      const docRef = await addDoc(collection(db, 'batches'), newBatch);
      const result = { 
        ...newBatch, 
        id: docRef.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await dispatch(fetchBatches()).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update an existing batch
export const updateExistingBatch = createAsyncThunk(
  'batches/updateBatch',
  async ({ id, batchData }, { rejectWithValue, dispatch }) => {
    try {
      const batchRef = doc(db, 'batches', id);
      const updatedBatch = {
        ...batchData,
        updatedAt: serverTimestamp()
      };
      await updateDoc(batchRef, updatedBatch);
      const result = { 
        ...updatedBatch, 
        id,
        updatedAt: Date.now()
      };
      await dispatch(fetchBatches()).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a batch
export const deleteExistingBatch = createAsyncThunk(
  'batches/deleteBatch',
  async (batchId, { rejectWithValue, dispatch }) => {
    try {
      const batchRef = doc(db, 'batches', batchId);
      await deleteDoc(batchRef);
      await dispatch(fetchBatches()).unwrap();
      return batchId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  batches: [],
  loading: false,
  error: null,
  stats: {
    totalBatches: 0,
    totalStudents: 0,
    onlineStudents: 0,
    offlineStudents: 0,
    activeBatches: 0
  }
};

const batchSlice = createSlice({
  name: 'batches',
  initialState,
  reducers: {
    updateBatchStats: (state) => {
      state.stats = {
        totalBatches: state.batches.length,
        totalStudents: state.batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
        onlineStudents: state.batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
        offlineStudents: state.batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
        activeBatches: state.batches.filter(batch => batch.students?.length > 0).length
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload;
        state.stats = {
          totalBatches: action.payload.length,
          totalStudents: action.payload.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
          onlineStudents: action.payload.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
          offlineStudents: action.payload.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
          activeBatches: action.payload.filter(batch => batch.students?.length > 0).length
        };
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addNewBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewBatch.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addNewBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateExistingBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingBatch.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateExistingBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteExistingBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExistingBatch.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteExistingBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { updateBatchStats } = batchSlice.actions;
export default batchSlice.reducer;