// WordPress blueprint tool handlers for the 20i MCP Server.
//
// These are standalone, exported handler functions (rather than inline `case`
// bodies in src/index.ts) so they can be unit tested directly against a mock
// client with zero network calls (see tests/unit/wordpress-blueprints.test.ts).
// The CallTool switch in src/index.ts delegates to them one line per tool.

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { validatePositiveNumber } from '../core/validation.js';
import { toMcpError } from '../core/errors.js';
import { jsonResult, ToolResult } from './util.js';

/**
 * Minimal shape of TwentyIClient these handlers need. The private
 * TwentyIClient class in src/index.ts structurally satisfies this interface
 * via its getWordPressBlueprints / toggleWordPressBlueprint methods.
 */
export interface WordPressBlueprintsClient {
  getWordPressBlueprints(): Promise<any>;
  toggleWordPressBlueprint(packageId: number): Promise<any>;
}

/** get_wordpress_blueprints */
export async function handleGetWordPressBlueprints(
  client: WordPressBlueprintsClient
): Promise<ToolResult> {
  try {
    const wordpressBlueprints = await client.getWordPressBlueprints();
    return jsonResult(wordpressBlueprints);
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get WordPress blueprints: ${error.message}`,
      { originalError: error.toString() }
    );
  }
}

/** toggle_wordpress_blueprint */
export async function handleToggleWordPressBlueprint(
  client: WordPressBlueprintsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packageId: number;
  try {
    packageId = validatePositiveNumber(args.package_id, 'package_id');
  } catch (error) {
    throw toMcpError(error);
  }

  try {
    const result = await client.toggleWordPressBlueprint(packageId);
    return jsonResult(result);
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to toggle WordPress blueprint: ${error.message}`,
      { originalError: error.toString() }
    );
  }
}
