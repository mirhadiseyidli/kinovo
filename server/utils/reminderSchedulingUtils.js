const { putSchedule, deleteSchedule } = require('../aws/eventReminderScheduler');
const UserNotificationPreferences = require('../database/schemas/userNotificationPreferencesSchema');
const { RRule } = require('rrule');

/**
 * Check if a user wants to receive a specific type of reminder
 * @param {string} userId - User ID
 * @param {string} reminderType - '10min' or '1hour'
 * @returns {Promise<boolean>} Whether user wants this reminder
 */
const userWantsReminder = async (userId, reminderType) => {
  try {
    if (!userId || !reminderType) {
      console.warn('Invalid userId or reminderType provided to userWantsReminder');
      return true; // Default to true for safety
    }

    const preferences = await UserNotificationPreferences.findOne({ user: userId });
    if (!preferences) {
      // Default preferences if not set
      return true;
    }

    const notificationType = reminderType === '10min' 
      ? 'event_reminder_10_mins' 
      : 'event_reminder_1_hour';

    // Check if user wants push notifications for this reminder type
    return preferences.preferences?.push?.[notificationType] !== false;
  } catch (error) {
    console.error('Error checking user reminder preferences:', error);
    // Default to true if error to ensure users get reminders
    return true;
  }
};

/**
 * Generate a unique schedule name for user-specific reminders
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} reminderType - '10min' or '1hour'
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {string} Unique schedule name (max 64 chars for AWS EventBridge)
 */
const generateScheduleName = (eventId, userId, reminderType, occurrenceDate = null) => {
  const prefix = reminderType === '10min' ? 'ER-10-' : 'ER-1-';
  let scheduleName = `${prefix}${eventId}-${userId}`;
  
  if (occurrenceDate) {
    const dateStr = occurrenceDate.toISOString().split('T')[0];
    scheduleName += `-${dateStr}`;
  }
  
  // Ensure we don't exceed 64 character limit
  if (scheduleName.length > 64) {
    console.warn(`Schedule name too long (${scheduleName.length} chars), truncating to 64: ${scheduleName}`);
    scheduleName = scheduleName.substring(0, 64);
  }
  
  return scheduleName;
};

/**
 * Schedule reminders for a single user for a single event occurrence
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {Date} startTime - Event start time
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {Promise<Object>} Object with scheduled reminders info
 */
const scheduleUserEventReminders = async (eventId, userId, startTime, occurrenceDate = null) => {
  const result = {
    scheduled10min: false,
    scheduled1hour: false,
    errors: []
  };

  try {
    const eventStartTime = startTime.getTime();
    const now = Date.now();

    // Check if user wants 1-hour reminder
    if (await userWantsReminder(userId, '1hour')) {
      const oneHourBefore = new Date(eventStartTime - 60 * 60 * 1000);
      if (oneHourBefore.getTime() > now) {
        try {
          const scheduleName = generateScheduleName(eventId, userId, '1hour', occurrenceDate);
          await putSchedule(scheduleName, oneHourBefore, '1hour');
          result.scheduled1hour = true;
        } catch (err) {
          console.error('Failed to schedule 1-hour reminder:', err);
          result.errors.push({ type: '1hour', error: err.message });
        }
      }
    }

    // Check if user wants 10-minute reminder
    if (await userWantsReminder(userId, '10min')) {
      const tenMinutesBefore = new Date(eventStartTime - 10 * 60 * 1000);
      if (tenMinutesBefore.getTime() > now) {
        try {
          const scheduleName = generateScheduleName(eventId, userId, '10min', occurrenceDate);
          await putSchedule(scheduleName, tenMinutesBefore, '10min');
          result.scheduled10min = true;
        } catch (err) {
          console.error('Failed to schedule 10-minute reminder:', err);
          result.errors.push({ type: '10min', error: err.message });
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling user event reminders:', error);
    result.errors.push({ type: 'general', error: error.message });
  }

  return result;
};

/**
 * Schedule reminders for all accepted attendees of an event
 * @param {Object} event - Event document with populated attendees
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {Promise<Object>} Summary of scheduled reminders
 */
const scheduleEventRemindersForAllAttendees = async (event, occurrenceDate = null) => {
  const results = {
    totalAttendees: 0,
    successfulSchedules: 0,
    failedSchedules: 0,
    details: []
  };

  try {
    if (!event || !event.attendees) {
      console.warn('Invalid event provided to scheduleEventRemindersForAllAttendees');
      return results;
    }

    // Get all accepted attendees (including creator if they're attending)
    const acceptedAttendees = event.attendees
      .filter(attendee => attendee && (attendee.status === 'accepted' || attendee.status === 'maybe'))
      .map(attendee => attendee.user)
      .filter(user => user); // Remove any null/undefined users

    results.totalAttendees = acceptedAttendees.length;

    // Schedule reminders for each attendee
    for (const attendee of acceptedAttendees) {
      try {
        const userId = attendee._id || attendee;
        if (!userId) {
          console.warn('Invalid userId in attendee list');
          results.failedSchedules++;
          continue;
        }

        const scheduleResult = await scheduleUserEventReminders(
          event._id,
          userId,
          occurrenceDate || event.start_time,
          occurrenceDate
        );

        if (scheduleResult.errors.length === 0 && 
            (scheduleResult.scheduled10min || scheduleResult.scheduled1hour)) {
          results.successfulSchedules++;
        } else if (scheduleResult.errors.length > 0) {
          results.failedSchedules++;
        }

        results.details.push({
          userId,
          ...scheduleResult
        });
      } catch (attendeeError) {
        console.error('Error scheduling reminder for individual attendee:', attendeeError);
        results.failedSchedules++;
      }
    }
  } catch (error) {
    console.error('Error scheduling reminders for all attendees:', error);
    // Don't throw - scheduling failures shouldn't break the main operation
  }

  return results;
};

/**
 * Delete all reminders for a specific user and event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {Promise<void>}
 */
const deleteUserEventReminders = async (eventId, userId, occurrenceDate = null) => {
  try {
    // Delete both types of reminders
    const schedule1hour = generateScheduleName(eventId, userId, '1hour', occurrenceDate);
    const schedule10min = generateScheduleName(eventId, userId, '10min', occurrenceDate);

    await deleteSchedule(schedule1hour, 'specific');
    await deleteSchedule(schedule10min, 'specific');
  } catch (error) {
    console.error('Error deleting user event reminders:', error);
    // Don't throw - deletion failures shouldn't break the main operation
  }
};

/**
 * Delete all reminders for all users of an event
 * @param {Object} event - Event document with populated attendees
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {Promise<void>}
 */
const deleteAllEventReminders = async (event, occurrenceDate = null) => {
  try {
    if (!event) {
      console.warn('No event provided to deleteAllEventReminders');
      return;
    }

    if (!event.attendees || !Array.isArray(event.attendees)) {
      console.warn('Invalid attendees array in event for deleteAllEventReminders');
      // Still try to delete legacy reminders
      if (!occurrenceDate && event._id) {
        try {
          await deleteSchedule(event._id.toString(), 'all');
        } catch (legacyError) {
          console.error('Error deleting legacy reminders:', legacyError);
        }
      }
      return;
    }

    const allAttendees = event.attendees
      .map(attendee => attendee?.user?._id || attendee?.user)
      .filter(userId => userId); // Remove any null/undefined user IDs

    // Delete reminders for all attendees (with individual error handling)
    await Promise.allSettled(
      allAttendees.map(userId => 
        deleteUserEventReminders(event._id, userId, occurrenceDate)
      )
    );

    // Also delete any legacy event-level reminders (for backward compatibility)
    if (!occurrenceDate && event._id) {
      try {
        await deleteSchedule(event._id.toString(), 'all');
      } catch (legacyError) {
        console.error('Error deleting legacy reminders:', legacyError);
      }
    }
  } catch (error) {
    console.error('Error deleting all event reminders:', error);
    // Don't throw - deletion failures shouldn't break the main operation
  }
};

/**
 * Get frequency mapping for RRule
 * @param {string} frequency - Frequency string
 * @returns {number} RRule frequency constant
 */
const getFrequencyMapping = (frequency) => {
  const freqMapping = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
    yearly: RRule.YEARLY
  };
  return freqMapping[frequency.toLowerCase()] || RRule.WEEKLY;
};

/**
 * Schedule reminders for all occurrences of a recurring event
 * @param {Object} event - Event document with populated attendees
 * @param {number} maxOccurrences - Maximum number of occurrences to schedule (default: 52)
 * @returns {Promise<Object>} Summary of scheduled reminders
 */
const scheduleRecurringEventReminders = async (event, maxOccurrences = 52) => {
  const results = {
    occurrencesScheduled: 0,
    totalRemindersScheduled: 0,
    errors: []
  };

  try {
    if (!event.recurrence?.checked || !event.recurrence?.frequency) {
      throw new Error('Event is not recurring');
    }

    const eventStartTime = new Date(event.start_time);
    const eventEndTime = new Date(event.end_time);
    const recurrenceEndDate = event.recurrence.end_date 
      ? new Date(event.recurrence.end_date) 
      : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    // Generate occurrences using RRule
    const ruleOptions = {
      freq: getFrequencyMapping(event.recurrence.frequency),
      dtstart: eventStartTime,
      until: recurrenceEndDate,
      count: maxOccurrences // Limit the number of occurrences
    };

    const rule = new RRule(ruleOptions);
    const occurrences = rule.all();

    // Get accepted attendees
    const acceptedAttendees = event.attendees
      .filter(attendee => attendee.status === 'accepted' || attendee.status === 'maybe')
      .map(attendee => attendee.user._id || attendee.user);

    // Schedule reminders for each occurrence
    for (const occurrenceDate of occurrences) {
      // Skip if this date is excluded
      if (event.excludedDates?.some(excludedDate => 
        new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
      )) {
        continue;
      }

      // Skip past occurrences
      if (occurrenceDate < new Date()) {
        continue;
      }

      results.occurrencesScheduled++;

      // Schedule for each attendee
      for (const userId of acceptedAttendees) {
        try {
          await scheduleUserEventReminders(event._id, userId, occurrenceDate, occurrenceDate);
          results.totalRemindersScheduled++;
        } catch (error) {
          results.errors.push({
            occurrenceDate,
            userId,
            error: error.message
          });
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling recurring event reminders:', error);
    throw error;
  }

  return results;
};

/**
 * Update reminders when an attendee's status changes
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} newStatus - New attendance status
 * @param {Object} event - Event document
 * @param {Date} occurrenceDate - Optional occurrence date for recurring events
 * @returns {Promise<void>}
 */
const updateAttendeeReminders = async (eventId, userId, newStatus, event, occurrenceDate = null) => {
  try {
    if (!eventId || !userId || !newStatus) {
      console.warn('Missing required parameters in updateAttendeeReminders');
      return;
    }

    if (newStatus === 'accepted' || newStatus === 'maybe') {
      // Schedule reminders for accepting user
      if (event && event.start_time) {
        await scheduleUserEventReminders(eventId, userId, occurrenceDate || event.start_time, occurrenceDate);
      } else {
        console.warn('Event or start_time missing for scheduling reminders');
      }
    } else {
      // Delete reminders for rejecting or removed user
      await deleteUserEventReminders(eventId, userId, occurrenceDate);
    }
  } catch (error) {
    console.error('Error updating attendee reminders:', error);
    // Don't throw - reminder failures shouldn't break the main operation
  }
};

/**
 * Handle reminder updates for recurring event modifications
 * @param {Object} originalEvent - Original event document
 * @param {Object} modifiedEvent - Modified event document (for separate occurrences or future events)
 * @param {Date} occurrenceDate - Date of the specific occurrence
 * @param {string} modifyType - 'this_only' or 'all_future'
 * @returns {Promise<void>}
 */
const handleRecurringEventReminderUpdate = async (originalEvent, modifiedEvent, occurrenceDate, modifyType) => {
  try {
    if (modifyType === 'this_only') {
      // For "this_only", we need to:
      // 1. Delete reminders for this specific occurrence from the original event
      // 2. Schedule reminders for the new separate event
      
      // Delete reminders for this occurrence for all attendees
      const attendeeIds = originalEvent.attendees.map(att => att.user._id || att.user);
      await Promise.all(
        attendeeIds.map(userId => 
          deleteUserEventReminders(originalEvent._id, userId, occurrenceDate)
        )
      );
      
      // Schedule reminders for the new separate event (no occurrence date as it's now a single event)
      if (modifiedEvent) {
        await scheduleEventRemindersForAllAttendees(modifiedEvent);
      }
      
    } else if (modifyType === 'all_future') {
      // For "all_future", we need to:
      // 1. Delete all future reminders from the occurrence date onward for the original event
      // 2. Schedule all reminders for the new future event (which is recurring)
      
      // Get all future occurrences to delete
      const rule = new RRule({
        freq: getFrequencyMapping(originalEvent.recurrence.frequency),
        dtstart: occurrenceDate,
        until: originalEvent.recurrence.end_date ? new Date(originalEvent.recurrence.end_date) : null
      });
      
      const futureOccurrences = rule.all();
      const attendeeIds = originalEvent.attendees.map(att => att.user._id || att.user);
      
      // Delete reminders for all future occurrences
      for (const futureOccurrence of futureOccurrences) {
        await Promise.all(
          attendeeIds.map(userId => 
            deleteUserEventReminders(originalEvent._id, userId, futureOccurrence)
          )
        );
      }
      
      // Schedule reminders for the new future recurring event
      if (modifiedEvent && modifiedEvent.recurrence?.checked) {
        await scheduleRecurringEventReminders(modifiedEvent);
      } else if (modifiedEvent) {
        // If the split resulted in a non-recurring event, schedule normally
        await scheduleEventRemindersForAllAttendees(modifiedEvent);
      }
    }
  } catch (error) {
    console.error('Error handling recurring event reminder update:', error);
    // Don't throw - reminder failures shouldn't break the main operation
  }
};

module.exports = {
  userWantsReminder,
  generateScheduleName,
  scheduleUserEventReminders,
  scheduleEventRemindersForAllAttendees,
  deleteUserEventReminders,
  deleteAllEventReminders,
  scheduleRecurringEventReminders,
  updateAttendeeReminders,
  handleRecurringEventReminderUpdate
};