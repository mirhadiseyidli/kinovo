import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Event Share Redirect
 * 
 * When the app is opened with https://kinovo.app/event/{event_id}
 * this component renders for a split-second and immediately
 * navigates to the authenticated event view.
 */
export default function EventShareRedirect() {
  const { event_id } = useLocalSearchParams();
  
  // Redirect to root first, then to authenticated event route
  return <Redirect href={`/?redirect=/(auth)/viewEvent/${event_id}`} />;
}