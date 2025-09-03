#!/usr/bin/env node

/**
 * Create Geospatial Indexes
 * 
 * This script creates necessary geospatial indexes for location-based queries
 */

require('dotenv').config();
const { connectToDatabase } = require('../database/connection');
const mongoose = require('mongoose');

async function createGeoIndexes() {
  try {
    await connectToDatabase();
    
    // Wait a bit for connection to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready');
    }
    
    const db = mongoose.connection.db;
    
    // Create compound index for users location queries
    // This supports both lat/lng format and geospatial queries
    try {
      await db.collection('users').createIndex({
        'location.coordinates.lat': 1,
        'location.coordinates.lng': 1
      }, { 
        name: 'location_coordinates_2d',
        background: true 
      });
      console.log('✅ Created 2D index on users location.coordinates');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Users location coordinates index already exists');
      } else {
        throw error;
      }
    }
    
    // Create geospatial index for events if needed
    try {
      await db.collection('events').createIndex({
        'location.coordinates.lat': 1,
        'location.coordinates.lng': 1
      }, { 
        name: 'location_coordinates_2d_events',
        background: true 
      });
      console.log('✅ Created 2D index on events location.coordinates');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Events location coordinates index already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ All geospatial indexes created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create geospatial indexes:', error);
    throw error;
  } finally {
    if (require.main === module && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  createGeoIndexes();
}

module.exports = { createGeoIndexes };