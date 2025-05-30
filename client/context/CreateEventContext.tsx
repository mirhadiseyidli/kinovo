import React, { createContext, useContext, useState } from 'react';
import { CreateEventContextType, Event, AttendeeFriend } from '@/types/allTypes';

type AttendeeStatus = 'pending' | 'maybe' | 'accepted' | 'rejected';

type EventAttendee = {
  user: AttendeeFriend;
  status?: AttendeeStatus;
};

const CreateEventContext = createContext<CreateEventContextType | null>(null);

export const CreateEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState<string>('');
  const [picture, setPicture] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: { lat: number | null; lng: number | null };
  }>({
    text: null,
    city: null,
    state: null,
    coordinates: { lat: null, lng: null },
  });
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [capacity, setCapacity] = useState<number | null>(null);
  const [recurrence, setRecurrence] = useState<{
    checked: boolean;
    frequency: string | null;
    end_date: Date | null;
  }>({
    checked: false,
    frequency: null,
    end_date: null,
  });
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [visibility, setVisibility] = useState<string>('private');

  const settingEventTitle = (name: string) => setTitle(name);
  const settingEventPicture = (picture: string | null) => setPicture(picture);
  const settingEventCategory = (category: string | null) => setCategory(category);
  const settingEventDescription = (description: string | null) => setDescription(description);
  const settingEventLocation = (location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: { lat: number | null; lng: number | null };
  }) => setLocation(location);
  const settingEventStartTime = (date: Date | null) => setStartTime(date);
  const settingEventEndTime = (date: Date | null) => setEndTime(date);
  const settingEventCapacity = (value: number | null) => setCapacity(value);
  const settingEventRecurrence = (data: { checked: boolean; frequency: string | null; end_date: Date | null }) => setRecurrence(data);
  const settingEventAttendees = (users: AttendeeFriend[]) => {
    if (capacity === null || users.length <= (capacity - 1)) {
      setAttendees(users.map(user => ({ user }))); // no status here
    }
  };
  const settingEventVisibility = (value: string) => {
    const lowerValue = value.toLowerCase();
    if (['public', 'private', 'selected'].includes(lowerValue)) {
      setVisibility(lowerValue);
    }
  };

  const compileEventData = (): Partial<Event> => {
    const compiledEvent = {
      event_picture: picture,
      status: 'upcoming',
      title,
      category,
      description,
      location,
      start_time: startTime!,
      end_time: endTime!,
      capacity,
      recurrence,
      attendees,
      visibility,
    } as Partial<Event>;

    setEvent(compiledEvent as Event);
    return compiledEvent;
  };

  const contextValue = {
    settingEventTitle,
    settingEventAttendees,
    settingEventCapacity,
    settingEventDescription,
    settingEventEndTime,
    settingEventLocation,
    settingEventPicture,
    settingEventRecurrence,
    settingEventStartTime,
    settingEventVisibility,
    settingEventCategory,
    compileEventData,
  };

  return (
    <CreateEventContext.Provider value={contextValue}>
      {children}
    </CreateEventContext.Provider>
  );
};

export const useCreateEventContext = () => {
  const context = useContext(CreateEventContext);
  if (!context) throw new Error('useCreateEventContext must be used inside CreateEventProvider');
  return context;
};