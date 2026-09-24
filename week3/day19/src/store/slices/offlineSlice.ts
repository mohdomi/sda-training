import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineState {
  isOnline: boolean;
  queueLength: number;
}

const initialState: OfflineState = {
  isOnline: true,
  queueLength: 0,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setQueueLength: (state, action: PayloadAction<number>) => {
      state.queueLength = action.payload;
    },
  },
});

export const { setOnlineStatus, setQueueLength } = offlineSlice.actions;
export default offlineSlice.reducer;
