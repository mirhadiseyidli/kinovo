import React, { createContext, useContext, useState, useEffect } from 'react';
import { CreateEventContextType, Event, AttendeeFriend } from '@/types/allTypes';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useNewEventMutations';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AttendeeStatus = 'pending' | 'maybe' | 'accepted' | 'rejected';

type EventAttendee = {
  user: AttendeeFriend;
  status?: AttendeeStatus;
};

type ValidationErrors = {
  title?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
};

const CreateEventContext = createContext<CreateEventContextType | null>(null);

export const CreateEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Event data state
  const [title, setTitle] = useState<string>('');
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
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
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

  // Add state for original recurrence status
  const [originalRecurrenceChecked, setOriginalRecurrenceChecked] = useState<boolean>(false);

  // Form state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [eventId, setEventId] = useState<string | null>(null);

  // TanStack Query mutations
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();

  // Define loadEventForEdit separately first
  const loadEventForEdit = (eventToEdit: Event) => {
    setTitle(eventToEdit.title || '');
    setCategory(eventToEdit.category || null);
    setDescription(eventToEdit.description || null);
    setLocation(eventToEdit.location || {
      text: null,
      city: null,
      state: null,
      coordinates: { lat: null, lng: null },
    });
    setStartTime(eventToEdit.start_time ? new Date(eventToEdit.start_time) : new Date());
    setEndTime(eventToEdit.end_time ? new Date(eventToEdit.end_time) : new Date());
    setCapacity(eventToEdit.capacity || null);
    setRecurrence(eventToEdit.recurrence || {
      checked: false,
      frequency: null,
      end_date: null,
    });
    setAttendees(eventToEdit.attendees || []);
    setVisibility(eventToEdit.visibility || 'private');
    // Track original recurrence status
    setOriginalRecurrenceChecked(eventToEdit.recurrence?.checked ?? false);
    setIsEditMode(true);
    setEventId(eventToEdit._id || null);
  };

  // Check for edit mode on mount
  useEffect(() => {
    const checkEditMode = async () => {
      try {
        // Check if we're in edit mode
        const isEditMode = await AsyncStorage.getItem('isEditMode');
        if (isEditMode === 'true') {
          // Get the event data
          const eventData = await AsyncStorage.getItem('editingEvent');
          if (eventData) {
            // Parse the event data
            const eventToEdit = JSON.parse(eventData);
            // Load the event data for editing
            loadEventForEdit(eventToEdit);
            // Clear the AsyncStorage
            await AsyncStorage.removeItem('editingEvent');
            await AsyncStorage.removeItem('isEditMode');
          }
        }
      } catch (error) {
        console.error('Error checking edit mode:', error);
      }
    };

    checkEditMode();
  }, []);

  // Form setting functions
  const settingEventTitle = (name: string) => {
    setTitle(name);
    // Clear validation error when field is updated
    if (name.trim() && validationErrors.title) {
      setValidationErrors(prev => ({ ...prev, title: undefined }));
    }
  };
  
  const settingEventCategory = (category: string | null) => {
    setCategory(category);
    if (category && validationErrors.category) {
      setValidationErrors(prev => ({ ...prev, category: undefined }));
    }
  };
  
  const settingEventDescription = (description: string | null) => setDescription(description);
  
  const settingEventLocation = (location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: { lat: number | null; lng: number | null };
  }) => {
    setLocation(location);
    if (location.text && validationErrors.location) {
      setValidationErrors(prev => ({ ...prev, location: undefined }));
    }
  };
  
  const settingEventStartTime = (date: Date | null) => {
    setStartTime(date);
    if (date && validationErrors.startTime) {
      setValidationErrors(prev => ({ ...prev, startTime: undefined }));
    }
    // Validate end time is after start time
    if (date && endTime && date >= endTime) {
      setValidationErrors(prev => ({ 
        ...prev, 
        endTime: 'End time must be after start time' 
      }));
    } else if (validationErrors.endTime) {
      setValidationErrors(prev => ({ ...prev, endTime: undefined }));
    }
  };
  
  const settingEventEndTime = (date: Date | null) => {
    setEndTime(date);
    if (date && validationErrors.endTime) {
      setValidationErrors(prev => ({ ...prev, endTime: undefined }));
    }
    // Validate end time is after start time
    if (startTime && date && startTime >= date) {
      setValidationErrors(prev => ({ 
        ...prev, 
        endTime: 'End time must be after start time' 
      }));
    }
  };
  
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

  // Validation function
  const validateEvent = (): boolean => {
    const errors: ValidationErrors = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    }

    if (!category) {
      errors.category = 'Category is required';
    }

    if (!startTime) {
      errors.startTime = 'Start time is required';
    }

    if (!endTime) {
      errors.endTime = 'End time is required';
    } else if (startTime && endTime && startTime >= endTime) {
      errors.endTime = 'End time must be after start time';
    }

    if (!location.text) {
      errors.location = 'Location is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset function
  const resetEventForm = () => {
    setTitle('');
    setCategory(null);
    setDescription(null);
    setLocation({
      text: null,
      city: null,
      state: null,
      coordinates: { lat: null, lng: null },
    });
    setStartTime(new Date());
    setEndTime(new Date());
    setCapacity(null);
    setRecurrence({
      checked: false,
      frequency: null,
      end_date: null,
    });
    setAttendees([]);
    setVisibility('private');
    setValidationErrors({});
    setError(null);
    setIsEditMode(false);
    setEventId(null);
    setOriginalRecurrenceChecked(false); // Reset original recurrence status
  };

  // Compile event data
  const compileEventData = (): Partial<Event> => {
    const compiledEvent = {
      _id: eventId, // Only used when in edit mode
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

    return compiledEvent;
  };

  // Create or update event
  const createOrUpdateEvent = async (): Promise<{ success: boolean, eventId?: string }> => {
    if (!validateEvent()) {
      return { success: false };
    }

    setLoading(true);
    setError(null);

    try {
      const eventData = compileEventData();
      let response;
      
      // Call API based on whether we're creating or editing
      if (isEditMode && eventId) {
        response = await updateEventMutation.mutateAsync({ eventId: eventId, ...eventData });
      } else {
        response = await createEventMutation.mutateAsync(eventData);
      }
      
      if (response?.success) {
        resetEventForm();
      }
      
      setLoading(false);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save event';
      setError(errorMessage);
      setLoading(false);
      
      // Show error alert
      Alert.alert(
        'Error',
        errorMessage
      );
      
      return { success: false };
    }
  };

  const contextValue = {
    // Form values
    title,
    category,
    description,
    location,
    startTime,
    endTime,
    capacity,
    recurrence,
    attendees,
    visibility,
    isEditMode,
    eventId,
    originalRecurrenceChecked,
    
    // Form state
    validationErrors,
    loading,
    error,
    setLoading,
    setError,
    
    // Setter functions
    settingEventTitle,
    settingEventAttendees,
    settingEventCapacity,
    settingEventDescription,
    settingEventEndTime,
    settingEventLocation,
    settingEventRecurrence,
    settingEventStartTime,
    settingEventVisibility,
    settingEventCategory,
    
    // Actions
    compileEventData,
    validateEvent,
    resetEventForm,
    loadEventForEdit,
    createOrUpdateEvent,
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