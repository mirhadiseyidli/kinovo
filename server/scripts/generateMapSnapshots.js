require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('../database/connection');
const Events = require('../database/schemas/eventsSchema');
const mapKitService = require('../services/appleMapKitService');

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateMapSnapshotsForEvents() {
  try {
    await connectToDatabase();

    // Count events that need map snapshots
    const totalEvents = await Events.countDocuments({
      'location.coordinates.lat': { $exists: true, $ne: null },
      'location.coordinates.lng': { $exists: true, $ne: null },
      $or: [
        { 'location.mapSnapshotUrl.light': { $exists: false } },
        { 'location.mapSnapshotUrl.dark': { $exists: false } }
      ]
    });

    if (totalEvents === 0) {
      return;
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process events in batches
    while (processed < totalEvents) {
      const events = await Events.find({
        'location.coordinates.lat': { $exists: true, $ne: null },
        'location.coordinates.lng': { $exists: true, $ne: null },
        $or: [
          { 'location.mapSnapshotUrl.light': { $exists: false } },
          { 'location.mapSnapshotUrl.dark': { $exists: false } }
        ]
      })
      .limit(BATCH_SIZE)
      .select('_id title location creator');

      if (events.length === 0) {
        break;
      }

      // Process events in parallel within each batch
      const promises = events.map(async (event) => {
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

          return { success: true, eventId: event._id };
        } catch (error) {
          console.error(`✗ Failed to generate snapshot for event ${event._id}:`, error.message);
          return { success: false, eventId: event._id, error: error.message };
        }
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          successful++;
        } else {
          failed++;
        }
        processed++;
      });

      // Delay between batches to avoid rate limiting
      if (processed < totalEvents) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

  } catch (error) {
    console.error('Error in batch processing:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
generateMapSnapshotsForEvents().catch(console.error);