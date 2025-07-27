import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Profile Share Redirect
 * 
 * When the app is opened with https://kinovo.app/profile/{_id}
 * this component renders for a split-second and immediately
 * navigates to the authenticated profile view.
 */
export default function ProfileShareRedirect() {
  const { _id } = useLocalSearchParams();
  
  // Redirect to root first, then to authenticated profile route
  return <Redirect href={`/?redirect=/(auth)/profile/${_id}`} />;
}