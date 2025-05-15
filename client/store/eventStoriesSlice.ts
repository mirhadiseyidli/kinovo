// store/eventStoriesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FriendEventActivity } from '@/types/allTypes';

type EventStoryState = {
  eventMap: Record<string, FriendEventActivity[]>;
};

const initialState: EventStoryState = {
  eventMap: {},
};

export const eventStoriesSlice = createSlice({
  name: 'eventStories',
  initialState,
  reducers: {
    setEventsForFriend: (
      state,
      action: PayloadAction<{ friendId: string; events: FriendEventActivity[] }>
    ) => {
      const { friendId, events } = action.payload;
      state.eventMap[friendId] = events;
    },
  },
});

export const { setEventsForFriend } = eventStoriesSlice.actions;
export default eventStoriesSlice.reducer;