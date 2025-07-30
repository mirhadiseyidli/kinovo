// Embeddings Generation Service using Vercel AI SDK
import { embed } from 'ai';
import { embeddingModel } from '../config/ai.config.js';

/**
 * Generate embeddings for text content using Vercel AI SDK
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Array of embedding values
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: text.substring(0, 8000), // Limit input length
    });
    return embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding arrays
 */
export async function generateBatchEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  // Filter out invalid texts
  const validTexts = texts.filter(text => text && typeof text === 'string');
  
  if (validTexts.length === 0) {
    throw new Error('No valid texts provided');
  }

  try {
    // Generate embeddings one by one (Vercel AI SDK doesn't have batch embedding)
    const embeddings = [];
    for (const text of validTexts) {
      const { embedding } = await embed({
        model: embeddingModel,
        value: text.substring(0, 8000), // Limit input length
      });
      embeddings.push(embedding);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return embeddings;
  } catch (error) {
    console.error('Failed to generate batch embeddings:', error);
    throw new Error(`Batch embedding generation failed: ${error.message}`);
  }
}

/**
 * Prepare event content for embedding
 * @param {Object} event - Event document
 * @returns {Object} - Prepared content for embedding
 */
export function prepareEventContent(event) {
  const title = event.title || '';
  const description = event.description || '';
  const category = event.category || '';
  const locationText = event.location?.text || '';
  
  // Combine content for general embedding
  const combinedContent = [
    title,
    description,
    category,
    locationText
  ].filter(Boolean).join(' ');

  return {
    title,
    description,
    category,
    locationText,
    combinedContent,
  };
}

/**
 * Prepare user profile content for embedding
 * @param {Object} user - User document
 * @returns {Object} - Prepared content for embedding
 */
export function prepareUserContent(user) {
  const bio = user.bio || '';
  const interests = user.favorite_activities?.join(', ') || '';
  const location = user.location?.text || user.location?.city || '';
  
  // Create activity summary from event history
  let activitySummary = '';
  if (user.events && user.events.length > 0) {
    const acceptedEvents = user.events.filter(e => e.status === 'accepted').length;
    activitySummary = `Active user with ${acceptedEvents} events attended. Interests: ${interests}`;
  }

  // Combined profile content
  const profileContent = [
    bio,
    interests ? `Interests: ${interests}` : '',
    location ? `Location: ${location}` : '',
    activitySummary
  ].filter(Boolean).join('. ');

  return {
    bio,
    interests,
    location,
    activitySummary,
    profileContent,
  };
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} embedding1 
 * @param {number[]} embedding2 
 * @returns {number} - Similarity score between -1 and 1
 */
export function cosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Generate contextual embedding by combining multiple embeddings
 * @param {number[][]} embeddings - Array of embeddings to combine
 * @param {number[]} weights - Weights for each embedding (optional)
 * @returns {number[]} - Combined embedding
 */
export function combineEmbeddings(embeddings, weights = null) {
  if (!embeddings || embeddings.length === 0) {
    throw new Error('Embeddings array cannot be empty');
  }

  const dimensions = embeddings[0].length;
  const result = new Array(dimensions).fill(0);
  
  // Use equal weights if none provided
  if (!weights) {
    weights = new Array(embeddings.length).fill(1 / embeddings.length);
  }

  // Weighted average of embeddings
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    const weight = weights[i];
    
    for (let j = 0; j < dimensions; j++) {
      result[j] += embedding[j] * weight;
    }
  }

  return result;
}