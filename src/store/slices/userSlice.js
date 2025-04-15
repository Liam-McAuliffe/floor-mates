import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[userSlice] Fetching user profile from API...');
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        let errorMsg = `Failed to fetch profile (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log('[userSlice] Profile data received:', data);
      return data;
    } catch (error) {
      console.error('[userSlice] fetchUserProfile error:', error);
      return rejectWithValue(error.message);
    }
  }
);

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
      console.log('[userSlice] Cleared user state.');
    },

    userProfileUpdated: (state, action) => {
      if (state.data && action.payload) {
        console.log('[userSlice] Updating profile state with:', action.payload);

        state.data.name = action.payload.name ?? state.data.name;
        state.data.major = action.payload.major ?? state.data.major;
        state.data.image = action.payload.image ?? state.data.image;
      } else if (action.payload) {
        state.data = action.payload;
      }
      state.status = 'succeeded';
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.data = null;
      });
  },
});

export const { clearUser, userProfileUpdated } = userSlice.actions;

export const selectUserProfile = (state) => state.user.data;
export const selectUserStatus = (state) => state.user.status;
export const selectUserError = (state) => state.user.error;

export default userSlice.reducer;
