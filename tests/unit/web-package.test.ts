// Unit tests for the web package tool handlers in src/modules/web-package.ts.
// Jest test file, ESM + @jest/globals, matching tests/unit/domains.test.ts
// conventions. Mocks only — makes no network calls. Exercises the handler
// functions directly against a hand-rolled mock client object satisfying
// `WebPackageClient` — the same pattern tests/helpers/mockClient.ts +
// domains.test.ts use for `createMockTwentyIClient()`.

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  handleGetPackageWebOverview,
  handleManageWebsiteCdn,
  handleUpdateWebsiteDocumentRoot,
  handleGetCdnCacheHitStats,
  WebPackageClient,
} from '../../src/modules/web-package';

function createMockWebPackageClient(): jest.Mocked<WebPackageClient> {
  return {
    getPackageWebOverview: jest.fn(),
    manageWebsiteCdn: jest.fn(),
    updateWebsiteDocumentRoot: jest.fn(),
    getCdnCacheHitStats: jest.fn(),
  } as unknown as jest.Mocked<WebPackageClient>;
}

describe('web package tool handlers', () => {
  let mockClient: jest.Mocked<WebPackageClient>;

  beforeEach(() => {
    mockClient = createMockWebPackageClient();
  });

  describe('get_package_web_overview (handleGetPackageWebOverview)', () => {
    it('happy path: validates package_id and returns the client result as JSON text', async () => {
      const overview = {
        id: 3148424,
        label: null,
        platform: 'linux',
        setupComplete: true,
        hasBackups: true,
        name: 'dzind.com',
        names: ['dzind.com'],
        typeRef: 2543,
      };
      mockClient.getPackageWebOverview.mockResolvedValue(overview);

      const result = await handleGetPackageWebOverview(mockClient, { package_id: '3148424' });

      expect(mockClient.getPackageWebOverview).toHaveBeenCalledWith('3148424');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(overview);
    });

    it('input validation failure: missing package_id throws McpError InvalidParams before calling the client', async () => {
      await expect(handleGetPackageWebOverview(mockClient, {})).rejects.toMatchObject({
        code: ErrorCode.InvalidParams,
      });
      expect(mockClient.getPackageWebOverview).not.toHaveBeenCalled();
    });

    it('input validation failure: blank package_id is rejected', async () => {
      await expect(
        handleGetPackageWebOverview(mockClient, { package_id: '   ' })
      ).rejects.toBeInstanceOf(McpError);
      expect(mockClient.getPackageWebOverview).not.toHaveBeenCalled();
    });
  });

  describe('manage_website_cdn (handleManageWebsiteCdn)', () => {
    it('happy path: validates package_id/action and forwards to the client', async () => {
      mockClient.manageWebsiteCdn.mockResolvedValue({ result: true });

      const result = await handleManageWebsiteCdn(mockClient, {
        package_id: '3148424',
        action: 'purge',
      });

      expect(mockClient.manageWebsiteCdn).toHaveBeenCalledWith('3148424', 'purge');
      expect(JSON.parse(result.content[0].text)).toEqual({ result: true });
    });

    it('treats a bare `true` response as a passthrough success value', async () => {
      mockClient.manageWebsiteCdn.mockResolvedValue(true);

      const result = await handleManageWebsiteCdn(mockClient, {
        package_id: '3148424',
        action: 'enable',
      });

      expect(JSON.parse(result.content[0].text)).toBe(true);
    });

    it('input validation failure: missing action throws McpError InvalidParams before calling the client', async () => {
      await expect(
        handleManageWebsiteCdn(mockClient, { package_id: '3148424' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.manageWebsiteCdn).not.toHaveBeenCalled();
    });

    it('input validation failure: unrecognized action value is rejected', async () => {
      await expect(
        handleManageWebsiteCdn(mockClient, { package_id: '3148424', action: 'reboot' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.manageWebsiteCdn).not.toHaveBeenCalled();
    });
  });

  describe('update_website_document_root (handleUpdateWebsiteDocumentRoot)', () => {
    it('happy path: validates package_id/update map and forwards normalized domains to the client', async () => {
      mockClient.updateWebsiteDocumentRoot.mockResolvedValue({ result: ['example.com'] });

      const result = await handleUpdateWebsiteDocumentRoot(mockClient, {
        package_id: '3148424',
        update: { 'example.com': 'public_html/mysite' },
      });

      expect(mockClient.updateWebsiteDocumentRoot).toHaveBeenCalledWith('3148424', {
        'example.com': 'public_html/mysite',
      });
      expect(JSON.parse(result.content[0].text)).toEqual({ result: ['example.com'] });
    });

    it('input validation failure: missing update map throws McpError InvalidParams before calling the client', async () => {
      await expect(
        handleUpdateWebsiteDocumentRoot(mockClient, { package_id: '3148424' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.updateWebsiteDocumentRoot).not.toHaveBeenCalled();
    });

    it('input validation failure: empty update map is rejected', async () => {
      await expect(
        handleUpdateWebsiteDocumentRoot(mockClient, { package_id: '3148424', update: {} })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.updateWebsiteDocumentRoot).not.toHaveBeenCalled();
    });

    it('input validation failure: key with whitespace is rejected', async () => {
      await expect(
        handleUpdateWebsiteDocumentRoot(mockClient, {
          package_id: '3148424',
          update: { 'not a domain': 'public_html' },
        })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.updateWebsiteDocumentRoot).not.toHaveBeenCalled();
    });

    it('input validation failure: key with a slash is rejected', async () => {
      await expect(
        handleUpdateWebsiteDocumentRoot(mockClient, {
          package_id: '3148424',
          update: { 'example.com/path': 'public_html' },
        })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.updateWebsiteDocumentRoot).not.toHaveBeenCalled();
    });

    it('preserves hostname keys byte-for-byte (no lowercasing; IDN and underscore labels pass)', async () => {
      mockClient.updateWebsiteDocumentRoot.mockResolvedValue({ result: true });

      await handleUpdateWebsiteDocumentRoot(mockClient, {
        package_id: '3148424',
        update: {
          'STAGING.Example.com': 'public_html/staging',
          'my_app.xn--bcher-kva.example': 'public_html/idn',
        },
      });

      expect(mockClient.updateWebsiteDocumentRoot).toHaveBeenCalledWith('3148424', {
        'STAGING.Example.com': 'public_html/staging',
        'my_app.xn--bcher-kva.example': 'public_html/idn',
      });
    });
  });

  describe('get_cdn_cache_hit_stats (handleGetCdnCacheHitStats)', () => {
    it('happy path: validates package_id/period and forwards to the client', async () => {
      mockClient.getCdnCacheHitStats.mockResolvedValue({
        result: { Last24Hours: { hits: 120, misses: 8 } },
      });

      const result = await handleGetCdnCacheHitStats(mockClient, {
        package_id: '3148424',
        period: 'Last24Hours',
      });

      expect(mockClient.getCdnCacheHitStats).toHaveBeenCalledWith('3148424', 'Last24Hours');
      expect(JSON.parse(result.content[0].text)).toEqual({
        result: { Last24Hours: { hits: 120, misses: 8 } },
      });
    });

    it('input validation failure: missing period throws McpError InvalidParams before calling the client', async () => {
      await expect(
        handleGetCdnCacheHitStats(mockClient, { package_id: '3148424' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.getCdnCacheHitStats).not.toHaveBeenCalled();
    });

    it('input validation failure: period outside the fixed enum is rejected (e.g. Last30Days)', async () => {
      await expect(
        handleGetCdnCacheHitStats(mockClient, { package_id: '3148424', period: 'Last30Days' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.getCdnCacheHitStats).not.toHaveBeenCalled();
    });
  });

  // NOTE: the guard-only `bulk_delete_web` stub from the original fragment is
  // superseded by the fully implemented `bulk_delete_web_packages` tool (real
  // endpoint POST /hosting/handleBulkDeleteWeb) — its "PERMANENTLY DELETE"
  // confirmation guard is covered in tests/unit/bulk-operations.test.ts.
});
