const {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
} = require('@aws-sdk/client-scheduler');

// Initialize Scheduler client once per process
const schedulerClient = new SchedulerClient({
  region: process.env.AWS_REGION,
});

const RULE_PREFIX = 'event-reminder-';
const RULE_PREFIX_10MIN = 'event-reminder-10min-';
const RULE_PREFIX_1HOUR = 'event-reminder-1hour-';

/**
 * Build the common Schedule definition for both create & update.
 * @param {string} scheduleName Unique schedule name
 * @param {Date} fireAt JS Date object when reminder should fire
 * @param {string} reminderType '10min' or '1hour'
 * @param {string} eventId MongoDB _id of the Event document
 * @param {string} userId User ID for the reminder
 */
function buildScheduleInput(scheduleName, fireAt, reminderType = '1hour', eventId, userId) {
  // EventBridge Scheduler requires format: YYYY-MM-DDTHH:mm:ss
  // Convert from ISO string (2025-07-12T15:12:00.000Z) to required format
  const scheduleDate = fireAt.toISOString().slice(0, 19); // Remove milliseconds and Z
  
  return {
    Name: scheduleName,
    ScheduleExpression: `at(${scheduleDate})`,
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: process.env.REMINDER_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_INVOKE_ROLE_ARN,
      Input: JSON.stringify({ eventId, userId, reminderType }),
    },
  };
}

/**
 * Create or update (upsert) an EventBridge schedule so the reminder Lambda
 * will be invoked exactly at `fireAt`.
 *
 * @param {string} scheduleName  Unique schedule name
 * @param {Date}  fireAt    JS Date when reminder should fire
 * @param {string} reminderType '10min' or '1hour'
 * @param {string} eventId  Event _id as string (optional for backward compatibility)
 * @param {string} userId   User ID (optional for backward compatibility)
 */
async function putSchedule(scheduleName, fireAt, reminderType = '1hour', eventId = null, userId = null) {
  
  // Handle backward compatibility - if scheduleName looks like an eventId
  if (!eventId && scheduleName && !scheduleName.includes('-')) {
    eventId = scheduleName;
    const prefix = reminderType === '10min' ? RULE_PREFIX_10MIN : RULE_PREFIX_1HOUR;
    scheduleName = `${prefix}${eventId}`;
  }
  
  // Extract eventId and userId from scheduleName if not provided
  if (!eventId || !userId) {
    const parts = scheduleName.split('-');
    if (!eventId && parts.length >= 4) {
      eventId = parts[3];
    }
    if (!userId && parts.length >= 5) {
      userId = parts[4];
    }
  }
  
  const input = buildScheduleInput(scheduleName, fireAt, reminderType, eventId, userId);

  try {
    // Attempt to create the schedule first (faster path)
    await schedulerClient.send(new CreateScheduleCommand(input));
  } catch (err) {
    if (err.name === 'ConflictException') {
      // Schedule already exists → update it instead
      await schedulerClient.send(
        new UpdateScheduleCommand({
          ...input,
          // UpdateSchedule requires the Name separately and does not accept it inside input
          Name: input.Name,
          // Preserve existing FlexibleTimeWindow; we can reuse buildScheduleInput
        }),
      );
    } else {
      throw err;
    }
  }
}

/**
 * Delete the EventBridge schedule for the given scheduleName or eventId.
 * Can delete a specific reminder type or all reminders for an event.
 *
 * @param {string} scheduleNameOrEventId Schedule name or Event _id as string
 * @param {string} reminderType '10min', '1hour', 'all', or 'specific' to delete specific schedule
 */
async function deleteSchedule(scheduleNameOrEventId, reminderType = 'all') {
  
  const scheduleNames = [];
  
  if (reminderType === 'specific') {
    // Delete a specific schedule by exact name
    scheduleNames.push(scheduleNameOrEventId);
  } else if (reminderType === 'all') {
    // For backward compatibility - if it looks like an eventId, build old format names
    if (!scheduleNameOrEventId.includes('-')) {
      scheduleNames.push(`${RULE_PREFIX_10MIN}${scheduleNameOrEventId}`);
      scheduleNames.push(`${RULE_PREFIX_1HOUR}${scheduleNameOrEventId}`);
      scheduleNames.push(`${RULE_PREFIX}${scheduleNameOrEventId}`);
    } else {
      // It's a specific schedule name, just delete it
      scheduleNames.push(scheduleNameOrEventId);
    }
  } else if (reminderType === '10min') {
    scheduleNames.push(`${RULE_PREFIX_10MIN}${scheduleNameOrEventId}`);
  } else if (reminderType === '1hour') {
    scheduleNames.push(`${RULE_PREFIX_1HOUR}${scheduleNameOrEventId}`);
  }
  
  for (const scheduleName of scheduleNames) {
    try {
      await schedulerClient.send(
        new DeleteScheduleCommand({ Name: scheduleName }),
      );
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        // Ignore "not found" errors; log but don't throw for other errors to prevent crashes
        console.error(`Error deleting schedule ${scheduleName}:`, err);
        // Don't throw - deletion failures shouldn't break main operations
      }
    }
  }
}

module.exports = {
  putSchedule,
  deleteSchedule,
}; 