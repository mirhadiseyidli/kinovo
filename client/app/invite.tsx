   /* client/app/invite.tsx */
   import { Redirect } from 'expo-router';

   // When the app is opened with https://kinovo.app/invite
   // this component renders for a split-second and immediately
   // navigates to the root stack/tab (`/`).
   export default function InviteRedirect() {
     return <Redirect href="/" />;
   }