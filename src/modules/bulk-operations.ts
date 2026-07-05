// Bulk hosting operation tool handlers for the 20i MCP Server.
//
// These are standalone, exported handler functions (rather than inline `case`
// bodies in src/index.ts) so they can be unit tested directly against a mock
// client with zero network calls (see tests/unit/bulk-operations.test.ts).
// The CallTool switch in src/index.ts delegates to them one line per tool.

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  validateString,
  validateStringArray,
  validateOptional,
} from '../core/validation.js';
import { toMcpError } from '../core/errors.js';
import { jsonResult, ToolResult } from './util.js';

/**
 * Minimal shape of TwentyIClient these handlers need. The private
 * TwentyIClient class in src/index.ts structurally satisfies this interface
 * via its bulk* methods.
 */
export interface BulkOperationsClient {
  bulkBlockCountries(packages: string[], access: string, countries: string[]): Promise<any>;
  bulkBlockIpAddresses(packages: string[], ipAddresses?: string[]): Promise<any>;
  bulkPurgeCdnCache(packages: string[]): Promise<any>;
  /**
   * DESTRUCTIVE. The authoritative "PERMANENTLY DELETE" confirmation guard
   * lives inside this client method itself (defense in depth); the handler
   * below performs the same check early as a relay and passes the raw
   * confirmation string through.
   */
  bulkDeleteWebPackages(deleteIds: string[], confirmation: string): Promise<any>;
  bulkGetMalwareScanResults(packages: string[]): Promise<any>;
  bulkGenerateSitemaps(packages: string[]): Promise<any>;
}

/** Exact confirmation string required by bulk_delete_web_packages. */
export const BULK_DELETE_CONFIRMATION = 'PERMANENTLY DELETE';

const BULK_DELETE_GUARD_MESSAGE =
  'confirmation must be exactly "PERMANENTLY DELETE" to proceed with bulk_delete_web_packages - this is a destructive, irreversible operation';

/**
 * The bulk-delete safety guard, shared by BOTH the tool handler below (early
 * fail-fast relay) and the TwentyIClient.bulkDeleteWebPackages client method
 * in src/index.ts (authoritative, method-depth check that runs before any
 * HTTP call). Throws McpError(InvalidParams) unless the confirmation is
 * exactly "PERMANENTLY DELETE".
 */
export function assertBulkDeleteConfirmation(confirmation: unknown): void {
  if (confirmation !== BULK_DELETE_CONFIRMATION) {
    throw new McpError(ErrorCode.InvalidParams, BULK_DELETE_GUARD_MESSAGE);
  }
}

/** bulk_block_countries */
export async function handleBulkBlockCountries(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packages: string[];
  let access: string;
  let countries: string[];
  try {
    packages = validateStringArray(args.packages, 'packages', 1);
    access = validateString(args.access, 'access');
    countries = validateStringArray(args.countries, 'countries', 0);
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkBlockCountries(packages, access, countries);
  return jsonResult(result);
}

/** bulk_block_ip_addresses */
export async function handleBulkBlockIpAddresses(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  // FOOTGUN GUARD: omitting ip_addresses clears ALL blocked addresses on the
  // targeted packages. An explicit `null` is ambiguous (typo? intent to
  // clear?) and is rejected so that clearing is always a deliberate omission.
  if ('ip_addresses' in args && args.ip_addresses === null) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'ip_addresses must not be null. To clear all blocked IP addresses on the targeted packages, omit the ip_addresses field entirely (a deliberate omission); an explicit null is ambiguous and is rejected.'
    );
  }

  let packages: string[];
  let ipAddresses: string[] | undefined;
  try {
    packages = validateStringArray(args.packages, 'packages', 1);
    ipAddresses = validateOptional(
      args.ip_addresses,
      (val, field) => validateStringArray(val, field, 0),
      'ip_addresses'
    );
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkBlockIpAddresses(packages, ipAddresses);
  return jsonResult(result);
}

/** bulk_purge_cdn_cache */
export async function handleBulkPurgeCdnCache(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packages: string[];
  try {
    packages = validateStringArray(args.packages, 'packages', 1);
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkPurgeCdnCache(packages);
  return jsonResult(result);
}

/** bulk_delete_web_packages */
export async function handleBulkDeleteWebPackages(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  // SAFETY GUARD (relay): must run BEFORE any other validation and BEFORE any
  // client/API call. The authoritative copy of this guard lives inside the
  // client method itself (TwentyIClient.bulkDeleteWebPackages), which throws
  // unless it receives the exact confirmation string - this early check just
  // fails fast; the confirmation is passed through for the method-level guard.
  assertBulkDeleteConfirmation(args.confirmation);

  let deleteIds: string[];
  try {
    deleteIds = validateStringArray(args.delete_id, 'delete_id', 1);
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkDeleteWebPackages(deleteIds, args.confirmation);
  return jsonResult(result);
}

/** bulk_get_malware_scan_results */
export async function handleBulkGetMalwareScanResults(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packages: string[];
  try {
    packages = validateStringArray(args.packages, 'packages', 1);
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkGetMalwareScanResults(packages);
  return jsonResult(result);
}

/** bulk_generate_sitemaps */
export async function handleBulkGenerateSitemaps(
  client: BulkOperationsClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packages: string[];
  try {
    packages = validateStringArray(args.packages, 'packages', 1);
  } catch (error) {
    throw toMcpError(error);
  }

  const result = await client.bulkGenerateSitemaps(packages);
  return jsonResult(result);
}
