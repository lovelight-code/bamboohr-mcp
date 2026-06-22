// Mock dotenv to prevent it from loading .env file
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Config', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Clear env vars for clean slate
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('with valid environment variables', () => {
    it('should load config from environment variables', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      process.env.DEBUG = 'true';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.apiToken).toBe('test-token-123');
      expect(bambooConfig.companyDomain).toBe('test-company');
      expect(bambooConfig.debug).toBe(true);
    });

    it('should default debug to false', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      // Don't set DEBUG

      const { bambooConfig } = require('../config');

      expect(bambooConfig.debug).toBe(false);
    });

    it('should handle debug as string "false"', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      process.env.DEBUG = 'false';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.debug).toBe(false);
    });
  });

  describe('with missing environment variables', () => {
    it('should throw error when API token is missing (and no base-url override)', () => {
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
      // Don't set BAMBOO_API_TOKEN or BAMBOO_BASE_URL

      expect(() => {
        require('../config');
      }).toThrow(/Set BAMBOO_API_TOKEN/);
    });

    it('should throw error when company domain is missing (and no base-url override)', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      // Don't set BAMBOO_COMPANY_DOMAIN or BAMBOO_BASE_URL

      expect(() => {
        require('../config');
      }).toThrow(/Set BAMBOO_BASE_URL.*or BAMBOO_COMPANY_DOMAIN/);
    });

    it('should throw error when all are missing', () => {
      // Don't set any — base-url resolution fails first
      expect(() => {
        require('../config');
      }).toThrow(/Set BAMBOO_BASE_URL.*or BAMBOO_COMPANY_DOMAIN/);
    });
  });

  describe('with BAMBOO_BASE_URL override (proxy mode)', () => {
    it('should use the override and not require a token or company domain', () => {
      process.env.BAMBOO_BASE_URL = 'http://127.0.0.1:7337';
      // No BAMBOO_API_TOKEN, no BAMBOO_COMPANY_DOMAIN

      const { bambooConfig } = require('../config');

      expect(bambooConfig.baseUrl).toBe('http://127.0.0.1:7337');
      expect(bambooConfig.apiToken).toBeNull();
      expect(bambooConfig.companyDomain).toBeNull();
    });

    it('should strip a trailing slash from the override', () => {
      process.env.BAMBOO_BASE_URL = 'http://127.0.0.1:7337/';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.baseUrl).toBe('http://127.0.0.1:7337');
    });

    it('should prefer the override over a derived company-domain host', () => {
      process.env.BAMBOO_BASE_URL = 'http://127.0.0.1:7337';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.baseUrl).toBe('http://127.0.0.1:7337');
    });
  });

  describe('config properties', () => {
    beforeEach(() => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';
    });

    it('should have correct apiToken', () => {
      const { bambooConfig } = require('../config');
      expect(bambooConfig.apiToken).toBe('test-token-123');
    });

    it('should have correct companyDomain', () => {
      const { bambooConfig } = require('../config');
      expect(bambooConfig.companyDomain).toBe('test-company');
    });

    it('should handle environment variables correctly', () => {
      process.env.BAMBOO_API_TOKEN = 'test-token-123';
      process.env.BAMBOO_COMPANY_DOMAIN = 'test-company';

      const { bambooConfig } = require('../config');

      expect(bambooConfig.apiToken).toBe('test-token-123');
      expect(bambooConfig.companyDomain).toBe('test-company');
      expect(bambooConfig.baseUrl).toBe('https://test-company.bamboohr.com/api/v1');
    });
  });
});