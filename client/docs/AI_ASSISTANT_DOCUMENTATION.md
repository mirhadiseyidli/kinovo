# Kinovo AI Assistant - Complete Documentation

## Overview

Kinovo AI Assistant is a comprehensive event planning and social coordination system powered by OpenAI GPT-4o-mini with advanced RAG (Retrieval-Augmented Generation) capabilities. The AI agent can manage events, analyze user preferences, provide personalized recommendations, and facilitate social interactions within the Kinovo platform.

## Architecture

### Core Components

1. **AI Agent System** (`/server/vercelai/api/agent.js`)
   - Main conversational AI endpoint
   - Tool calling with authentication
   - RAG-enhanced responses
   - Conversation persistence

2. **AI Insights System** (`/server/vercelai/api/insights.js`)
   - Smart launch insights for mobile app
   - Time-based intelligence (urgent events, today's plans, suggestions)
   - Weather and traffic integration
   - Personalized recommendations via vector search

3. **Tool Ecosystem** (`/server/vercelai/tools/`)
   - 13 specialized tools for event management
   - Knowledge base integration
   - Vector search capabilities

4. **RAG System** (`/server/vercelai/rag/`)
   - MongoDB Atlas Vector Search
   - User preference learning
   - Context-aware recommendations
   - Conversation memory

### Frontend Integration

1. **AI Chat Interface** (`/client/app/(auth)/(aiAssistant)/AiAssistant.tsx`)
   - Real-time conversation UI
   - Typing animations with react-native-reanimated
   - Message persistence and history

2. **AI Insights Widget** (`/client/components/Home/AISummary.v2.tsx`)
   - Smart home screen insights
   - Event cards with weather and traffic
   - Performance-optimized animations
   - Dynamic content based on user activity

## Complete Tool Capabilities

### 1. Event Management Tools

#### **createEvent**
- **Purpose**: Create new events with full customization
- **Parameters**:
  - `title` (string, required): Event name
  - `start_time` (string, required): ISO datetime
  - `end_time` (string, required): ISO datetime
  - `location` (object): Address with coordinates
  - `visibility` (enum): 'public', 'private', 'friends_only'
  - `description` (string): Detailed event description
  - `category` (string): Event category from predefined options
  - `capacity` (number): Maximum attendees
  - `recurrence` (object): Recurring event settings
- **Features**:
  - Automatic cache invalidation for insights
  - Location geocoding
  - Calendar integration
  - Notification scheduling

#### **updateEvent**
- **Purpose**: Modify existing event details
- **Parameters**:
  - `eventId` (string, required): MongoDB ObjectId or compound ID
  - `patch` (object, required): Fields to update
- **Features**:
  - Handles recurring event compound IDs (eventId-YYYY-MM-DD format)
  - Partial updates supported
  - Attendee notifications for significant changes
  - Version history tracking

#### **cancelEvent**
- **Purpose**: Cancel events with attendee notifications
- **Parameters**:
  - `eventId` (string, required): Event identifier
  - `reason` (string): Cancellation reason
  - `notifyAttendees` (boolean): Send notifications
- **Features**:
  - Soft delete with status update
  - Automatic refund processing (if applicable)
  - Insights cache invalidation
  - Notification management

### 2. Attendee Management Tools

#### **joinEvent**
- **Purpose**: Join events as the authenticated user
- **Parameters**:
  - `eventId` (string, required): Event identifier
  - `status` (enum): 'accepted', 'maybe', 'declined'
  - `occurrenceDate` (string): For recurring events
  - `modifyType` (enum): 'single', 'following', 'all'
- **Features**:
  - Recurring event handling
  - Capacity validation
  - Waitlist management
  - Calendar sync
  - Insights cache invalidation

#### **inviteUser**
- **Purpose**: Invite other users to events
- **Parameters**:
  - `eventId` (string, required): Event identifier
  - `userId` (string, required): User to invite
  - `message` (string): Custom invitation message
- **Features**:
  - Permission validation (only creators can invite)
  - Duplicate invitation prevention
  - Push notification delivery
  - RSVP tracking

#### **removeUser**
- **Purpose**: Remove attendees from events
- **Parameters**:
  - `eventId` (string, required): Event identifier
  - `userId` (string, required): User to remove
- **Features**:
  - Creator permission validation
  - Notification to removed user
  - Refund processing
  - Waitlist promotion

### 3. Event Discovery Tools

#### **searchEvents**
- **Purpose**: Find public and discoverable events
- **Parameters**:
  - `query` (string): Text search across title, description
  - `categories` (array): Filter by event categories
  - `max` (number): Maximum results (default: 20)
  - `start_time` (string): Filter by start date
  - `end_time` (string): Filter by end date
  - `location` (object): Geographic filtering with radius
  - `visibility` (array): Include specific visibility levels
  - `status` (array): Filter by event status
- **Features**:
  - Full-text search with relevance scoring
  - Geographic proximity ranking
  - Category-based filtering
  - User preference weighting
  - Excludes user's own events

#### **getUserEvents**
- **Purpose**: Retrieve user's own events
- **Parameters**:
  - `type` (enum): 'upcoming', 'past', 'all', 'created', 'attending'
  - `limit` (number): Maximum results
- **Features**:
  - User relationship detection (creator vs attendee)
  - Status information included
  - Sorted by relevance and date
  - Includes attendance counts
  - Privacy-aware filtering

#### **findEventByTitle**
- **Purpose**: Find specific events by name within user's events
- **Parameters**:
  - `title` (string, required): Event title to search
  - `type` (enum): Event type filter
- **Features**:
  - Case-insensitive partial matching
  - Fuzzy search capabilities
  - User event scope only
  - Ranked by relevance

### 4. Event Intelligence Tools

#### **checkEventStatus**
- **Purpose**: Get detailed event information and user relationship
- **Parameters**:
  - `eventId` (string, required): Event identifier
- **Features**:
  - User relationship analysis (creator, attendee, invited)
  - Attendance status checking
  - Event details with privacy filtering
  - Recurring event handling
  - Access permission validation

### 5. Environmental Intelligence Tools

#### **weather**
- **Purpose**: Get weather forecasts for event planning
- **Parameters**:
  - `lat` (number, required): Latitude
  - `lng` (number, required): Longitude
  - `date` (string, required): Target date
- **Features**:
  - Apple WeatherKit integration
  - Hourly and daily forecasts
  - Severe weather alerts
  - Activity recommendations
  - Multiple location support

#### **traffic**
- **Purpose**: Get travel time and route information
- **Parameters**:
  - `from` (object, required): Origin coordinates/address
  - `to` (object, required): Destination coordinates/address
  - `departure_time` (string): Departure timestamp
- **Features**:
  - Google Directions API integration
  - Real-time traffic data
  - Multiple route options
  - Travel mode optimization
  - ETA calculations with traffic

### 6. Knowledge Base Tools

#### **knowledgeBase**
- **Purpose**: Query user's personalized information and history
- **Parameters**:
  - `query` (string, required): Natural language query
  - `context_type` (enum): 'user_history', 'event_recommendations', 'social_connections', 'preferences'
  - `limit` (number): Maximum results
- **Features**:
  - Vector search through user data
  - Behavioral pattern analysis
  - Social connection mapping
  - Preference learning
  - Activity recommendation engine

#### **Sub-functions of knowledgeBase**:

##### **getUserEventHistory**
- Analyzes past event attendance
- Identifies activity patterns
- Tracks category preferences
- Measures engagement levels

##### **getPersonalizedRecommendations**
- AI-powered event suggestions
- Similarity-based matching
- Social influence factors
- Timing optimization

##### **getSocialConnections**
- Friend network analysis
- Common interest identification
- Social event opportunities
- Network growth suggestions

##### **getUserPreferences**
- Activity preference learning
- Behavioral insight generation
- Interest evolution tracking
- Recommendation tuning

## AI Insights System Features

### 1. **Time-Based Intelligence**
- **Urgent Events** (< 3 hours): Full event details with weather and traffic
- **Today's Events**: Schedule overview with planning assistance
- **Future Planning**: Suggestions and discovery recommendations

### 2. **Weather Integration**
- Real-time weather data for event locations
- Activity-appropriate recommendations
- Severe weather alerts and alternatives
- Clothing and preparation suggestions

### 3. **Traffic Intelligence**
- Real-time traffic analysis from user location
- Optimal departure time recommendations
- Route optimization
- Alternative transportation suggestions

### 4. **Personalization Engine**
- Vector search through user history
- Preference-based recommendations
- Social influence weighting
- Contextual relevance scoring

## Technical Capabilities

### **Authentication & Security**
- JWT token authentication for all operations
- User-scoped data access
- Permission validation per tool
- Rate limiting and abuse prevention

### **Performance Optimizations**
- Edge function deployment for low latency
- 5-minute server-side caching for insights
- Client-side TanStack Query caching
- Vector search indexing for fast retrieval

### **Error Handling**
- Graceful degradation for API failures
- Fallback responses for network issues
- Detailed error logging and monitoring
- User-friendly error messages

### **Scalability Features**
- MongoDB Atlas Vector Search for large datasets
- Efficient token usage optimization
- Streaming responses for long operations
- Horizontal scaling capabilities

## Integration Capabilities

### **External APIs**
- **OpenAI GPT-4o-mini**: Core language model
- **Apple WeatherKit**: Weather data
- **Google Directions API**: Traffic and routing
- **Firebase**: Authentication and notifications
- **MongoDB Atlas**: Database and vector search

### **Platform Integration**
- **React Native**: Mobile app integration
- **Expo**: Development and deployment
- **Vercel**: Edge function hosting
- **AWS EventBridge**: Scheduled notifications

## User Experience Features

### **Conversational AI**
- Natural language understanding
- Context-aware responses
- Multi-turn conversations
- Tool usage transparency

### **Smart Insights**
- Proactive event reminders
- Weather-aware suggestions
- Traffic-optimized departure times
- Personalized recommendations

### **Visual Enhancements**
- Typing animations
- Real-time updates
- Weather and traffic cards
- Interactive event details

## Use Cases

### **Event Creation & Management**
- "Create a hiking event next Saturday at 2pm"
- "Update the location for my dinner party"
- "Cancel tomorrow's meeting and notify everyone"

### **Event Discovery**
- "Find yoga classes near me this week" 
- "Show me outdoor events this weekend"
- "What cooking classes are available?"

### **Social Coordination**
- "Invite Sarah to my birthday party"
- "Who's attending the team lunch?"
- "Find events my friends are going to"

### **Travel & Weather Planning**
- "What's the weather for my outdoor event?"
- "How long to get to the concert from downtown?"
- "When should I leave to avoid traffic?"

### **Personal Assistant**
- "What events do I have this week?"
- "Suggest something fun for this weekend"
- "Find events similar to what I usually attend"

## Data Privacy & Compliance

### **User Data Protection**
- Encrypted data transmission
- User-scoped access controls
- Minimal data collection
- GDPR compliance ready

### **AI Ethics**
- Transparent AI decision making
- Bias detection and mitigation
- User consent for data usage
- Explainable recommendations

This comprehensive AI assistant represents a state-of-the-art event management and social coordination platform, providing users with intelligent, personalized, and context-aware assistance for all their social planning needs.