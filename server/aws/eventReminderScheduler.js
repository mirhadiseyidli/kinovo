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

/**
 * Build the common Schedule definition for both create & update.
 * @param {string} eventId MongoDB _id of the Event document
 * @param {Date} fireAt JS Date object when reminder should fire
 */
function buildScheduleInput(eventId, fireAt) {
  return {
    Name: `${RULE_PREFIX}${eventId}`,
    ScheduleExpression: `at(${fireAt.toISOString()})`,
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: process.env.REMINDER_LAMBDA_ARN,
      RoleArn: process.env.SCHEDULER_INVOKE_ROLE_ARN,
      Input: JSON.stringify({ eventId }),
    },
  };
}

/**
 * Create or update (upsert) an EventBridge schedule so the reminder Lambda
 * will be invoked exactly at `fireAt`.
 *
 * @param {string} eventId  Event _id as string
 * @param {Date}  fireAt    JS Date when reminder should fire
 */
async function putSchedule(eventId, fireAt) {
  const input = buildScheduleInput(eventId, fireAt);

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
 *
 * @param {string} eventId Event _id as string
 */
async function deleteSchedule(eventId) {
  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({ Name: `${RULE_PREFIX}${eventId}` }),
    );
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      // Ignore "not found" errors; rethrow anything else
      throw err;
    }
  }
}

module.exports = {
  putSchedule,
  deleteSchedule,
}; 