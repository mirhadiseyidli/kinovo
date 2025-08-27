import { z } from 'zod';

// Schema matching the backend agentResponseSchema
export const agentResponseSchema = z.object({
    message: z.string().describe('The main response message to show to the user'),
    events: z.array(z.object({
      _id: z.string(),
      title: z.string(),
      start_time: z.string(),
      end_time: z.string().optional(),
      location: z.object({
        text: z.string().nullable(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        coordinates: z.object({
          lat: z.number().nullable(),
          lng: z.number().nullable(),
        }).optional(),
        mapSnapshotUrl: z.object({
          light: z.string().nullable(),
          dark: z.string().nullable(),
        }).nullable().optional(),
      }).optional(),
      category: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      visibility: z.string().optional(),
      creator: z.object({
        _id: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        full_name: z.string().optional(),
        username: z.string().optional(),
        profile_picture: z.string().nullable().optional(),
      }).nullable().optional(),
      attendees: z.array(z.object({
        user: z.object({
          _id: z.string(),
          full_name: z.string().optional(),
          profile_picture: z.string().nullable().optional(),
        }).optional(),
        status: z.enum(['pending', 'maybe', 'accepted', 'rejected']).optional(),
      })).optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
      status: z.string().optional(),
      capacity: z.number().nullable().optional(),
      isRecurring: z.boolean().optional(),
      recurrence: z.object({
        checked: z.boolean(),
        frequency: z.string().nullable(),
        end_date: z.string().nullable(),
      }).optional(),
      // User relationship fields
      userStatus: z.enum(['pending', 'maybe', 'accepted', 'rejected']).nullable().optional(),
      isUserAttending: z.boolean().optional(),
      isUserInvited: z.boolean().optional(),
      isUserCreator: z.boolean().optional(),
      isFriendEvent: z.boolean().optional(),
    })).optional(),
    weather: z.object({
      temperature: z.number(),
      condition: z.string(),
      conditionCode: z.string().optional(),
      humidity: z.number().optional(),
      windSpeed: z.number().optional(),
      emoji: z.string().optional(),
      recommendation: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }).nullable().optional(),
    traffic: z.object({
      duration: z.string(),
      distance: z.string(),
      traffic: z.string().optional(),
      condition: z.string().optional(),
      emoji: z.string().optional(),
      recommendation: z.string().optional(),
      coordinates: z.object({
        from: z.object({
          lat: z.number(),
          lng: z.number(),
        }),
        to: z.object({
          lat: z.number(),
          lng: z.number(),
        }),
      }).optional(),
      mapSnapshotUrl: z.object({
        light: z.string(),
        dark: z.string(),
      }).nullable().optional(),
      locationName: z.string().optional(),
    }).nullable().optional(),
    actionTaken: z.string().optional(),
    followUpSuggestions: z.array(z.string()).optional(),
    conversationId: z.string().optional(),
  });