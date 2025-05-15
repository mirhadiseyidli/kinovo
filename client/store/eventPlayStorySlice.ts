import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StoryState {
  storyPlaying: boolean;
}

const initialState: StoryState = {
  storyPlaying: false,
};

const storyPlaySlice = createSlice({
  name: 'story',
  initialState,
  reducers: {
    setStoryPlaying(state, action: PayloadAction<boolean>) {
      state.storyPlaying = action.payload;
    },
  },
});

export const { setStoryPlaying } = storyPlaySlice.actions;
export const selectStoryPlaying = (state: any) => state.story.storyPlaying;
export default storyPlaySlice.reducer;