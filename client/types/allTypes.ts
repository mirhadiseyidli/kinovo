import { 
  ImageSourcePropType, 
  NativeSyntheticEvent, 
  NativeScrollEvent, 
  ViewStyle, 
  TextStyle, 
  TextInputProps,
  TextProps,
  ViewProps
} from 'react-native';
import { AxiosError } from 'axios';
import type { RefObject } from 'react';
// import { DateTimePickerEvent } from '@expo/ui/DatePicker';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { IconSymbolName } from '@/components/ui/IconSymbol';
import { AnimatedStyle, DerivedValue, SharedValue } from 'react-native-reanimated';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { JwtPayload } from 'jwt-decode';

// =========================
// User-related Types
// =========================
export interface User {
  _id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string;
  email: string;
  email_verified: boolean;
  phone_number: {
    country_code: string | null;
    area_code: string | null;
    phone_num: string | null;
    full_num: string | null;
  };
  google_id?: string;
  apple_id?: string;
  profile_picture?: string;
  cover_photo?: string;
  bio?: string;
  date_of_birth?: Date;
  created_at: Date;
  last_login_at?: Date;
  friends?: any[];
  events?: {
    event: Event; // Make sure 'Events' is imported
    status: 'pending' | 'maybe' | 'accepted' | 'rejected';
  }[];
  location?: {
    city: string | null;
    state: string | null;
    text?: string | null;
    coordinates?: {
      lat: number | null;
      lng: number | null;
    };
  };
  favorite_activities?: string[];
  social_handles?: {
    instagram?: {
      username: string | null;
    };
    facebook?: {
      username: string | null;
    };
  };
  mutualFriendsCount: number;
}

export type UserProp = {
  user: User;
};

// =========================
// Navigation Param Lists
// =========================

export type CreateEventTabParamList = {
  "Details": undefined;
  'Date & Location': undefined;
  'Attendees & Options': undefined;
};

// =========================
// Request Location Context Props
// =========================

export interface LocationContextProps {
  locationPermission: boolean | null;
}

// =========================
// Map Param Lists
// =========================

export type Suggestion = {
  displayName: { text: string };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  postalAddress: CityAndState
};

export type CityAndState = {
  locality: string;
  administrativeArea: string;
}

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeocodingApiResult = {
  formatted_address: string;
  postalAddress: CityAndState;
  geometry: {
    location: Coordinates;
  };
};

export type LocationSelectHandler = (
  text: string,
  city: string,
  state: string,
  location: Coordinates,
) => Promise<void>;

export type SelectedLocation = string | null;

export type FetchAddressSuggestions = (text: string) => Promise<void>;

export interface MapViewModalProps {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  selectedLocation: string | null;
}

export interface OpenMapsAndNavigateButtonProps {
  selectedLocation: string | null;
  latitude: number;
  longitude: number;
}

// =========================
// Edit Location Types
// =========================

export interface EditUserLocationProps {
  label: string;
  locationInput: string;
  setLocationInput: (text: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  themeColors: {
    text: string;
    placeholderTextColor: string;
    inputBackgroundColor: string;
    background: string;
  };
  setLocationCity: (text: string) => void;
  setLocationState: (text: string) => void;
  setLocationLatitude: (lat: number | null) => void;
  setLocationLongitude: (lng: number | null) => void;
  setPlaceId: (id: string) => void;
}

export interface PlaceSuggestion {
  placePrediction: {
    text: {
      text: string;
    };
    placeId: string;
  };
}

export interface PlaceDetails {
  addressComponents: Array<{
    longText: string;
    types: string[];
  }>;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
}

// =========================
// Friend Request
// =========================

export type FriendRequest = {
  _id: string;
  sender: {
    _id: string;
    full_name: string;
    username: string;
    profile_picture: string;
  };
};

// =========================
// Friend
// =========================

export type Friend = {
  _id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string;
  profile_picture: string;
};

export interface BaseFriend {
  _id?: string;
  full_name?: string;
  username?: string;
  profile_picture?: any;
}

export interface FriendProps extends BaseFriend {
  eventCount?: number;
  activityData?: FriendEventActivity[];
  size?: number;
  showName?: boolean;
  displayName?: string;
}

export interface AttendeeFriend extends BaseFriend {}

export type FriendEventActivity = {
  _id: string;
  added_at: string;
  event: Event;
  friend: User;
};


// =========================
// Auth-related Types
// =========================

export interface AuthLoginProps {
  onLoginSuccess: (accessToken: string, refreshToken: string, userId: string, firebaseToken?: string) => void;
  onLoginStart?: () => void;
  onLoginError?: () => void;
}

export interface EmailLoginProps {
  onLoginSuccess: (accessToken: string, refreshToken: string, userId: string) => void;
  onLoginStart?: () => void;
  onLoginError?: () => void;
}

export type TokenTypes = (accessToken: string, refreshToken: string, userId: string, firebaseToken?: string) => void;


export interface AuthButtonProps {
  onPress: () => void; // Function to handle button press
  logo: keyof typeof FontAwesome.glyphMap; // Path to the logo image
  backgroundColor?: string; // Optional background color
}

export interface AuthContextType {
  signIn: (accessToken: string, refreshToken: string, userId: string, firebaseToken?: string) => void;
  signOut: () => void;
  accessToken: RefObject<string | null> | null;
  refreshToken: RefObject<string | null> | null;
  firebaseToken: RefObject<string | null> | null;
  isLoading: boolean;
  refreshAccessToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  userId?: string;
  isFirebaseAuthenticated: boolean;
}

// =========================
// Date & Time Types
// =========================

export interface DateTimeState {
  startDate: Date;
  endDate: Date;
  tempStartDate: Date;
  tempEndDate: Date;
  showStartPicker: boolean;
  showEndPicker: boolean;
}

export type DatePickerChangeHandler = (
  event: DateTimePickerEvent,
  selectedDate?: Date
) => void;

// =========================
// Utility Types
// =========================

export type ApiError = AxiosError<{ message?: string }>;

// =========================
// Text Change & Input Types
// =========================

export interface ChangeEventHandler {
  input: string;
  handleTextChange: (text: string) => void;
}

// =========================
// Create Event Image Types
// =========================

export interface EventImageProps {
  eventType?: string;
}

export type UploadedImage = string | null;

// =========================
// Create Event Category Types
// =========================

export type CategoryType = string;

export interface Category {
  _id: string;
  name: string;
  icon?: string;
}

export interface CategoryProps {
  onCategorySelect: (category: string) => void;
}

export interface ExploreCategoryProps {
  iconName: any;
  label: string;
  iconColor: string;
  onPress?: () => void;
}

// =========================
// Suggested Event Types
// =========================

export interface SuggestedEventProps {
  event: Event;
}

// =========================
// Nearby Event Types
// =========================

export type NearbyEvent = {
  id: number;
  title: string;
  location: string;
  date: string;
  time: string;
  imageUrl: number;
};

// =========================
// Activity Types
// =========================

export interface ActivityProps {
  friendName: string;
  friendImage: any;
  activityTitle: string;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
}

// =========================
// City Types
// =========================

export interface CityProps {
  name: string;
  image: any; // Use ImageSourcePropType if using local images
  onPress?: () => void;
}

// =========================
// Horizontal Carousel Scroll Handler Event Types
// =========================

export type ScrollHandlerEvent = NativeSyntheticEvent<NativeScrollEvent>;

// =========================
// Past Event Types
// =========================

export interface PastEventProps {
  title: string;
  date: string;
  attendees: { _id: string; name: string; image: any; eventCount: number }[];
  image: any;
}

export type Attendee = {
  _id: string;
  name: string;
  image: number; // from require()
  eventCount: number;
};

export type PastEventItem = {
  id: number;
  title: string;
  date: string;
  attendees: Attendee[];
  image: number; // from require()
};

// =========================
// Upcoming Event Types
// =========================

export interface UpcomingEventProps {
  friendName: string;
  friendImage: ImageSourcePropType;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  remainingDays: string;
  eventImage: ImageSourcePropType;
}

// Grouped events by month (e.g., "June", "This Month", etc.)
export type GroupedEvents = {
  [key: string]: PastEventItem[];
};

// =========================
// Date of Birth Types
// =========================

export type EditDateOfBirthProps = {
  dateOfBirth: Date | null;
  setDateOfBirth: (dob: Date | null) => void;
};

// =========================
// Edit Social Media Handle Types
// =========================

export interface EditSocialMediaHandleProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  iconName: React.ComponentProps<typeof Feather>['name'];
}

// =========================
// Edit User Bio Types
// =========================

export interface EditUserBioProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

// =========================
// User Cover Photos Types
// =========================

export interface EditUserCoverPhotosProps {
  user: {
    coverPhoto?: string;
  };
}

export interface UserCoverPhotoProps {
  cover_photo?: string | null;
}

// =========================
// User Profile Photos Types
// =========================

export interface EditUserProfilePhotosProps {
  user: User;
}

export interface UserProfilePhotoProps {
  profile_picture?: string | null;
  firstName?: string;
  lastName?: string;
}

// =========================
// Edit User Name Types
// =========================

export interface EditUserNameProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

// =========================
// Edit User Profile Params Types
// =========================

export interface EditUserProfileParams {
  firstName: string;
  lastName: string;
  bio: string;
  locationCity: string;
  locationState: string;
  locationInput: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  instagramUsername: string;
  facebookUsername: string;
  dateOfBirth: Date | null;
}

// =========================
// Favorite Activities Types
// =========================

export interface FavoriteActivitiesProps {
  activities: string[];
}

export interface FavoriteActivityProps {
  activity: string;
}

// =========================
// Save User Changes Button Types
// =========================

export interface SaveUserChangesButtonProps {
  isLoading: boolean;
  onPress: () => void;
}

// =========================
// User General Info Types
// =========================

export interface UserGeneralInfoProps {
  _id: string;
}

export interface UserProfileBasicInfoProps {
  full_name?: string | null;
  username?: string | null;
  number_of_friends?: number | null;
  number_of_events?: number | null;
  number_of_activities?: number | null;
}

// =========================
// Friend List User Item Types
// =========================

export interface FriendListUserItemProps {
  _id: string;
  name: string;
  subtitle?: string;
  avatarUri?: string;
  status: 'onKinovo' | 'invite' | 'request' | 'manageFriend' | 'manageTagFriend' | 'requestSent' | 'alreadyFriends';
  mutualFriendsCount?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  onInvite?: () => void;
  onEdit?: () => void;
  tagName?: string;
}

export interface FriendListUserItemCardProps {
  _id: string;
  name: string;
  subtitle?: string;
  mutualFriendsNumber: number;
  avatarUri?: string;
  status: 'onKinovo' | 'invite' | 'mutual' | 'request' | 'declineOnly' | 'suggestions';
  onAdd?: () => void;
  style?: ViewStyle;
}

// =========================
// Setting Item Types
// =========================

export interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  enabled?: boolean;
}

export interface SettingsPageHeaderProps {
  label: string;
}

// =========================
// Sign Out Item Types
// =========================

export interface SignOutItemProps {
  onPress: () => void;
}

// =========================
// Delete Account Types
// =========================

export interface DeleteAccountProps {
  onPress: () => void;
}

// =========================
// Manage Friend Button Types
// =========================

export interface ManageFriendButtonProps {
  targetUser: string;
  loadingFriendAction: boolean;
  buttonFlex?: number;
}

// =========================
// Custom Button Types
// =========================

export interface ButtonWithLabelProps {
  label: string;
  onPress: () => void;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  children?: React.ReactNode;
}

// =========================
// Custom Input Types
// =========================

export interface InputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
}

// =========================
// Navigate Back Button Types
// =========================

export interface NavigateBackButtonProps {
  iconName?: IconSymbolName;
  size?: number;
  color?: string;
  backgroundColor?: string;
  top?: number;
  left?: number;
}

// =========================
// Saved Message Types
// =========================

export interface SavedMessageProps {
  visible?: boolean;
}

// =========================
// Search Bar Types
// =========================

export interface SearchBarProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  suggestions: {
    users: User[];
    events: Event[];
  };
  handleAdd: (friend: AttendeeFriend) => void;
  placeholder: string;
}

export interface SearchFriendsProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export type SearchUsersFriendsBarProps = {
  inputValue: string;
  setInputValue: (val: string) => void;
  suggestions: AttendeeFriend[];
  handleAdd: (friend: AttendeeFriend) => void;
  placeholder: string;
};

// =========================
// Themed Text & View Types
// =========================

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

// =========================
// User Profile Action Menu Button Types
// =========================

export interface UserProfileActionMenuButtonProps {
  showOptions: boolean;
  setShowOptions: (val: boolean) => void;
  onReportUser: () => void;
  onBlockUser: () => void;
  top?: number;
  right?: number;
}

// =========================
// Friend Request Types
// =========================

export interface FriendRequestStatusProps {
  _id: string;
  sender: string;
  receiver: string;
  status: 'pending' | null;
  created_at: string;
  direction?: 'sent' | 'received';
}

// =========================
// User Event Types
// ========================

export interface Event {
  _id?: string;
  creator?: User;
  event_picture?: string | null;
  status: string;
  created_at?: Date;
  title: string;
  category: string | null;
  description?: string | null;
  location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: {
      lat: number | null;
      lng: number | null;
    };
  };
  start_time: Date | null;
  end_time: Date | null;
  capacity?: number | null;
  recurrence?: {
    checked: boolean;
    frequency: string | null;
    end_date: Date | null;
  };
  attendees?: {
    user: User; // Make sure 'Events' is imported
    status: 'pending' | 'maybe' | 'accepted' | 'rejected';
  }[];
  visibility: string;
  // User's status for this event (from the user's events array)
  userStatus?: 'pending' | 'maybe' | 'accepted' | 'rejected';
  // Properties for recurring event occurrences (added by backend)
  originalEventId?: string;        // Reference to original recurring event
  isRecurringOccurrence?: boolean; // Flag to identify recurring occurrences
}

export type EventProp = {
  event: Event
}

export type ReportEventButtonProps = {
  onPress: () => void;
  themeColors: any;
};


export interface EventTitleAndCategoryProps {
  title: string;
  category: string | null;
}

export interface EventTimeAndDateProps {
  startLabel: string;
  endLabel: string;
}

export interface EventRecurrenceProps {
  frequency: string | null;
  endDate: Date | null;
}

export interface EventLocationInfoProps {
  location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: {
      lat: number | null;
      lng: number | null;
    };
  };
}

export interface EventVisibilityInfoProps {
  visibility: string;
}

export type ValidationErrors = {
  title?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
};

export interface CreateEventContextType {
  // Form values
  title: string;
  category: string | null;
  description: string | null;
  location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: { lat: number | null; lng: number | null };
  };
  startTime: Date | null;
  endTime: Date | null;
  capacity: number | null;
  recurrence: {
    checked: boolean;
    frequency: string | null;
    end_date: Date | null;
  };
  attendees: {
    user: AttendeeFriend;
    status?: 'pending' | 'maybe' | 'accepted' | 'rejected';
  }[];
  visibility: string;
  isEditMode: boolean;
  eventId: string | null;
  originalRecurrenceChecked: boolean;
  
  // Form state
  validationErrors: ValidationErrors;
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Setter functions
  settingEventTitle: (name: string) => void;
  settingEventAttendees: (users: AttendeeFriend[]) => void;
  settingEventCapacity: (value: number | null) => void;
  settingEventDescription: (description: string | null) => void;
  settingEventEndTime: (date: Date | null) => void;
  settingEventLocation: (location: { text: string | null; city: string | null; state: string | null; coordinates: { lat: number | null; lng: number | null }}) => void;
  settingEventRecurrence: (data: { checked: boolean; frequency: string | null; end_date: Date | null }) => void;
  settingEventStartTime: (date: Date | null) => void;
  settingEventVisibility: (value: string) => void;
  settingEventCategory: (category: string | null) => void;
  
  // Actions
  compileEventData: () => Partial<Event>;
  validateEvent: () => boolean;
  resetEventForm: () => void;
  loadEventForEdit: (eventToEdit: Event) => void;
  createOrUpdateEvent: () => Promise<{ success: boolean, eventId?: string }>;
}

// =========================
// Show Month List Types
// ========================

export type MonthToggleRef = {
  update: (date: Date) => void;
  currentDate: Date;
};

export interface MonthListToggleProps {
  title: string;
  year: number;
  monthListOpen: boolean;
  setMonthListOpen: (visible: boolean) => void;
}

export type CalendarHeaderProps = {
  currentDateRef: React.RefObject<Date>;
  onMonthYearChange?: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  // showMonthList: boolean;
  // setShowMonthList: (visible: boolean) => void;
  refreshing: boolean;
  // view: string;
  // handleViewChange: (view: string) => void;
  // height: SharedValue<number>;
  fromDropdownRef: React.RefObject<boolean>;  
  onRefresh: () => void;
};

export type CalendarHeaderOtherProps = {
  currentDate: Date;
  onMonthYearChange?: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  // showMonthList: boolean;
  // setShowMonthList: (visible: boolean) => void;
  refreshing: boolean;
  view: string;
  handleViewChange: (view: string) => void;
  // height: SharedValue<number>;
};

export interface CalendarSubHeaderProps {
  date: {
    month: number;
    year: number;
  };
}

export interface MonthViewProps {
  currentDateRef: React.RefObject<Date>;
  // month: number;
  // year: number;
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  refreshing: boolean;
  onFinishRefresh: () => void;
  fromDropdownRef: React.RefObject<boolean>;
}

export interface MonthItem { 
  key: string; 
  year: number; 
  month: number; 
  title: string 
};

export interface DisplayItemYear {
  key: string;
  type: 'year';
  year: number;
}

export interface DisplayItemMonth extends MonthItem {
  type: 'month';
}

export type DisplayItem = DisplayItemYear | DisplayItemMonth;

// =========================
// Event Data Month View Types
// ========================

export interface EventsDataMonthView {
  allEvents: Event[];
}

export interface MonthCalendarProps {
  monthDate: Date;
  refreshing: boolean;
  loading: boolean;
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown?: boolean) => void;
}

// =========================
// Day Cell Types
// ========================

export interface DayCellProps {
  date: Date;
  month: number;
  today: Date;
  cellWidth: number;
  cellHeight: number;
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
}

// =========================
// Event View Attendees Types
// ========================

export type EventViewAttendeesProps = {
  attendees?: {
    _id?: string;
    full_name?: string;
    profile_picture?: string;
  }[];
  eventCapacity: number | null;
};

// =========================
// Calendar Header Ref Types
// ========================

export type CalendarHeaderMonthViewRefProps = {
  update: (date: Date) => void;
};

// =========================
// Notification Types
// ========================

export interface NotificationData {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    username: string;
    profile_picture?: string;
  };
  event?: {
    _id: string;
    title: string;
    category?: string;
  };
  friend_request?: {
    _id: string;
    sender: {
      _id: string;
      full_name: string;
      username: string;
      profile_picture?: string;
    };
  };
  type: 'friend_request_accepted' | 'event_reminder_10_mins' | 'event_reminder_1_hour' | 'event_updated' | 'new_event_nearby' | 'event_attendance_confirmed' | 'new_event_from_friend' | 'event_invitation' | 'someone_from_contacts_joined';
  title: string;
  subtitle?: string;
  message_body?: string;
  data?: {
    mutualFriendsCount?: number;
    [key: string]: any;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'seen' | 'unseen';
  is_seen: boolean;
  created_at: string;
  updated_at: string;
  time?: string; // For display purposes
  count?: number; // For display purposes
  location?: string; // For display purposes
}

export interface FriendRequestNotification {
  _id: string;
  sender: {
    _id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    username: string;
    profile_picture?: string;
  };
  mutualFriendsCount: number;
  created_at: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface NotificationCardProps {
  notification: NotificationData;
  onPress?: () => void;
  isMarking?: boolean;
}

export interface FriendRequestCardProps {
  request: FriendRequestNotification;
  onAccept: (senderId: string) => void;
  onDecline: (senderId: string) => void;
}

export interface CustomJwtPayload extends JwtPayload {
  _id: string;
  email: string;
  username: string;
}