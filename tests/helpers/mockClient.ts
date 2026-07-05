// Mock client helper for testing
import { jest } from '@jest/globals';
import { AxiosResponse } from 'axios';

export const createMockAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

export const mockApiCredentials = {
  apiKey: 'test-api-key',
  oauthKey: 'test-oauth-key',
  combinedKey: 'test-combined-key',
};

export const createMockTwentyIClient = () => {
  // Mirrors the public methods of TwentyIClient that feature modules call.
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    getResellerInfo: jest.fn(),
    // WordPress blueprint methods (src/modules/wordpress-blueprints.ts)
    getWordPressBlueprints: jest.fn(),
    toggleWordPressBlueprint: jest.fn(),
    // Bulk hosting operation methods (src/modules/bulk-operations.ts)
    bulkBlockCountries: jest.fn(),
    bulkBlockIpAddresses: jest.fn(),
    bulkPurgeCdnCache: jest.fn(),
    bulkDeleteWebPackages: jest.fn(),
    bulkGetMalwareScanResults: jest.fn(),
    bulkGenerateSitemaps: jest.fn(),
    // Web package methods (src/modules/web-package.ts)
    getPackageWebOverview: jest.fn(),
    manageWebsiteCdn: jest.fn(),
    updateWebsiteDocumentRoot: jest.fn(),
    getCdnCacheHitStats: jest.fn(),
    credentials: mockApiCredentials,
  };
};