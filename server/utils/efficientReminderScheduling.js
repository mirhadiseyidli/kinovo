const { putSchedule, deleteSchedule } = require('../aws/eventReminderScheduler');
const EventReminderMetadata = require('../database/schemas/eventReminderMetadataSchema');
const Events = require('../database/schemas/eventsSchema');
const { RRule } = require('rrule');

/**
 * Generate a unique schedule name for event-occurrence reminders
 * @param {string} eventId - Event ID
 * @param {string} reminderType - '10min' or '1hour'
 * @param {Date} occurrenceDate - Date of the occurrence (null for one-time events)
 * @returns {string} Unique schedule name (max 64 chars for AWS EventBridge)
 */
const generateOccurrenceScheduleName = (eventId, reminderType, occurrenceDate = null) => {
  const prefix = reminderType === '10min' ? 'EOR-10-' : 'EOR-1-';
  let scheduleName = `${prefix}${eventId}`;
  
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
 * Get RRule frequency mapping
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
 * Generate next few occurrences for a recurring event
 * @param {Object} event - Event document
 * @param {number} maxOccurrences - Maximum occurrences to generate (default: 3)
 * @returns {Date[]} Array of occurrence dates
 */
const generateNextOccurrences = (event, maxOccurrences = 3) => {
  if (!event.recurrence?.checked || !event.recurrence?.frequency) {
    return [];
  }

  const eventStartTime = new Date(event.start_time);
  const recurrenceEndDate = event.recurrence.end_date 
    ? new Date(event.recurrence.end_date) 
    : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

  const ruleOptions = {
    freq: getFrequencyMapping(event.recurrence.frequency),
    dtstart: eventStartTime,
    until: recurrenceEndDate,
    count: maxOccurrences
  };

  const rule = new RRule(ruleOptions);
  return rule.all().filter(date => {
    // Skip past occurrences and excluded dates
    if (date < new Date()) return false;
    if (event.excludedDates?.some(excludedDate => 
      new Date(excludedDate).toDateString() === date.toDateString()
    )) return false;
    return true;
  });
};

/**
 * Schedule efficient reminders for a single event occurrence
 * @param {string} eventId - Event ID
 * @param {Date} occurrenceDate - Date of occurrence (null for one-time events)
 * @returns {Promise<Object>} Schedule results
 */
const scheduleOccurrenceReminders = async (eventId, occurrenceDate = null) => {
  const result = {
    scheduled10min: false,
    scheduled1hour: false,
    errors: []
  };

  try {
    const event = await Events.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const eventStartTime = occurrenceDate || event.start_time;
    const now = new Date();

    // Schedule 1-hour reminder
    const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      try {
        const scheduleName = generateOccurrenceScheduleName(eventId, '1hour', occurrenceDate);
        // Pass eventId and occurrenceDate in the payload, no specific userId
        await putSchedule(scheduleName, oneHourBefore, '1hour', eventId, null, occurrenceDate);
        result.scheduled1hour = true;
        result.schedule1hourName = scheduleName;
      } catch (err) {
        console.error('Failed to schedule 1-hour reminder:', err);
        result.errors.push({ type: '1hour', error: err.message });
      }
    }

    // Schedule 10-minute reminder
    const tenMinutesBefore = new Date(eventStartTime.getTime() - 10 * 60 * 1000);
    if (tenMinutesBefore > now) {
      try {
        const scheduleName = generateOccurrenceScheduleName(eventId, '10min', occurrenceDate);
        await putSchedule(scheduleName, tenMinutesBefore, '10min', eventId, null, occurrenceDate);
        result.scheduled10min = true;
        result.schedule10minName = scheduleName;
      } catch (err) {
        console.error('Failed to schedule 10-minute reminder:', err);
        result.errors.push({ type: '10min', error: err.message });
      }
    }
  } catch (error) {
    console.error('Error scheduling occurrence reminders:', error);
    result.errors.push({ type: 'general', error: error.message });
  }

  return result;
};

/**
 * Schedule efficient reminders for an event (handles both one-time and recurring)
 * @param {Object} event - Event document
 * @returns {Promise<Object>} Summary of scheduled reminders
 */
const scheduleEfficientEventReminders = async (event) => {
  const results = {
    success: false,
    isRecurring: false,
    occurrencesScheduled: 0,
    errors: []
  };

  try {
    // Create or update reminder metadata
    let metadata = await EventReminderMetadata.findOne({ event_id: event._id });
    if (!metadata) {
      metadata = new EventReminderMetadata({
        event_id: event._id,
        is_recurring: event.recurrence?.checked || false,
        recurrence_frequency: event.recurrence?.frequency,
        recurrence_end_date: event.recurrence?.end_date
      });
    }

    if (event.recurrence?.checked) {
      // Recurring event: schedule next few occurrences
      results.isRecurring = true;
      const nextOccurrences = generateNextOccurrences(event, 3);
      
      for (const occurrenceDate of nextOccurrences) {
        const scheduleResult = await scheduleOccurrenceReminders(event._id, occurrenceDate);
        
        if (scheduleResult.errors.length === 0) {
          results.occurrencesScheduled++;
          
          // Update metadata
          metadata.scheduled_occurrences.push({
            occurrence_date: occurrenceDate,
            reminder_10min_scheduled: scheduleResult.scheduled10min,
            reminder_1hour_scheduled: scheduleResult.scheduled1hour,
            reminder_10min_schedule_name: scheduleResult.schedule10minName,
            reminder_1hour_schedule_name: scheduleResult.schedule1hourName
          });
        } else {
          results.errors.push(...scheduleResult.errors);
        }
      }
    } else {
      // One-time event: schedule single occurrence
      const scheduleResult = await scheduleOccurrenceReminders(event._id);
      
      if (scheduleResult.errors.length === 0) {
        results.occurrencesScheduled = 1;
        
        // Update metadata
        metadata.reminder_10min_scheduled = scheduleResult.scheduled10min;
        metadata.reminder_1hour_scheduled = scheduleResult.scheduled1hour;
        metadata.reminder_10min_schedule_name = scheduleResult.schedule10minName;
        metadata.reminder_1hour_schedule_name = scheduleResult.schedule1hourName;
      } else {
        results.errors.push(...scheduleResult.errors);
      }
    }

    await metadata.save();
    results.success = results.errors.length === 0;
  } catch (error) {
    console.error('Error scheduling efficient event reminders:', error);
    results.errors.push({ type: 'general', error: error.message });
  }

  return results;
};

/**
 * Schedule the next occurrence reminder after sending the current one
 * @param {string} eventId - Event ID
 * @param {Date} currentOccurrenceDate - Date of the occurrence that was just sent
 * @returns {Promise<boolean>} Success status
 */
const scheduleNextOccurrenceReminder = async (eventId, currentOccurrenceDate) => {
  try {
    const event = await Events.findById(eventId);
    const metadata = await EventReminderMetadata.findOne({ event_id: eventId });
    
    if (!event || !metadata || !event.recurrence?.checked) {
      return false;
    }

    // Remove the current occurrence from scheduled_occurrences
    metadata.scheduled_occurrences = metadata.scheduled_occurrences.filter(
      occ => occ.occurrence_date.getTime() !== currentOccurrenceDate.getTime()
    );

    // Update last processed occurrence
    metadata.last_processed_occurrence = currentOccurrenceDate;

    // Generate next occurrence
    const nextOccurrence = generateNextOccurrences(event, 1)[0];
    if (nextOccurrence) {
      const scheduleResult = await scheduleOccurrenceReminders(eventId, nextOccurrence);
      
      if (scheduleResult.errors.length === 0) {
        metadata.scheduled_occurrences.push({
          occurrence_date: nextOccurrence,
          reminder_10min_scheduled: scheduleResult.scheduled10min,
          reminder_1hour_scheduled: scheduleResult.scheduled1hour,
          reminder_10min_schedule_name: scheduleResult.schedule10minName,
          reminder_1hour_schedule_name: scheduleResult.schedule1hourName
        });
      }
    }

    await metadata.save();
    return true;
  } catch (error) {
    console.error('Error scheduling next occurrence reminder:', error);
    return false;
  }
};

/**
 * Delete all efficient reminders for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
const deleteEfficientEventReminders = async (eventId) => {
  try {
    const metadata = await EventReminderMetadata.findOne({ event_id: eventId });
    if (!metadata) return;

    // Delete scheduled reminders
    if (metadata.is_recurring) {
      for (const occurrence of metadata.scheduled_occurrences) {
        if (occurrence.reminder_10min_schedule_name) {
          await deleteSchedule(occurrence.reminder_10min_schedule_name, 'specific');
        }
        if (occurrence.reminder_1hour_schedule_name) {
          await deleteSchedule(occurrence.reminder_1hour_schedule_name, 'specific');
        }
      }
    } else {
      if (metadata.reminder_10min_schedule_name) {
        await deleteSchedule(metadata.reminder_10min_schedule_name, 'specific');
      }
      if (metadata.reminder_1hour_schedule_name) {
        await deleteSchedule(metadata.reminder_1hour_schedule_name, 'specific');
      }
    }

    // Delete metadata
    await EventReminderMetadata.deleteOne({ event_id: eventId });
  } catch (error) {
    console.error('Error deleting efficient event reminders:', error);
  }
};

module.exports = {
  generateOccurrenceScheduleName,
  scheduleOccurrenceReminders,
  scheduleEfficientEventReminders,
  scheduleNextOccurrenceReminder,
  deleteEfficientEventReminders,
  generateNextOccurrences
};