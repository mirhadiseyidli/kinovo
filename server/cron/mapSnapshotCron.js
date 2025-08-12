const cron = require('node-cron');
const Events = require('../database/schemas/eventsSchema');
const mapKitService = require('../services/appleMapKitService');

// Run every day at 3 AM
const MAP_SNAPSHOT_SCHEDULE = '0 3 * * *';

async function generateMissingMapSnapshots() {
  
  try {
    // Find events created in the last 7 days that are missing map snapshots
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const events = await Events.find({
      created_at: { $gte: sevenDaysAgo },
      'location.coordinates.lat': { $exists: true, $ne: null },
      'location.coordinates.lng': { $exists: true, $ne: null },
      $or: [
        { 'location.mapSnapshotUrl.light': { $exists: false } },
        { 'location.mapSnapshotUrl.dark': { $exists: false } }
      ]
    })
    .limit(50) // Process max 50 events per run
    .select('_id title location creator');

    if (events.length === 0) {
      return;
    }

    let successful = 0;
    let failed = 0;

    for (const event of events) {
      try {
        const result = await mapKitService.getSnapshotAndUploadToS3({
          lat: event.location.coordinates.lat,
          lon: event.location.coordinates.lng,
          eventId: event._id.toString(),
          userId: event.creator?.toString() || 'system',
          width: 640,
          height: 265,
          zoom: 15,
          scale: 2
        });

        // Update event with both light and dark map snapshot URLs
        await Events.updateOne(
          { _id: event._id },
          { 
            $set: { 
              'location.mapSnapshotUrl.light': result.light.cdnUrl,
              'location.mapSnapshotUrl.dark': result.dark.cdnUrl
            } 
          }
        );

        successful++;
      } catch (error) {
        failed++;
        console.error(`[MapSnapshot Cron] ✗ Failed for event ${event._id}:`, error.message);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error) {
    console.error('[MapSnapshot Cron] Error:', error);
  }
}

// Create and start the cron job
const mapSnapshotJob = cron.schedule(MAP_SNAPSHOT_SCHEDULE, generateMissingMapSnapshots, {
  scheduled: false,
  timezone: 'America/Los_Angeles'
});

module.exports = {
  startMapSnapshotCron: () => {
    mapSnapshotJob.start();
  },
  stopMapSnapshotCron: () => {
    mapSnapshotJob.stop();
  },
  // Manual trigger for testing
  triggerMapSnapshotGeneration: generateMissingMapSnapshots
};