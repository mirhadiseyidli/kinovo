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
 * @param {string} eventId MongoDB _id of the Event document
 * @param {Date} fireAt JS Date object when reminder should fire
 * @param {string} reminderType '10min' or '1hour'
 */
function buildScheduleInput(eventId, fireAt, reminderType = '1hour') {
  console.log('buildScheduleInput', eventId, fireAt, reminderType);
  // EventBridge Scheduler requires format: YYYY-MM-DDTHH:mm:ss
  // Convert from ISO string (2025-07-12T15:12:00.000Z) to required format
  const scheduleDate = fireAt.toISOString().slice(0, 19); // Remove milliseconds and Z
  
  const prefix = reminderType === '10min' ? RULE_PREFIX_10MIN : RULE_PREFIX_1HOUR;
  
  return {
    Name: `${prefix}${eventId}`,
    ScheduleExpression: `at(${scheduleDate})`,
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: process.env.REMINDER_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_INVOKE_ROLE_ARN,
      Input: JSON.stringify({ eventId, reminderType }),
    },
  };
}

/**
 * Create or update (upsert) an EventBridge schedule so the reminder Lambda
 * will be invoked exactly at `fireAt`.
 *
 * @param {string} eventId  Event _id as string
 * @param {Date}  fireAt    JS Date when reminder should fire
 * @param {string} reminderType '10min' or '1hour'
 */
async function putSchedule(eventId, fireAt, reminderType = '1hour') {
  console.log('putSchedule', eventId, fireAt, reminderType);
  const input = buildScheduleInput(eventId, fireAt, reminderType);

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
 * Delete the EventBridge schedule for the given eventId (if it exists).
 * Can delete a specific reminder type or all reminders for an event.
 *
 * @param {string} eventId Event _id as string
 * @param {string} reminderType '10min', '1hour', or 'all' to delete all reminders
 */
async function deleteSchedule(eventId, reminderType = 'all') {
  console.log('deleteSchedule', eventId, reminderType);
  
  const scheduleNames = [];
  if (reminderType === 'all') {
    scheduleNames.push(`${RULE_PREFIX_10MIN}${eventId}`);
    scheduleNames.push(`${RULE_PREFIX_1HOUR}${eventId}`);
    // Also delete old format for backward compatibility
    scheduleNames.push(`${RULE_PREFIX}${eventId}`);
  } else if (reminderType === '10min') {
    scheduleNames.push(`${RULE_PREFIX_10MIN}${eventId}`);
  } else if (reminderType === '1hour') {
    scheduleNames.push(`${RULE_PREFIX_1HOUR}${eventId}`);
  }
  
  for (const scheduleName of scheduleNames) {
    try {
      await schedulerClient.send(
        new DeleteScheduleCommand({ Name: scheduleName }),
      );
      console.log(`Deleted schedule: ${scheduleName}`);
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        // Ignore "not found" errors; rethrow anything else
        console.error(`Error deleting schedule ${scheduleName}:`, err);
        throw err;
      }
    }
  }
}

module.exports = {
  putSchedule,
  deleteSchedule,
}; 