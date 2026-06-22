// Jest setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock the config to avoid requiring real API credentials during tests
jest.mock('../config', () => ({
  bambooConfig: {
    apiToken: 'test-token',
    companyDomain: 'test-company',
    baseUrl: 'https://test-company.bamboohr.com/api/v1',
    debug: false,
  }
}));

// Global test timeout
jest.setTimeout(30000);