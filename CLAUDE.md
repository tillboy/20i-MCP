# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
20i MCP Server - Model Context Protocol server for 20i hosting API with 271 fully-wired tools (defined in the tools array AND handled in the CallTool switch) against the 324 endpoints in the official 2026-07-05 API spec (83.6% coverage). There are 298 tool definitions and 288 case handlers in total; run `scripts/check-api-coverage.sh` for the definition/handler mismatch lists. This is a production-ready automation-focused project designed to minimize human intervention in hosting management tasks.

## Critical Context
- **Main Implementation**: `src/index.ts` (~16,000 lines) holds the tool definitions and the CallTool switch; 12 newer tool handlers live in modules under `src/modules/` (web-package, bulk-operations, wordpress-blueprints) with one-line case delegations in `src/index.ts`
- **API Documentation Source**: Newest `20i_api_doc*.apib` in `archive/gitignor_ref_folder/` (gitignored; refresh from <https://20i.docs.apiary.io/api-description-document>)
- **Environment Variables**: Must have `TWENTYI_API_KEY`, `TWENTYI_OAUTH_KEY`, `TWENTYI_COMBINED_KEY` set
- **Response Handling**: 20i API may return different formats (JSON objects, UUID strings, empty objects) depending on account status

## Development Commands

### Build & Development
```bash
npm run build      # Compile TypeScript to /build directory
npm run dev        # Development mode with tsx hot reloading
npm run start      # Production server (node build/index.js)
tsx src/index.ts   # Alternative development command
```

### Testing & Analysis
```bash
npm test                       # Run Jest test suite
npm run test:watch             # Run tests in watch mode for development
npm run test:coverage          # Run tests with coverage reporting
scripts/check-api-coverage.sh  # Analyze API coverage and identify gaps
```

## Core Architecture

### Main Components
- **TwentyIClient Class**: Centralized API client in `src/core/client.ts` with comprehensive error handling and response validation
- **MCP Server Instance**: Main implementation in `src/index.ts` with 271 fully-wired tools (298 definitions, 288 case handlers)
- **Modular Architecture**: Core functionality organized in `src/core/` (client, types, validation, errors) and feature modules in `src/modules/` (domains, packages, util, web-package, bulk-operations, wordpress-blueprints)
- **Tool Definitions**: 298 tool definitions (271 fully wired) covering hosting, domains, WordPress, CDN, security, and database operations
- **Request Handlers**: Two main handlers for `ListTools` and `CallTool` operations
- **Validation System**: Comprehensive input validation utilities in `src/core/validation.ts`

### Authentication & Security
- **Environment Variables Required**: `TWENTYI_API_KEY`, `TWENTYI_OAUTH_KEY`, `TWENTYI_COMBINED_KEY`
- **Authentication Method**: Base64 Bearer token format
- **Security**: No hardcoded credentials - all authentication via environment variables
- **Input Validation**: Comprehensive parameter validation and sanitization

### API Integration Pattern
```typescript
// Standard API call pattern used throughout
const response = await this.apiClient.get(`/endpoint/${id}`, {
  headers: { Authorization: `Bearer ${encodedKey}` }
});
```

## Technology Stack
- **Framework**: @modelcontextprotocol/sdk for MCP implementation
- **HTTP Client**: axios with response interceptors for error handling
- **Language**: TypeScript with strict mode, ES2022 target, ESNext modules
- **Testing**: Jest with TypeScript preset, ESM support, coverage reporting
- **Additional Tools**: basic-ftp, node-ssh, puppeteer for automation scenarios
- **Module System**: Native ES modules with TypeScript compilation

## Key Development Patterns

### Tool Implementation Structure
1. **Tool Definition**: JSON schema-based tool specifications in tools array
2. **Request Handler**: Single switch statement in `CallTool` handler
3. **Error Handling**: Standardized McpError responses with detailed messages
4. **Response Validation**: Comprehensive JSON format validation and error recovery

### API Coverage Organization
- **Official 20i API**: 324 total endpoints per the 2026-07-05 spec (160 GET, 164 POST, no other methods)
- **Spec Source**: Refreshed from the public mirror at <https://20i.docs.apiary.io/api-description-document> (the login-gated my.20i.com/reseller/apiDoc is not directly scrapable)
- **Implementation Status**: 271 fully-wired tools (298 definitions, 288 case handlers) implemented across all major categories
- **Tool Categories**: Core management, hosting packages, WordPress, CDN, databases, security

## File Structure & Key Locations
- **Main Server**: `src/index.ts` - Complete MCP server implementation
- **Core Architecture**: `src/core/` - Foundational classes (client, types, validation, errors)
- **Feature Modules**: `src/modules/` - Domain-specific functionality (domains, packages, util, web-package, bulk-operations, wordpress-blueprints)
- **Testing**: `tests/` - Jest test suites with unit tests and helper mocks
- **Scripts**: `scripts/` - Development and automation utilities
- **API Documentation**: Newest `20i_api_doc*.apib` in `archive/gitignor_ref_folder/` - Official 20i API reference (gitignored; refresh from <https://20i.docs.apiary.io/api-description-document>)
- **Documentation**: `docs/` - Project documentation and implementation guides
- **Coverage Analysis**: `scripts/check-api-coverage.sh` - API coverage tracking

## Configuration Files
- **TypeScript**: `tsconfig.json` - Strict mode, ES2022 target, ESNext modules
- **Package**: `package.json` - Dependencies and build scripts
- **MCP Client**: Configure in Claude Desktop with environment variables

## Development Guidelines

### Adding New Tools
The canonical pattern is a **handler module in `src/modules/`** with a one-line case delegation in `src/index.ts`. Use `src/modules/web-package.ts` as the model (with `tests/unit/web-package.test.ts`); `bulk-operations.ts` and `wordpress-blueprints.ts` follow the same shape. Do NOT add new inline case bodies to `src/index.ts`.

1. **Handler Module**: Create (or extend) a module in `src/modules/` exporting one `async function handleXxx(client, args)` per tool. Return results via `jsonResult()` from `src/modules/util.ts` (`ToolResult` type).
2. **Structural Client Interface**: In the module, declare a minimal interface for just the client methods the handlers need (e.g. `WebPackageClient` in `src/modules/web-package.ts`). The private `TwentyIClient` class in `src/index.ts` satisfies it structurally — no import of the class needed, and tests can pass a mock.
3. **Client Method**: Add the actual API call as a method on `TwentyIClient` in `src/index.ts`, following the existing axios patterns.
4. **Tool Definition**: Add the tool to the `tools: [` array in `src/index.ts` (~line 5520) with proper JSON schema for input validation.
5. **Case Delegation**: Add a one-line case to the CallTool switch in `src/index.ts` (switch starts ~line 11781): `case 'tool_name': return await handleToolName(twentyIClient, args);`. A tool is only live when it has BOTH a definition and a case — `scripts/check-api-coverage.sh` flags mismatches under NEEDS ATTENTION.
6. **Validation**: Use validation utilities from `src/core/validation.ts` inside the handler for input sanitization; convert errors with `toMcpError` from `src/core/errors.ts`.
7. **Testing**: Add unit tests in `tests/unit/` that import the real handler functions from the module and exercise them against a mock client (see `tests/unit/web-package.test.ts`; shared mocks in `tests/helpers/mockClient.ts`).
8. **Documentation**: Re-run `scripts/check-api-coverage.sh` and update coverage numbers in docs if implementing new endpoints.
9. **Naming Convention**: Use snake_case for tool names (e.g., `get_hosting_package_info`)

### Error Handling Standards
- Use try-catch blocks with detailed error messages
- Implement response validation for all API calls
- Provide meaningful error context to users
- Handle network failures gracefully

### Testing Approach
- **Jest Configuration**: ESM preset with TypeScript support in `jest.config.js`
- **Test Structure**: Unit tests in `tests/unit/`, shared helpers in `tests/helpers/`
- **Mock Infrastructure**: Use `tests/helpers/mockClient.ts` for API client mocking
- **Test Commands**: `npm test` for single run, `npm run test:watch` for development
- **Coverage**: `npm run test:coverage` generates comprehensive coverage reports
- **Validation Testing**: Test input validation and error handling paths
- **API Integration**: Validate responses against expected formats with real API calls in `/testing-files/`
- **Running a Single Test**: `npm test -- path/to/test.ts` or `npm test -- --testNamePattern="test name"`

## Notable Features
- **Comprehensive WordPress Management**: 15 tools for installations, plugins, themes, staging
- **Advanced CDN Control**: 15 tools for caching, security headers, performance optimization
- **Security Management**: 13 tools for IP blocking, malware scanning, SSL certificates
- **Database Operations**: 5 tools for MySQL/MSSQL management and user permissions
- **Bulk Operations**: Multi-site management capabilities for enterprise scenarios

## Automation Infrastructure
The project includes extensive automation capabilities through 54 scripts in `/automation/` demonstrating:
- Multi-approach deployment strategies (API, SSH, web automation)
- Sophisticated error handling with retry logic
- MySQL Grant API discovery and implementation
- SuiteCRM deployment automation achieving 95% success rate

## Security Considerations
- Never commit API keys or credentials to the repository
- Use environment variables for all authentication
- Validate all user inputs before API calls
- Implement proper error handling to avoid information leakage
- Follow the existing base64 encoding pattern for API tokens

## Development Environment Setup
- **Node.js**: Version 18+ required for ES modules and modern features
- **TypeScript**: Strict mode enabled with ES2022 target
- **Jest**: Configured for ESM with TypeScript preset
- **Environment Variables**: Required for API authentication (see Authentication & Security section)

## Common Debugging Tips
- **Console Output**: Use `console.error()` instead of `console.log()` to avoid polluting stdio transport
- **API Response Issues**: Check `/testing-files/` for example API responses and edge cases
- **Coverage Gaps**: Run `scripts/check-api-coverage.sh` to identify unimplemented endpoints
- **Tool Discovery**: All tool names are listed in `scripts/all_tools.txt` for quick reference