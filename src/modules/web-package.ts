// Web package tool handlers for the 20i MCP Server.
//
// These are standalone, exported handler functions (rather than inline `case`
// bodies in src/index.ts) so they can be unit tested directly against a mock
// client with zero network calls (see tests/unit/web-package.test.ts). The
// CallTool switch in src/index.ts delegates to them one line per tool.

import {
  validateString,
  validateEnum,
  validateObject,
} from '../core/validation.js';
import { ValidationError, toMcpError } from '../core/errors.js';
import { jsonResult, ToolResult } from './util.js';

/**
 * Minimal shape of TwentyIClient these handlers need. The private
 * TwentyIClient class in src/index.ts structurally satisfies this interface
 * via its getPackageWebOverview / manageWebsiteCdn / updateWebsiteDocumentRoot /
 * getCdnCacheHitStats methods.
 */
export interface WebPackageClient {
  getPackageWebOverview(packageId: string): Promise<any>;
  manageWebsiteCdn(packageId: string, action: 'enable' | 'disable' | 'purge'): Promise<any>;
  updateWebsiteDocumentRoot(packageId: string, update: Record<string, string>): Promise<any>;
  getCdnCacheHitStats(
    packageId: string,
    period: 'Last1Hour' | 'Last24Hours' | 'Last7Days'
  ): Promise<any>;
}

/**
 * Permissive hostname sanity check for `update` map keys in
 * update_website_document_root. The keys name domains/subdomains already
 * attached to the package; the 20i side is the source of truth for whether a
 * key matches, so this only rejects obvious garbage (empty/whitespace-only
 * strings, embedded whitespace, slashes) and PRESERVES the caller's key
 * byte-for-byte - no lowercasing, no rejection of IDN or underscore labels
 * (which the previous validateDomain-based check wrongly mangled/refused).
 */
function validateDocRootKey(key: string, fieldName: string): string {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new ValidationError(`${fieldName} must be a non-empty hostname`);
  }
  if (/[\s/\\]/.test(key)) {
    throw new ValidationError(
      `${fieldName} must be a hostname without whitespace or slashes`
    );
  }
  return key;
}

/** get_package_web_overview */
export async function handleGetPackageWebOverview(
  client: WebPackageClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packageId: string;
  try {
    packageId = validateString(args.package_id, 'package_id');
  } catch (error) {
    throw toMcpError(error);
  }

  const webOverview = await client.getPackageWebOverview(packageId);
  return jsonResult(webOverview);
}

/** manage_website_cdn */
export async function handleManageWebsiteCdn(
  client: WebPackageClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packageId: string;
  let action: 'enable' | 'disable' | 'purge';
  try {
    packageId = validateString(args.package_id, 'package_id');
    action = validateEnum(args.action, ['enable', 'disable', 'purge'], 'action');
  } catch (error) {
    throw toMcpError(error);
  }

  const cdnResult = await client.manageWebsiteCdn(packageId, action);
  return jsonResult(cdnResult);
}

/** update_website_document_root */
export async function handleUpdateWebsiteDocumentRoot(
  client: WebPackageClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packageId: string;
  let update: Record<string, string>;
  try {
    packageId = validateString(args.package_id, 'package_id');

    const rawUpdate = validateObject(args.update, 'update');
    const keys = Object.keys(rawUpdate);
    if (keys.length === 0) {
      throw new ValidationError('update must contain at least one domain-to-document-root mapping');
    }

    update = {};
    for (const key of keys) {
      const hostname = validateDocRootKey(key, `update key "${key}"`);
      update[hostname] = validateString(rawUpdate[key], `update["${key}"]`);
    }
  } catch (error) {
    throw toMcpError(error);
  }

  const docRootResult = await client.updateWebsiteDocumentRoot(packageId, update);
  return jsonResult(docRootResult);
}

/** get_cdn_cache_hit_stats */
export async function handleGetCdnCacheHitStats(
  client: WebPackageClient,
  args: Record<string, any>
): Promise<ToolResult> {
  let packageId: string;
  let period: 'Last1Hour' | 'Last24Hours' | 'Last7Days';
  try {
    packageId = validateString(args.package_id, 'package_id');
    period = validateEnum(args.period, ['Last1Hour', 'Last24Hours', 'Last7Days'], 'period');
  } catch (error) {
    throw toMcpError(error);
  }

  const cacheHitStats = await client.getCdnCacheHitStats(packageId, period);
  return jsonResult(cacheHitStats);
}
