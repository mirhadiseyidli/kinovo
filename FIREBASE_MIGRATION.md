# Migrating from WebSockets to Firebase Realtime Database

This document provides step-by-step instructions for migrating from WebSockets to Firebase Realtime Database for all live data transmission in the Kinovo application.

## Objectives

1. Secure connection (maximum security)
2. Data redundancy (everything in Firebase should also be in our backend)
3. Real-time data transmission from backend to frontend

## Prerequisites

- Firebase project already set up
- Firebase service account key (`firebase-service-account.json`)
- Environment variables for Firebase configuration

## 1. Server-Side Changes

### 1.1 Update Firebase Configuration

Ensure your Firebase Admin SDK is properly configured:

```javascript
// server/config/firebase-admin.js
const admin = require('firebase-admin');
const serviceAccount = require("../firebase-service-account.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Configure database security rules
const configureSecurityRules = async () => {
  try {
    // This is a programmatic way to set security rules
    // You can also set these rules in the Firebase console
    await admin.database().setRules({
      rules: {
        ".read": false,
        ".write": false,
        "friend_requests": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "friend_activities": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "notifications": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        },
        "ai_summaries": {
          "$userId": {
            ".read": "$userId === auth.uid",
            ".write": false
          }
        }
      }
    });
  } catch (error) {
    console.error('Error setting security rules:', error);
  }
};

// Export the admin and database objects
const db = admin.database();
module.exports = { admin, db, configureSecurityRules };
```

### 1.2 Enhance Realtime Sync Service

Update the existing `realtimeSyncService.js` to handle all data types that were previously handled by WebSockets:

```javascript
// server/services/realtimeSyncService.js
const { admin, db } = require('../config/firebase-admin');
const User = require('../database/schemas/usersSchema');
const Event = require('../database/schemas/eventsSchema');
const Notification = require('../database/schemas/notificationsSchema');

// References to key paths in the database
const refs = {
  friendRequests: db.ref('friend_requests'),
  friendActivities: db.ref('friend_activities'),
  notifications: db.ref('notifications'),
  aiSummaries: db.ref('ai_summaries'),
  userStatus: db.ref('user_status'),
};

/**
 * Synchronize a friend request to Firebase
 * @param {string} toUserId - User ID receiving the request
 * @param {Object} requestData - Friend request data
 */
const syncFriendRequest = async (toUserId, requestData) => {
  try {
    const userRef = refs.friendRequests.child(toUserId);
    await userRef.child(requestData._id.toString()).set({
      ...requestData,
      _id: requestData._id.toString(),
      from: typeof requestData.from === 'object' ? requestData.from._id.toString() : requestData.from.toString(),
      to: typeof requestData.to === 'object' ? requestData.to._id.toString() : requestData.to.toString(),
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });
  } catch (error) {
    console.error('Error syncing friend request to Firebase:', error);
  }
};

/**
 * Update friend request status in Firebase
 * @param {string} userId - User ID of the request recipient
 * @param {string} requestId - Request ID
 * @param {string} status - New status (accepted/rejected)
 */
const updateFriendRequestStatus = async (userId, requestId, status) => {
  try {
    const requestRef = refs.friendRequests.child(userId).child(requestId);
    
    if (status === 'accepted' || status === 'rejected') {
      // Remove from pending requests
      await requestRef.remove();
    } else {
      // Update status
      await requestRef.update({ status });
    }
  } catch (error) {
    console.error('Error updating friend request in Firebase:', error);
  }
};

/**
 * Sync friend event activities to Firebase
 * @param {string} userId - User ID
 * @param {Array} unseenEvents - Array of unseen events
 */
const syncFriendEventActivities = async (userId, unseenEvents) => {
  try {
    const userActivitiesRef = refs.friendActivities.child(userId);
    
    // Clear existing data and set new data
    await userActivitiesRef.set(unseenEvents.reduce((acc, item) => {
      acc[item.friend._id.toString()] = { 
        eventCount: item.unseen_events.length,
        events: item.unseen_events.map(event => ({
          ...event,
          _id: event._id.toString(),
          created_by: event.created_by.toString()
        }))
      };
      return acc;
    }, {}));
  } catch (error) {
    console.error('Error syncing friend activities to Firebase:', error);
  }
};

/**
 * Sync notifications to Firebase
 * @param {string} userId - User ID
 * @param {Array} notifications - User notifications
 */
const syncNotifications = async (userId, notifications) => {
  try {
    const userNotificationsRef = refs.notifications.child(userId);
    
    // Build a map with notification IDs as keys
    const notificationsMap = notifications.reduce((acc, notification) => {
      acc[notification._id.toString()] = {
        ...notification,
        _id: notification._id.toString(),
        user: notification.user.toString(),
        timestamp: notification.created_at.getTime()
      };
      return acc;
    }, {});
    
    await userNotificationsRef.set(notificationsMap);
  } catch (error) {
    console.error('Error syncing notifications to Firebase:', error);
  }
};

/**
 * Sync AI summary to Firebase
 * @param {string} userId - User ID
 * @param {string} summaryText - The AI generated summary
 */
const syncAISummary = async (userId, summaryText) => {
  try {
    const userSummaryRef = refs.aiSummaries.child(userId);
    await userSummaryRef.set({
      content: summaryText,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
  } catch (error) {
    console.error('Error syncing AI summary to Firebase:', error);
  }
};

/**
 * Track user online status
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Whether the user is online
 */
const updateUserStatus = async (userId, isOnline) => {
  try {
    const userStatusRef = refs.userStatus.child(userId);
    await userStatusRef.set({
      online: isOnline,
      lastActive: admin.database.ServerValue.TIMESTAMP
    });
    
    // If user goes offline, set up an onDisconnect handler
    if (isOnline) {
      await userStatusRef.onDisconnect().update({
        online: false,
        lastActive: admin.database.ServerValue.TIMESTAMP
      });
    }
  } catch (error) {
    console.error('Error updating user status in Firebase:', error);
  }
};

module.exports = {
  syncFriendRequest,
  updateFriendRequestStatus,
  syncFriendEventActivities,
  syncNotifications,
  syncAISummary,
  updateUserStatus,
};
```

### 1.3 Create Database Change Listeners

Create a new service to listen for database changes and sync data from MongoDB to Firebase:

```javascript
// server/services/databaseListenerService.js
const mongoose = require('mongoose');
const User = require('../database/schemas/usersSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Notification = require('../database/schemas/notificationsSchema');
const Event = require('../database/schemas/eventsSchema');
const { 
  syncFriendRequest, 
  updateFriendRequestStatus, 
  syncNotifications, 
  syncFriendEventActivities
} = require('./realtimeSyncService');

// Initialize all change streams
const initializeChangeStreams = () => {
  console.log('Initializing database change streams...');
  
  // Friend Request change stream
  const friendRequestStream = FriendRequest.watch();
  friendRequestStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert') {
        const newRequest = change.fullDocument;
        await syncFriendRequest(newRequest.to.toString(), {
          _id: newRequest._id,
          from: newRequest.from,
          to: newRequest.to,
          status: newRequest.status,
          created_at: newRequest.created_at
        });
      } else if (change.operationType === 'update') {
        const requestId = change.documentKey._id;
        const updatedFields = change.updateDescription.updatedFields;
        
        if (updatedFields.status) {
          const request = await FriendRequest.findById(requestId);
          if (request) {
            await updateFriendRequestStatus(
              request.to.toString(), 
              requestId.toString(), 
              updatedFields.status
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in friend request change stream:', error);
    }
  });
  
  // Notification change stream
  const notificationStream = Notification.watch();
  notificationStream.on('change', async (change) => {
    try {
      if (['insert', 'update', 'delete'].includes(change.operationType)) {
        // For any change to notifications, sync the full list for the affected user
        if (change.operationType === 'insert' || change.operationType === 'update') {
          const userId = change.fullDocument.user.toString();
          const notifications = await Notification.find({ user: userId }).sort('-created_at');
          await syncNotifications(userId, notifications);
        } else if (change.operationType === 'delete') {
          // For delete, we need to fetch the user ID from somewhere else
          // This depends on how your data model is structured
          // You might need to store this information elsewhere or use a different approach
        }
      }
    } catch (error) {
      console.error('Error in notification change stream:', error);
    }
  });
  
  // Event change stream for friend activity
  const eventStream = Event.watch();
  eventStream.on('change', async (change) => {
    try {
      if (['insert', 'update'].includes(change.operationType)) {
        const event = change.fullDocument;
        const creatorId = event.created_by.toString();
        
        // Get all friends of the event creator
        const creator = await User.findById(creatorId);
        if (creator && creator.friends && creator.friends.length > 0) {
          // For each friend, update their activity feed
          for (const friendId of creator.friends) {
            const friendIdStr = friendId.toString();
            
            // Get all unseen events for this friend
            const unseenEvents = await getUnseenEventsForUser(friendIdStr);
            await syncFriendEventActivities(friendIdStr, unseenEvents);
          }
        }
      }
    } catch (error) {
      console.error('Error in event change stream:', error);
    }
  });
  
  // Error handling for all streams
  [friendRequestStream, notificationStream, eventStream].forEach(stream => {
    stream.on('error', (error) => {
      console.error('Change stream error:', error);
      // Attempt to restart the stream after a delay
      setTimeout(() => initializeChangeStreams(), 5000);
    });
  });
};

// Helper function to get unseen events for a user
const getUnseenEventsForUser = async (userId) => {
  // This would be your existing logic to fetch unseen events
  // Example implementation:
  const user = await User.findById(userId).populate('friends');
  
  if (!user || !user.friends || user.friends.length === 0) {
    return [];
  }
  
  const friendsWithEvents = [];
  
  for (const friend of user.friends) {
    // Get events created by this friend that haven't been seen by the user
    const events = await Event.find({
      created_by: friend._id,
      // Add your criteria for "unseen" events here
    }).sort('-created_at');
    
    if (events.length > 0) {
      friendsWithEvents.push({
        friend: {
          _id: friend._id,
          name: friend.name,
          profile_picture: friend.profile_picture
        },
        unseen_events: events
      });
    }
  }
  
  return friendsWithEvents;
};

module.exports = {
  initializeChangeStreams
};
```

### 1.4 Integrate with Server Startup

Update the server startup process to initialize Firebase and database listeners:

```javascript
// server/server.js
require('dotenv').config();
require('./database/connection');

const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const manageFriendsRoutes = require('./routes/manageFriendsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const friendSuggestionsRoutes = require('./routes/userSuggestionsRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const weatherRoutes = require('./routes/appleWeatherRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Firebase and realtime services
const { configureSecurityRules } = require('./config/firebase-admin');
const { initializeChangeStreams } = require('./services/databaseListenerService');

const app = express();

// CORS Configuration
app.use(cors({
  origin: '*', // Allow all origins for mobile testing; secure this in production
}));

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running.' });
});

// Initialize categories
const { initializeCategories } = require('./controllers/categoryController');
initializeCategories().catch(console.error);

// Initialize Firebase Security Rules
configureSecurityRules().catch(console.error);

// Initialize Database Change Streams
initializeChangeStreams();

// Check Authentication (JWT based)
const { verifyAccessToken } = require('./utils/token');

app.get('/api/check-auth', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ loggedIn: false, message: 'No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    res.json({
      loggedIn: true,
      user: { id: decoded.id, email: decoded.email, role: decoded.role },
    });
  } catch (err) {
    res.status(401).json({ loggedIn: false, message: 'Invalid or expired token' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assistants', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/managefriends', manageFriendsRoutes);
app.use('/api/friendsuggestions', friendSuggestionsRoutes);
app.use('/api/manageevents', eventsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api', categoryRoutes);

// Start the cron jobs
const accountDeletionCron = require('./cron/accountDeletionCron');
accountDeletionCron.start();

// Start Server
const PORT = process.env.BACKEND_PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 1.5 Create Controller Methods to Update Firebase

Enhance your controllers to update both MongoDB and Firebase:

```javascript
// server/controllers/notificationsController.js (example)
const Notification = require('../database/schemas/notificationsSchema');
const { syncNotifications } = require('../services/realtimeSyncService');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, message, relatedId } = req.body;
    
    // Create in MongoDB
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      related_id: relatedId,
      read: false,
    });
    
    // Sync to Firebase happens automatically via change stream
    
    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Update in MongoDB
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Sync to Firebase happens automatically via change stream
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

## 2. Client-Side Changes

### 2.1 Update Firebase Configuration

Ensure your Firebase client configuration is properly set up:

```typescript
// client/config/firebase.ts
import { initializeApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import appCheck, { ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import database from '@react-native-firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  clientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
};

// Initialize Firebase if it hasn't been initialized yet
if (getApps().length === 0) {
  console.log('Initializing Firebase with config');
  const app = initializeApp(firebaseConfig);
  
  // Configure App Check
  const provider = new ReactNativeFirebaseAppCheckProvider();
  appCheck().activate(provider);
}

// Enable database persistence for offline support
database().setPersistenceEnabled(true);

// Export database, auth, and other Firebase services
export const firebaseDatabase = database();
export const firebaseAuth = getAuth();

export default initializeApp(firebaseConfig);
```

### 2.2 Enhance Firebase Hooks

Update your existing Firebase hooks to include additional functionality:

```typescript
// client/hooks/useFirebaseRealtime.ts
import { useEffect, useState, useCallback } from 'react';
import database from '@react-native-firebase/database';
import { useAuthSession } from '@/components/Auth/AuthProvider';

// Generic hook for Firebase Realtime Database
export function useFirebaseRealtimeData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId } = useAuthSession();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const fullPath = `${path}/${userId}`;
    
    // Listen for data changes
    const onValueChange = database()
      .ref(fullPath)
      .on('value', snapshot => {
        setData(snapshot.val() as T);
        setLoading(false);
      }, err => {
        console.error(`Firebase data error at ${fullPath}:`, err);
        setError(err);
        setLoading(false);
      });

    // Cleanup listener
    return () => {
      database().ref(fullPath).off('value', onValueChange);
    };
  }, [path, userId]);

  return { data, loading, error };
}

// Update a node in the Firebase database
export function useFirebaseUpdate() {
  const { userId } = useAuthSession();
  
  const updateData = useCallback(async (
    path: string, 
    nodeId: string, 
    updates: Record<string, any>
  ) => {
    if (!userId) return false;
    
    try {
      const fullPath = `${path}/${userId}/${nodeId}`;
      await database().ref(fullPath).update(updates);
      return true;
    } catch (error) {
      console.error(`Error updating Firebase data at ${path}/${userId}/${nodeId}:`, error);
      return false;
    }
  }, [userId]);
  
  return { updateData };
}

// Specific hooks for different data types
export function useFriendRequests() {
  return useFirebaseRealtimeData<Record<string, any>>('friend_requests');
}

export function useFriendActivities() {
  return useFirebaseRealtimeData<Record<string, any>>('friend_activities');
}

export function useNotifications() {
  const { data, loading, error } = useFirebaseRealtimeData<Record<string, any>>('notifications');
  const { updateData } = useFirebaseUpdate();
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    return updateData('notifications', notificationId, { read: true });
  }, [updateData]);
  
  return { 
    notifications: data, 
    loading, 
    error, 
    markAsRead 
  };
}

export function useAISummary() {
  return useFirebaseRealtimeData<{ content: string, timestamp: number }>('ai_summaries');
}

export function useUserStatus() {
  const { data, loading, error } = useFirebaseRealtimeData<Record<string, { online: boolean, lastActive: number }>>('user_status');
  
  return {
    onlineUsers: data,
    loading,
    error
  };
}
```

### 2.3 Replace WebSocket Components with Firebase

Replace any components that use WebSockets with Firebase realtime hooks:

```typescript
// client/components/FriendRequests/FriendRequestsScreen.tsx (example)
import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFriendRequests } from '@/hooks/useFirebaseRealtime';
import FriendRequestItem from './FriendRequestItem';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { api } from '@/utils/api';

export default function FriendRequestsScreen() {
  const { userId } = useAuthSession();
  const { data: friendRequests, loading, error } = useFriendRequests();
  
  const handleAccept = async (requestId: string) => {
    try {
      await api.post(`/api/managefriends/accept/${requestId}`);
      // The Firebase data will update automatically via change streams
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  
  const handleReject = async (requestId: string) => {
    try {
      await api.post(`/api/managefriends/reject/${requestId}`);
      // The Firebase data will update automatically via change streams
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };
  
  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }
  
  if (error) {
    return <View style={styles.container}><Text>Error loading requests</Text></View>;
  }
  
  const requestsArray = friendRequests ? Object.values(friendRequests) : [];
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friend Requests</Text>
      {requestsArray.length === 0 ? (
        <Text style={styles.emptyText}>No friend requests</Text>
      ) : (
        <FlatList
          data={requestsArray}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <FriendRequestItem
              request={item}
              onAccept={() => handleAccept(item._id)}
              onReject={() => handleReject(item._id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
});
```

### 2.4 Update User Online Status

Create a component to track and update user online status:

```typescript
// client/components/UserPresence.tsx
import { useEffect } from 'react';
import database from '@react-native-firebase/database';
import { useAuthSession } from './Auth/AuthProvider';
import AppState from 'react-native';

export function UserPresence() {
  const { userId } = useAuthSession();
  
  useEffect(() => {
    if (!userId) return;
    
    // Reference to the user's status node
    const userStatusRef = database().ref(`user_status/${userId}`);
    
    // Set the user as online
    const setUserOnline = async () => {
      try {
        await userStatusRef.set({
          online: true,
          lastActive: database.ServerValue.TIMESTAMP,
        });
        
        // When app closes or loses connection, update the user status
        await userStatusRef.onDisconnect().update({
          online: false,
          lastActive: database.ServerValue.TIMESTAMP,
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };
    
    // Track when the app goes to background/foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setUserOnline();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        userStatusRef.update({
          online: false,
          lastActive: database.ServerValue.TIMESTAMP,
        });
      }
    };
    
    // Set initial online status
    setUserOnline();
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Cleanup
    return () => {
      subscription.remove();
      userStatusRef.update({
        online: false,
        lastActive: database.ServerValue.TIMESTAMP,
      });
    };
  }, [userId]);
  
  // This component doesn't render anything
  return null;
}
```

### 2.5 Use the Presence Component in App Root

Add the presence component to your app's root component:

```typescript
// client/app/_layout.tsx (or your root component)
import { UserPresence } from '@/components/UserPresence';

export default function Layout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <UserPresence />
        {/* Rest of your app */}
      </AuthProvider>
    </Provider>
  );
}
```

## 3. Security Measures

### 3.1 Firebase Security Rules

Set up proper security rules in the Firebase console:

```javascript
{
  "rules": {
    ".read": false,
    ".write": false,
    "friend_requests": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": false
      }
    },
    "friend_activities": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": false
      }
    },
    "notifications": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": false
      }
    },
    "ai_summaries": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": false
      }
    },
    "user_status": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

### 3.2 Firebase App Check

Implement Firebase App Check to prevent unauthorized access:

```typescript
// client/config/firebase.ts
import { initializeApp } from '@react-native-firebase/app';
import appCheck, { ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Set up App Check
const provider = new ReactNativeFirebaseAppCheckProvider();
appCheck().activate(provider);
```

### 3.3 Service Account Security

- Store the Firebase service account file securely
- Add it to `.gitignore` to prevent it from being committed
- Set restrictive file permissions

### 3.4 Environment Variables

Set up environment variables for Firebase configuration:

```
# server/.env
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# client/.env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID=your-ios-client-id
```

## 4. Migration Steps

### 4.1 Preparation

1. Ensure Firebase project is set up with Realtime Database enabled
2. Generate and download service account key
3. Set up environment variables for both server and client
4. Install required dependencies

### 4.2 Backend Migration

1. Update Firebase configuration in `server/config/firebase-admin.js`
2. Enhance the Realtime Sync Service (`server/services/realtimeSyncService.js`)
3. Create Database Change Listeners (`server/services/databaseListenerService.js`)
4. Update Server Startup (`server/server.js`) to initialize Firebase and database listeners
5. Update controllers to handle both MongoDB and Firebase

### 4.3 Frontend Migration

1. Update Firebase client configuration
2. Enhance Firebase Hooks
3. Replace WebSocket components with Firebase realtime hooks
4. Add user presence tracking
5. Configure Firebase App Check

### 4.4 Testing

1. Test friend request sending/receiving
2. Test notifications
3. Test friend activity updates
4. Test AI summaries
5. Test user online status
6. Test offline capabilities and reconnection

### 4.5 Cleanup

1. Once everything is working, remove the WebSocket implementation
2. Remove any unused WebSocket-related code
3. Update documentation

## 5. Benefits of Firebase Realtime Database

- Built-in authentication and security rules
- Offline data synchronization
- Scalable infrastructure
- Real-time updates with minimal latency
- Reduced server load (Firebase handles the connection management)
- Cross-platform support
- Built-in monitoring and analytics

## 6. Potential Challenges and Solutions

### 6.1 Data Synchronization

**Challenge**: Ensuring data consistency between MongoDB and Firebase.  
**Solution**: Use MongoDB change streams to automatically sync changes to Firebase.

### 6.2 Security

**Challenge**: Properly securing Firebase data.  
**Solution**: Implement strict security rules and use Firebase Authentication.

### 6.3 Offline Support

**Challenge**: Handling offline scenarios.  
**Solution**: Configure Firebase to enable offline persistence.

### 6.4 Migration Period

**Challenge**: Transitioning smoothly without service disruption.  
**Solution**: Run both WebSocket and Firebase solutions in parallel initially, then gradually shift to Firebase.

## 7. Conclusion

This migration will enhance the app's real-time capabilities while improving security and reliability. Firebase Realtime Database provides a robust infrastructure for handling real-time data synchronization with built-in security features and offline support. By maintaining data redundancy between Firebase and our backend MongoDB database, we ensure data integrity and ownership. 