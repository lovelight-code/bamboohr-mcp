// Mock config for debug mode
jest.mock('../config', () => ({
  bambooConfig: {
    apiToken: 'test-token',
    companyDomain: 'test-company',
    baseUrl: 'https://test-company.bamboohr.com/api/v1',
    debug: true  // Enable debug mode
  }
}));

// Mock console methods to test debug logging
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

import { BambooHRClient } from '../bambooClient';

describe('BambooClient Debug Mode', () => {
  let client: BambooHRClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    const axios = require('axios');
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Clear console spies before creating new client
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    
    client = new BambooHRClient();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug mode interceptors', () => {
    it('should set up request interceptor in debug mode', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set up response interceptor in debug mode', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should log request details in debug mode', () => {
      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const mockConfig = {
        method: 'GET',
        url: '/test-endpoint',
        params: { test: 'value' }
      };

      requestInterceptor(mockConfig);

      // Logs go to stderr, never stdout: a stdio MCP server uses stdout for
      // the JSON-RPC stream, so console.log there would corrupt the protocol.
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] GET /test-endpoint');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] Params:', { test: 'value' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log request without params', () => {
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      
      const mockConfig = {
        method: 'POST',
        url: '/another-endpoint'
        // No params
      };

      requestInterceptor(mockConfig);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] POST /another-endpoint');
      // Should not log params line when no params
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Params:'));
    });

    it('should log successful response in debug mode', () => {
      // Get the success handler from response interceptor
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      
      const mockResponse = {
        status: 200,
        config: { url: '/test-endpoint' }
      };

      responseInterceptor(mockResponse);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] Response 200 from /test-endpoint');
    });

    it('should log error response in debug mode', async () => {
      // Get the error handler from response interceptor
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const mockError = {
        response: {
          status: 404,
          config: { url: '/not-found' }
        },
        message: undefined
      };

      // Should reject but we need to catch it
      try {
        await errorInterceptor(mockError);
      } catch (e) {
        // Expected to throw
      }
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] Error 404 from undefined:', undefined);
    });

    it('should log network error in debug mode', async () => {
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const mockError = {
        message: 'Network Error'
        // No response object for network errors
      };

      try {
        await errorInterceptor(mockError);
      } catch (e) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('[BambooHR] Error undefined from undefined:', 'Network Error');
    });
  });
});