// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import eventStoriesReducer from './eventStoriesSlice';
import storyPlayReducer from './eventPlayStorySlice';

export const store = configureStore({
  reducer: {
    eventStories: eventStoriesReducer,
    story: storyPlayReducer,
    // ...other reducers
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;