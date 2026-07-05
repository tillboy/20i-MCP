// Unit tests for the WordPress blueprint tool handlers in
// src/modules/wordpress-blueprints.ts. Jest test file, ESM + @jest/globals,
// matching tests/unit/web-package.test.ts conventions. Mocks only - makes no
// network calls. Exercises the REAL exported handler functions directly
// against the shared createMockTwentyIClient() mock (which structurally
// satisfies `WordPressBlueprintsClient`).

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  handleGetWordPressBlueprints,
  handleToggleWordPressBlueprint,
} from '../../src/modules/wordpress-blueprints';
import { createMockTwentyIClient } from '../helpers/mockClient';

describe('WordPress blueprint tools', () => {
  let mockClient: ReturnType<typeof createMockTwentyIClient>;

  beforeEach(() => {
    mockClient = createMockTwentyIClient();
  });

  describe('get_wordpress_blueprints handler', () => {
    it('returns the blueprint list wrapped as MCP text content (happy path)', async () => {
      const mockList = [
        { packageId: 3269253, packageName: 'littleslovinghomeservices.com' },
        { packageId: 3357603, packageName: 'collectivemailstation.com' },
      ];
      mockClient.getWordPressBlueprints.mockResolvedValue(mockList);

      const result = await handleGetWordPressBlueprints(mockClient);

      expect(mockClient.getWordPressBlueprints).toHaveBeenCalledWith();
      expect(mockClient.getWordPressBlueprints).toHaveBeenCalledTimes(1);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text)).toEqual(mockList);
    });

    it('wraps client failures as McpError InternalError (no silent swallow)', async () => {
      mockClient.getWordPressBlueprints.mockRejectedValue(new Error('boom'));

      await expect(handleGetWordPressBlueprints(mockClient)).rejects.toMatchObject({
        code: ErrorCode.InternalError,
        message: expect.stringContaining('Failed to get WordPress blueprints: boom'),
      });
    });
  });

  describe('toggle_wordpress_blueprint handler', () => {
    it('validates package_id, calls the client, and returns wrapped content (happy path)', async () => {
      mockClient.toggleWordPressBlueprint.mockResolvedValue(1);

      const result = await handleToggleWordPressBlueprint(mockClient, { package_id: 3269253 });

      expect(mockClient.toggleWordPressBlueprint).toHaveBeenCalledWith(3269253);
      expect(JSON.parse(result.content[0].text)).toBe(1);
    });

    it('rejects a missing package_id before calling the client (InvalidParams guard)', async () => {
      await expect(handleToggleWordPressBlueprint(mockClient, {})).rejects.toMatchObject({
        code: ErrorCode.InvalidParams,
      });
      expect(mockClient.toggleWordPressBlueprint).not.toHaveBeenCalled();
    });

    it('rejects a non-positive package_id before calling the client (InvalidParams guard)', async () => {
      await expect(
        handleToggleWordPressBlueprint(mockClient, { package_id: -5 })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.toggleWordPressBlueprint).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric package_id before calling the client (InvalidParams guard)', async () => {
      await expect(
        handleToggleWordPressBlueprint(mockClient, { package_id: 'not-a-number' })
      ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
      expect(mockClient.toggleWordPressBlueprint).not.toHaveBeenCalled();
    });

    it('accepts a numeric-string package_id (MCP clients sometimes send IDs as strings)', async () => {
      mockClient.toggleWordPressBlueprint.mockResolvedValue(0);

      await handleToggleWordPressBlueprint(mockClient, { package_id: '3269253' });

      expect(mockClient.toggleWordPressBlueprint).toHaveBeenCalledWith(3269253);
    });

    it('wraps client failures as McpError InternalError (no silent swallow)', async () => {
      mockClient.toggleWordPressBlueprint.mockRejectedValue(new Error('boom'));

      await expect(
        handleToggleWordPressBlueprint(mockClient, { package_id: 3269253 })
      ).rejects.toMatchObject({
        code: ErrorCode.InternalError,
        message: expect.stringContaining('Failed to toggle WordPress blueprint: boom'),
      });
    });
  });
});
