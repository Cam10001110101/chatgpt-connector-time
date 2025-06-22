# Model Context Protocol Specification - 2025-06-18

## Overview

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Whether you're building an AI-powered IDE, enhancing a chat interface, or creating custom AI workflows, MCP provides a standardized way to connect LLMs with the context they need.

This specification defines the authoritative protocol requirements, based on the TypeScript schema in [schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-06-18/schema.ts).

For implementation guides and examples, visit [modelcontextprotocol.io](https://modelcontextprotocol.io).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14) [[RFC2119](https://datatracker.ietf.org/doc/html/rfc2119)] [[RFC8174](https://datatracker.ietf.org/doc/html/rfc8174)] when, and only when, they appear in all capitals, as shown here.

## Key Changes from 2025-03-26

### Major Changes

1. **Remove support for JSON-RPC batching** (PR [#416](https://github.com/modelcontextprotocol/specification/pull/416))
2. **Add support for structured tool output** (PR [#371](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/371))
3. **Classify MCP servers as OAuth Resource Servers**, adding protected resource metadata to discover the corresponding Authorization server (PR [#338](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/338))
4. **Require MCP clients to implement Resource Indicators** as described in [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html) to prevent malicious servers from obtaining access tokens (PR [#734](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/734))
5. **Clarify security considerations** and best practices in the authorization spec and in a new security best practices page
6. **Add support for elicitation**, enabling servers to request additional information from users during interactions (PR [#382](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/382))
7. **Add support for resource links** in tool call results (PR [#603](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/603))
8. **Require negotiated protocol version to be specified** via `MCP-Protocol-Version` header in subsequent requests when using HTTP (PR [#548](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/548))
9. **Change SHOULD to MUST** in Lifecycle Operation

### Other Schema Changes

1. **Add `_meta` field** to additional interface types (PR [#710](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/710))
2. **Add `context` field** to `CompletionRequest`, providing for completion requests to include previously-resolved variables (PR [#598](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/598))
3. **Add `title` field** for human-friendly display names, so that `name` can be used as a programmatic identifier (PR [#663](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/663))

## Base Protocol

### JSON-RPC Messages

All messages between MCP clients and servers **MUST** follow the [JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification.

#### Requests
- Requests **MUST** include a string or integer ID (not null)
- Request IDs **MUST** be unique within a session
- Requests **MUST** include a method string
- JSON-RPC batching is **NOT** supported in this version

#### Responses
- Responses **MUST** include the same ID as the corresponding request
- Responses **MUST** include either a result or an error (not both)
- Error responses **MUST** include an error code and message

#### Notifications
- Notifications **MUST NOT** include an ID
- Notifications **MUST** include a method string

### Transport

#### STDIO Transport
- Client **MUST** launch server as subprocess
- Server **MUST** read from stdin and write to stdout
- Messages **MUST** be delimited by newlines
- Messages **MUST NOT** contain embedded newlines
- Server **MUST NOT** write anything to stdout that is not a valid MCP message
- Client **MUST NOT** write anything to stdin that is not a valid MCP message

#### Streamable HTTP Transport
- Server **MUST** provide a single HTTP endpoint supporting both POST and GET methods
- Client messages **MUST** be sent as HTTP POST requests
- Server **MAY** use Server-Sent Events (SSE) for streaming responses
- Client **MUST** include `MCP-Protocol-Version` header on all subsequent requests
- Server **MUST** validate `Origin` header to prevent DNS rebinding attacks
- When running locally, servers **SHOULD** bind only to localhost

### Lifecycle

#### Initialization
- Client **MUST** send initialize request as first interaction
- Initialize request **MUST** include protocol version supported
- Initialize request **MUST** include client capabilities
- Initialize request **MUST** include client implementation information
- Server **MUST** respond with protocol version
- Server **MUST** respond with server capabilities
- Server **MUST** respond with server implementation information
- After successful initialization, client **MUST** send initialized notification

#### Version Negotiation
- Client **MUST** send a protocol version it supports
- If server supports requested version, it **MUST** respond with same version
- Otherwise, server **MUST** respond with another supported version
- If client doesn't support server's version, it **SHOULD** disconnect

#### Capability Negotiation
- Client and server **MUST** declare capabilities during initialization
- Both parties **SHOULD** respect negotiated capabilities

#### Shutdown
- For STDIO: client **SHOULD** close input stream to server for shutdown
- For HTTP: shutdown indicated by closing HTTP connections

### Authorization (HTTP Only)

#### OAuth 2.1 Compliance
- MCP servers **MUST** act as OAuth 2.1 resource servers
- MCP clients **MUST** implement Resource Indicators (RFC 8707)
- Authorization servers **MUST** implement OAuth 2.1 with appropriate security measures
- Authorization servers **SHOULD** support Dynamic Client Registration (RFC 7591)

#### Protected Resource Metadata
- MCP servers **MUST** implement OAuth 2.0 Protected Resource Metadata (RFC 9728)
- Servers **MUST** use `WWW-Authenticate` header when returning 401 Unauthorized
- Clients **MUST** parse `WWW-Authenticate` headers and respond to 401 responses

#### Access Token Usage
- Clients **MUST** use Authorization header with Bearer token
- Access tokens **MUST NOT** be included in URI query strings
- Servers **MUST** validate access tokens were issued specifically for them
- Servers **MUST NOT** accept tokens intended for other resources

### Security Considerations

#### General Security
- Users **MUST** explicitly consent to data access and operations
- Users **MUST** retain control over data sharing and actions
- Hosts **MUST** obtain explicit user consent before exposing user data
- Tools require explicit user consent before invocation

#### Token Security
- Servers **MUST** validate token audience to prevent confused deputy attacks
- Token passthrough is explicitly forbidden
- Clients **MUST** include resource parameter in authorization requests
- Authorization servers **SHOULD** issue short-lived access tokens

#### Session Security
- Session IDs **MUST** be secure and non-deterministic
- Servers **SHOULD** bind session IDs to user-specific information
- Servers **MUST** verify all inbound requests when authorization is implemented

## Server Features

### Resources

#### Capabilities
- Servers supporting resources **MUST** declare resources capability
- Resources capability **MAY** include subscribe feature
- Resources capability **MAY** include listChanged feature

#### Listing Resources
- Server response to resources/list **MUST** include resources array
- Each resource **MUST** include uri and name
- Each resource **SHOULD** include title for display purposes

#### Reading Resources
- Server response to resources/read **MUST** include contents array
- Each content item **MUST** include uri and either text or blob
- Each content item **SHOULD** include mimeType

#### Resource Templates
- Server response to resources/templates/list **MUST** include resourceTemplates array
- Each template **MUST** include uriTemplate

#### Notifications
- Server **MUST** send notifications/resources/updated when resource changes
- Server **MUST** support subscribe capability to use subscription feature
- Server **SHOULD** send notifications/resources/list_changed when resource list changes
- Server **MUST** support listChanged capability to use list_changed notification

### Prompts

#### Capabilities
- Servers supporting prompts **MUST** declare prompts capability
- Prompts capability **MAY** include listChanged feature

#### Listing Prompts
- Server response to prompts/list **MUST** include prompts array
- Each prompt **MUST** include name
- Each prompt **SHOULD** include title for display purposes

#### Getting Prompts
- Server response to prompts/get **MUST** include messages array
- Each message **MUST** include role and content
- Content **MUST** be one of: text, image, audio, or resource

#### Notifications
- Server **SHOULD** send notifications/prompts/list_changed when prompt list changes
- Server **MUST** support listChanged capability to use list_changed notification

### Tools

#### Capabilities
- Servers supporting tools **MUST** declare tools capability
- Tools capability **MAY** include listChanged feature

#### Listing Tools
- Server response to tools/list **MUST** include tools array
- Each tool **MUST** include name, description, and inputSchema
- Each tool **SHOULD** include title for display purposes
- Each tool **MAY** include outputSchema for structured results

#### Calling Tools
- Server response to tools/call **MUST** include content array and isError flag
- Each content item **MUST** be one of: text, image, audio, resource, or resource_link
- Tools **MAY** return structured content in structuredContent field
- If outputSchema provided, structured results **MUST** conform to schema

#### Notifications
- Server **SHOULD** send notifications/tools/list_changed when tool list changes
- Server **MUST** support listChanged capability to use list_changed notification

## Client Features

### Roots

#### Capabilities
- Clients supporting roots **MUST** declare roots capability
- Roots capability **MAY** include listChanged feature

#### Listing Roots
- Client response to roots/list **MUST** include roots array
- Each root **MUST** include uri
- Each root **SHOULD** include name for display purposes

#### Notifications
- Client **MUST** send notifications/roots/list_changed when root list changes
- Client **MUST** support listChanged capability to use list_changed notification

### Sampling

#### Capabilities
- Clients supporting sampling **MUST** declare sampling capability

#### Creating Messages
- Client response to sampling/createMessage **MUST** include role, content, model, and stopReason
- Content **MUST** be one of: text, image, or audio
- Clients **SHOULD** implement human-in-the-loop approval for sampling requests

### Elicitation

#### Capabilities
- Clients supporting elicitation **MUST** declare elicitation capability

#### Creating Elicitation Requests
- Client response to elicitation/create **MUST** include action and optionally content
- Action **MUST** be one of: accept, reject, or cancel
- Schema **MUST** be restricted to flat objects with primitive properties
- Clients **SHOULD** provide clear UI for elicitation requests

## Utilities

### Ping
- Ping receiver **MUST** respond promptly with empty response

### Cancellation
- Cancellation notification **MUST** include requestId of request to cancel
- Cancellation notifications **MUST** only reference previously issued requests
- Initialize request **MUST NOT** be cancelled by clients
- Receivers **SHOULD** stop processing cancelled request

### Progress
- Progress tokens **MUST** be unique across active requests
- Progress notifications **MUST** include progressToken and progress value
- Progress value **MUST** increase with each notification
- Progress notifications **MUST** only reference active requests

### Logging
- Servers supporting logging **MUST** declare logging capability
- Log messages **MUST** follow standard syslog severity levels
- Log messages **MUST NOT** contain sensitive information

### Completion
- Server response to completion/complete **MUST** include completion values
- Completion response limited to maximum 100 items per response
- Completion requests **MAY** include context with previously-resolved arguments

### Pagination
- Clients **MUST** treat cursors as opaque tokens
- Servers **SHOULD** provide stable cursors
- Missing nextCursor indicates end of results

## Meta Fields

The `_meta` property is reserved by MCP for protocol-level metadata. Key names have two segments: an optional prefix and a name. Prefixes beginning with `modelcontextprotocol` or `mcp` are reserved for MCP use. 