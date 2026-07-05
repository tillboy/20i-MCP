// Unit tests for the bulk hosting operation tool handlers in
// src/modules/bulk-operations.ts. Jest test file, ESM + @jest/globals,
// matching tests/unit/web-package.test.ts conventions. Mocks only - makes no
// network calls. Exercises the REAL exported handler functions directly
// against the shared createMockTwentyIClient() mock (which structurally
// satisfies `BulkOperationsClient`).

import { describe, it, expect, beforeEach } from '@jest/globals';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  handleBulkBlockCountries,
  handleBulkBlockIpAddresses,
  handleBulkPurgeCdnCache,
  handleBulkDeleteWebPackages,
  handleBulkGetMalwareScanResults,
  handleBulkGenerateSitemaps,
  assertBulkDeleteConfirmation,
  BULK_DELETE_CONFIRMATION,
} from '../../src/modules/bulk-operations';
import { createMockTwentyIClient } from '../helpers/mockClient';

describe('bulk hosting tools', () => {
  let client: ReturnType<typeof createMockTwentyIClient>;

  beforeEach(() => {
    client = createMockTwentyIClient();
  });

  describe('bulk_block_countries', () => {
    it('forwards packages/access/countries to the client and returns the parsed result on the happy path', async () => {
      const apiResult = { result: { pkg1: true, pkg2: true } };
      client.bulkBlockCountries.mockResolvedValue(apiResult);

      const response = await handleBulkBlockCountries(client, {
        packages: ['pkg1', 'pkg2'],
        access: 'allow',
        countries: ['GB', 'US'],
      });

      expect(client.bulkBlockCountries).toHaveBeenCalledWith(
        ['pkg1', 'pkg2'],
        'allow',
        ['GB', 'US']
      );
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('rejects when packages is missing/empty', async () => {
      await expect(
        handleBulkBlockCountries(client, { packages: [], access: 'allow', countries: ['GB'] })
      ).rejects.toThrow('packages must contain at least 1 items');
      expect(client.bulkBlockCountries).not.toHaveBeenCalled();
    });

    it('rejects when access is not a non-empty string', async () => {
      await expect(
        handleBulkBlockCountries(client, { packages: ['pkg1'], access: '', countries: ['GB'] })
      ).rejects.toThrow('access must be a non-empty string');
      expect(client.bulkBlockCountries).not.toHaveBeenCalled();
    });

    it('maps validation failures to McpError InvalidParams', async () => {
      await expect(
        handleBulkBlockCountries(client, { packages: [], access: 'allow', countries: [] })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
    });
  });

  describe('bulk_block_ip_addresses', () => {
    it('forwards packages and ip_addresses to the client and returns the parsed result on the happy path', async () => {
      const apiResult = { result: { pkg1: true } };
      client.bulkBlockIpAddresses.mockResolvedValue(apiResult);

      const response = await handleBulkBlockIpAddresses(client, {
        packages: ['pkg1'],
        ip_addresses: ['1.2.3.4', '10.0.0.0/8'],
      });

      expect(client.bulkBlockIpAddresses).toHaveBeenCalledWith(
        ['pkg1'],
        ['1.2.3.4', '10.0.0.0/8']
      );
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('passes undefined ip_addresses through when the field is omitted (clears blocks deliberately)', async () => {
      const apiResult = { result: { pkg1: true } };
      client.bulkBlockIpAddresses.mockResolvedValue(apiResult);

      await handleBulkBlockIpAddresses(client, { packages: ['pkg1'] });

      expect(client.bulkBlockIpAddresses).toHaveBeenCalledWith(['pkg1'], undefined);
    });

    it('rejects an explicit null ip_addresses with InvalidParams telling the caller to omit the field instead', async () => {
      await expect(
        handleBulkBlockIpAddresses(client, { packages: ['pkg1'], ip_addresses: null })
      ).rejects.toMatchObject({
        code: ErrorCode.InvalidParams,
        message: expect.stringContaining('omit the ip_addresses field entirely'),
      });
      expect(client.bulkBlockIpAddresses).not.toHaveBeenCalled();
    });

    it('rejects when packages is missing/empty', async () => {
      await expect(
        handleBulkBlockIpAddresses(client, { packages: [], ip_addresses: ['1.2.3.4'] })
      ).rejects.toThrow('packages must contain at least 1 items');
      expect(client.bulkBlockIpAddresses).not.toHaveBeenCalled();
    });

    it('rejects when ip_addresses is provided but not an array', async () => {
      await expect(
        handleBulkBlockIpAddresses(client, { packages: ['pkg1'], ip_addresses: 'not-an-array' })
      ).rejects.toThrow('ip_addresses must be an array');
      expect(client.bulkBlockIpAddresses).not.toHaveBeenCalled();
    });
  });

  describe('bulk_purge_cdn_cache', () => {
    it('forwards packages to the client and returns the parsed result on the happy path', async () => {
      const apiResult = { result: { pkg1: true, pkg2: true } };
      client.bulkPurgeCdnCache.mockResolvedValue(apiResult);

      const response = await handleBulkPurgeCdnCache(client, { packages: ['pkg1', 'pkg2'] });

      expect(client.bulkPurgeCdnCache).toHaveBeenCalledWith(['pkg1', 'pkg2']);
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('rejects when packages is missing/empty', async () => {
      await expect(handleBulkPurgeCdnCache(client, { packages: [] })).rejects.toThrow(
        'packages must contain at least 1 items'
      );
      expect(client.bulkPurgeCdnCache).not.toHaveBeenCalled();
    });
  });

  describe('bulk_delete_web_packages', () => {
    it('BLOCKS execution and never calls the client when confirmation is missing', async () => {
      await expect(
        handleBulkDeleteWebPackages(client, { delete_id: ['pkg1'] })
      ).rejects.toThrow('confirmation must be exactly "PERMANENTLY DELETE"');
      expect(client.bulkDeleteWebPackages).not.toHaveBeenCalled();
    });

    it('BLOCKS execution and never calls the client when confirmation does not match exactly', async () => {
      await expect(
        handleBulkDeleteWebPackages(client, {
          confirmation: 'permanently delete',
          delete_id: ['pkg1'],
        })
      ).rejects.toThrow('confirmation must be exactly "PERMANENTLY DELETE"');
      expect(client.bulkDeleteWebPackages).not.toHaveBeenCalled();

      await expect(
        handleBulkDeleteWebPackages(client, {
          confirmation: 'PERMANENTLY DELETE ',
          delete_id: ['pkg1'],
        })
      ).rejects.toThrow('confirmation must be exactly "PERMANENTLY DELETE"');
      expect(client.bulkDeleteWebPackages).not.toHaveBeenCalled();
    });

    it('raises the guard as an McpError with InvalidParams', async () => {
      try {
        await handleBulkDeleteWebPackages(client, { delete_id: ['pkg1'] });
        throw new Error('expected handleBulkDeleteWebPackages to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
      }
    });

    it('relays delete_id AND the confirmation through to the client once confirmed (method-level guard input)', async () => {
      const apiResult = { result: { pkg1: true, pkg2: false } };
      client.bulkDeleteWebPackages.mockResolvedValue(apiResult);

      const response = await handleBulkDeleteWebPackages(client, {
        confirmation: 'PERMANENTLY DELETE',
        delete_id: ['pkg1', 'pkg2'],
      });

      expect(client.bulkDeleteWebPackages).toHaveBeenCalledWith(
        ['pkg1', 'pkg2'],
        'PERMANENTLY DELETE'
      );
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('rejects when confirmed but delete_id is missing/empty', async () => {
      await expect(
        handleBulkDeleteWebPackages(client, { confirmation: 'PERMANENTLY DELETE', delete_id: [] })
      ).rejects.toThrow('delete_id must contain at least 1 items');
      expect(client.bulkDeleteWebPackages).not.toHaveBeenCalled();
    });

    describe('method-depth guard (assertBulkDeleteConfirmation, shared with TwentyIClient.bulkDeleteWebPackages)', () => {
      it('throws McpError InvalidParams when confirmation is missing (undefined)', () => {
        expect(() => assertBulkDeleteConfirmation(undefined)).toThrow(McpError);
        try {
          assertBulkDeleteConfirmation(undefined);
        } catch (error) {
          expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
        }
      });

      it('throws when confirmation is lowercase', () => {
        expect(() => assertBulkDeleteConfirmation('permanently delete')).toThrow(
          'confirmation must be exactly "PERMANENTLY DELETE"'
        );
      });

      it('throws when confirmation has a trailing space', () => {
        expect(() => assertBulkDeleteConfirmation('PERMANENTLY DELETE ')).toThrow(
          'confirmation must be exactly "PERMANENTLY DELETE"'
        );
      });

      it('passes only on the exact confirmation string', () => {
        expect(() => assertBulkDeleteConfirmation(BULK_DELETE_CONFIRMATION)).not.toThrow();
        expect(BULK_DELETE_CONFIRMATION).toBe('PERMANENTLY DELETE');
      });
    });
  });

  describe('bulk_get_malware_scan_results', () => {
    it('forwards packages to the client and returns the parsed result on the happy path', async () => {
      const apiResult = {
        result: { pkg1: { id: 'scan-1', created: '2026-07-01', returnCode: '0', outputText: '', status: 'clean' } },
      };
      client.bulkGetMalwareScanResults.mockResolvedValue(apiResult);

      const response = await handleBulkGetMalwareScanResults(client, { packages: ['pkg1'] });

      expect(client.bulkGetMalwareScanResults).toHaveBeenCalledWith(['pkg1']);
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('rejects when packages is missing/empty', async () => {
      await expect(handleBulkGetMalwareScanResults(client, { packages: [] })).rejects.toThrow(
        'packages must contain at least 1 items'
      );
      expect(client.bulkGetMalwareScanResults).not.toHaveBeenCalled();
    });
  });

  describe('bulk_generate_sitemaps', () => {
    it('forwards packages to the client and returns the parsed result on the happy path', async () => {
      const apiResult = {
        result: { pkg1: { CreatedAt: '2026-07-01', LockState: 'none', OutputText: '', UploadAfterGeneration: true } },
      };
      client.bulkGenerateSitemaps.mockResolvedValue(apiResult);

      const response = await handleBulkGenerateSitemaps(client, { packages: ['pkg1'] });

      expect(client.bulkGenerateSitemaps).toHaveBeenCalledWith(['pkg1']);
      expect(JSON.parse(response.content[0].text)).toEqual(apiResult);
    });

    it('rejects when packages is missing/empty', async () => {
      await expect(handleBulkGenerateSitemaps(client, { packages: [] })).rejects.toThrow(
        'packages must contain at least 1 items'
      );
      expect(client.bulkGenerateSitemaps).not.toHaveBeenCalled();
    });
  });
});
