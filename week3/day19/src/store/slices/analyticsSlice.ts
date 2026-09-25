import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/apiService';
import type { AnalyticsData } from '../../types';

interface AnalyticsState {
  data: AnalyticsData | null;
  timeRange: string;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  data: null,
  timeRange: '30d',
  loading: false,
  error: null,
};

export const fetchAnalytics = createAsyncThunk(
  'analytics/fetchAnalytics',
  async (timeRange: string = '30d', { rejectWithValue }) => {
    try {
      const response = await apiService.getAnalytics(timeRange);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default analyticsSlice.reducer;
