import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  status: 'idle',
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,

  reducers: {
    clearUser: (state) => {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    },
  },
});

export const { clearUser } = userSlice.actions;

export const selectUserProfile = (state) => state.user.data;
export const selectUserStatus = (state) => state.user.status;
export const selectUserError = (state) => state.user.error;

export default userSlice.reducer;
