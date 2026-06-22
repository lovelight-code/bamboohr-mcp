import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { bambooConfig, type BambooConfig } from './config.js';
import type { BambooErrorResponse } from './types.js';

/**
 * Read-only BambooHR HTTP client.
 *
 * Exposes ONLY `get` and `getBuffer` by design — there are no
 * post/put/delete methods, so the write surface cannot be reintroduced by
 * accident (this is a read-only data source; see README). The constructor
 * takes an explicit config so a caller can build a per-request client
 * (e.g. a future multi-tenant host) rather than relying on the
 * process-wide singleton exported at the bottom.
 *
 * Auth: when `config.apiToken` is set, the client attaches HTTP Basic
 * (`apiToken:x`). When it is null (proxy mode), NO Authorization header is
 * sent — the upstream loopback proxy injects a fresh token per request.
 */
export class BambooHRClient {
  private client: AxiosInstance;

  constructor(config: BambooConfig = bambooConfig) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    // Only self-attach auth when we hold a credential. In proxy mode the
    // token is injected upstream and this header is deliberately absent.
    if (config.apiToken) {
      const credentials = Buffer.from(`${config.apiToken}:x`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers,
      timeout: 30000, // 30 second timeout
    });

    // Request/response logging — opt-in via DEBUG. Never logs the
    // Authorization header or response bodies; params may contain ids, so
    // keep DEBUG off in production.
    if (config.debug) {
      this.client.interceptors.request.use((cfg) => {
        console.error(`[BambooHR] ${cfg.method?.toUpperCase()} ${cfg.url}`);
        if (cfg.params) {
          console.error(`[BambooHR] Params:`, cfg.params);
        }
        return cfg;
      });

      this.client.interceptors.response.use(
        (response) => {
          console.error(`[BambooHR] Response ${response.status} from ${response.config.url}`);
          return response;
        },
        (error) => {
          console.error(`[BambooHR] Error ${error.response?.status} from ${error.config?.url}:`, error.message);
          return Promise.reject(error);
        }
      );
    }
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as BambooErrorResponse;

      switch (status) {
        case 401:
          return new Error('Authentication failed. Please check your API token.');
        case 403:
          return new Error('Access forbidden. You may not have permission to access this resource.');
        case 404:
          return new Error('Resource not found.');
        case 429:
          return new Error('Rate limit exceeded. Please try again later.');
        default:
          const errorMessage = data?.message || data?.errors?.[0]?.error || error.message;
          return new Error(`BambooHR API error (${status}): ${errorMessage}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please try again.');
    }

    return new Error(`Network error: ${error.message}`);
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async getBuffer(endpoint: string, params?: Record<string, any>): Promise<Buffer> {
    try {
      const response: AxiosResponse<ArrayBuffer> = await this.client.get(endpoint, {
        params,
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

// Process-wide singleton built from the environment (the stdio entrypoint
// uses this). Multi-tenant callers should construct their own instance with
// an explicit per-request config instead.
export const bambooClient = new BambooHRClient();
