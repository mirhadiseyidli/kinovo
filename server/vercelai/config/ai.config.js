// AI Configuration for Vercel AI SDK
import { openai } from '@ai-sdk/openai';

// Model configuration
export const DEFAULT_MODEL = 'gpt-4o-mini';
export const EMBEDDINGS_MODEL = 'text-embedding-3-small';

// AI provider configuration
export const aiProvider = openai;

// Model instances
export const chatModel = openai(DEFAULT_MODEL);
export const embeddingModel = openai.embedding(EMBEDDINGS_MODEL);

// Insight generation settings
export const INSIGHT_CONFIG = {
  maxTokens: 300, // Increased for event cards with weather/traffic data
  temperature: 0.7,
  cacheTime: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Agent settings
export const AGENT_CONFIG = {
  maxSteps: 5,
  temperature: 0.7,
  maxTokens: 2000,
};

// RAG settings
export const RAG_CONFIG = {
  topK: 5, // Number of relevant documents to retrieve
  minScore: 0.7, // Minimum similarity score
  maxContextLength: 4000, // Maximum context length in tokens
};

// Edge config settings for caching
export const EDGE_CONFIG = {
  projectId: process.env.VERCEL_PROJECT_ID,
  teamId: process.env.VERCEL_TEAM_ID,
  token: process.env.VERCEL_TOKEN,
};