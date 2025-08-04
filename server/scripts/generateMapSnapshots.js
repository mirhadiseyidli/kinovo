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
    console.log('Connected to database');

    // Count events that need map snapshots
    const totalEvents = await Events.countDocuments({
      'location.coordinates.lat': { $exists: true, $ne: null },
      'location.coordinates.lng': { $exists: true, $ne: null },
      $or: [
        { 'location.mapSnapshotUrl.light': { $exists: false } },
        { 'location.mapSnapshotUrl.dark': { $exists: false } }
      ]
    });

    console.log(`Found ${totalEvents} events without map snapshots`);

    if (totalEvents === 0) {
      console.log('No events need map snapshots');
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

      console.log(`\nProcessing batch of ${events.length} events...`);

      // Process events in parallel within each batch
      const promises = events.map(async (event) => {
        try {
          console.log(`Generating snapshot for event: ${event.title} (${event._id})`);
          
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

          console.log(`✓ Successfully generated snapshot for: ${event.title}`);
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

      console.log(`Batch complete. Progress: ${processed}/${totalEvents} (${successful} successful, ${failed} failed)`);

      // Delay between batches to avoid rate limiting
      if (processed < totalEvents) {
        console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log('\n=== Final Summary ===');
    console.log(`Total events processed: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${(successful / processed * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('Error in batch processing:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\nScript interrupted. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the script
console.log('Starting map snapshot generation for existing events...');
generateMapSnapshotsForEvents().catch(console.error);