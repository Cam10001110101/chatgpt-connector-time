# Model Context Protocol Specification - Test-Oriented Format
**Protocol Revision: 2024-11-05**

This document reorganizes the MCP specification into a format optimized for test creation. Each section contains testable requirements with MUST, SHOULD, and MAY conditions clearly highlighted.

## Table of Contents
1. [Base Protocol](#1-base-protocol)
   1. [JSON-RPC Message Format](#11-json-rpc-message-format)
   2. [Transport Mechanisms](#12-transport-mechanisms)
   3. [Lifecycle Management](#13-lifecycle-management)
2. [Server Features](#2-server-features)
   1. [Resources](#21-resources)
   2. [Prompts](#22-prompts)
   3. [Tools](#23-tools)
3. [Client Features](#3-client-features)
   1. [Roots](#31-roots)
   2. [Sampling](#32-sampling)
4. [Utilities](#4-utilities)
   1. [Ping](#41-ping)
   2. [Cancellation](#42-cancellation)
   3. [Progress](#43-progress)
   4. [Logging](#44-logging)
   5. [Completion](#45-completion)
   6. [Pagination](#46-pagination)

## 1. Base Protocol

### 1.1 JSON-RPC Message Format

#### 1.1.1 Request Format
- **MUST** follow JSON-RPC 2.0 specification
- **MUST** include a string or integer ID (not null)
- **MUST** use unique IDs for each request within a session
- **MUST** include a method string
- **MAY** include parameters object

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "example_method",
  "params": {
    "exampleParam": "value"
  }
}
```

#### 1.1.2 Response Format
- **MUST** include the same ID as the corresponding request
- **MUST** include either a result or an error (not both)
- **MUST** include an error code and message if returning an error

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "exampleResult": "value"
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

#### 1.1.3 Notification Format
- **MUST NOT** include an ID
- **MUST** include a method string
- **MAY** include parameters object

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/example",
  "params": {
    "exampleParam": "value"
  }
}
```

### 1.2 Transport Mechanisms

#### 1.2.1 STDIO Transport
- Client **MUST** launch the server as a subprocess
- Server **MUST** read from stdin and write to stdout
- Messages **MUST** be delimited by newlines
- Messages **MUST NOT** contain embedded newlines
- Server **MAY** write UTF-8 strings to stderr for logging
- Server **MUST NOT** write anything to stdout that is not a valid MCP message
- Client **MUST NOT** write anything to stdin that is not a valid MCP message

#### 1.2.2 HTTP with SSE Transport
- Server **MUST** provide two endpoints:
  - An SSE endpoint for clients to connect and receive messages
  - An HTTP POST endpoint for clients to send messages
- When client connects, server **MUST** send an endpoint event with URI for client messages
- All client messages **MUST** be sent as HTTP POST requests to this endpoint
- Server messages are sent as SSE message events
- Message content is encoded as JSON in the event data

### 1.3 Lifecycle Management

#### 1.3.1 Initialization
- Client **MUST** send initialize request as first interaction
- Initialize request **MUST** include:
  - Protocol version supported
  - Client capabilities
  - Client implementation information
- Server **MUST** respond with:
  - Protocol version
  - Server capabilities
  - Server implementation information
- After successful initialization, client **MUST** send initialized notification
- Client **SHOULD NOT** send requests other than pings before server responds to initialize
- Server **SHOULD NOT** send requests other than pings and logging before initialized notification

```json
// Initialize request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  }
}

// Initialize response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    }
  }
}

// Initialized notification
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

#### 1.3.2 Version Negotiation
- Client **MUST** send a protocol version it supports (preferably latest)
- If server supports requested version, it **MUST** respond with same version
- Otherwise, server **MUST** respond with another supported version
- If client doesn't support server's version, it **SHOULD** disconnect

#### 1.3.3 Capability Negotiation
- Client and server **MUST** declare capabilities during initialization
- Both parties **SHOULD** respect negotiated capabilities
- Only capabilities declared by both parties should be used

#### 1.3.4 Shutdown
- No specific shutdown messages defined
- For stdio: client **SHOULD** close input stream to server
- For HTTP: shutdown indicated by closing HTTP connections

## 2. Server Features

### 2.1 Resources

#### 2.1.1 Capabilities
- Servers supporting resources **MUST** declare resources capability
- Optional features include:
  - subscribe: client can subscribe to resource changes
  - listChanged: server will notify when resource list changes

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

#### 2.1.2 Resources List
- Client sends resources/list request (supports pagination)
- Server response **MUST** include resources array
- Each resource **MUST** include uri and name
- Each resource **MAY** include description, mimeType

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///project/src/main.rs",
        "name": "main.rs",
        "description": "Primary application entry point",
        "mimeType": "text/x-rust"
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

#### 2.1.3 Resource Content
- Client sends resources/read request with resource URI
- Server response **MUST** include contents array
- Each content item **MUST** include uri and either text or blob
- Each content item **SHOULD** include mimeType

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///project/src/main.rs",
        "mimeType": "text/x-rust",
        "text": "fn main() {\n    println!(\"Hello world!\");\n}"
      }
    ]
  }
}
```

#### 2.1.4 Resource Templates
- Client sends resources/templates/list request
- Server response **MUST** include resourceTemplates array
- Each template **MUST** include uriTemplate
- Each template **MAY** include name, description, mimeType

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/templates/list"
}

// Response
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "Project Files",
        "description": "Access files in the project directory",
        "mimeType": "application/octet-stream"
      }
    ]
  }
}
```

#### 2.1.5 Resource Subscriptions
- Client sends resources/subscribe request with resource URI
- Server **MUST** send notifications/resources/updated when resource changes
- Server **MUST** support subscribe capability to use this feature

```json
// Subscribe request
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}

// Update notification
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

#### 2.1.6 List Changed Notification
- Server **SHOULD** send notifications/resources/list_changed when resource list changes
- Server **MUST** support listChanged capability to use this feature

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed"
}
```

### 2.2 Prompts

#### 2.2.1 Capabilities
- Servers supporting prompts **MUST** declare prompts capability
- Optional features include:
  - listChanged: server will notify when prompt list changes

```json
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

#### 2.2.2 Prompts List
- Client sends prompts/list request (supports pagination)
- Server response **MUST** include prompts array
- Each prompt **MUST** include name
- Each prompt **MAY** include description, arguments

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "description": "Asks the LLM to analyze code quality",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

#### 2.2.3 Get Prompt
- Client sends prompts/get request with prompt name and arguments
- Server response **MUST** include messages array
- Each message **MUST** include role and content
- Content **MUST** be one of: text, image, or resource

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n    print('world')"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n    print('world')"
        }
      }
    ]
  }
}
```

#### 2.2.4 List Changed Notification
- Server **SHOULD** send notifications/prompts/list_changed when prompt list changes
- Server **MUST** support listChanged capability to use this feature

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

### 2.3 Tools

#### 2.3.1 Capabilities
- Servers supporting tools **MUST** declare tools capability
- Optional features include:
  - listChanged: server will notify when tool list changes

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

#### 2.3.2 Tools List
- Client sends tools/list request (supports pagination)
- Server response **MUST** include tools array
- Each tool **MUST** include name, description, inputSchema

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "Get current weather information",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name or zip code"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

#### 2.3.3 Tool Call
- Client sends tools/call request with tool name and arguments
- Server response **MUST** include content array and isError flag
- Each content item **MUST** be one of: text, image, or resource

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "New York"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Current weather in New York:\nTemperature: 72°F\nConditions: Partly cloudy"
      }
    ],
    "isError": false
  }
}
```

#### 2.3.4 List Changed Notification
- Server **SHOULD** send notifications/tools/list_changed when tool list changes
- Server **MUST** support listChanged capability to use this feature

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed"
}
```

## 3. Client Features

### 3.1 Roots

#### 3.1.1 Capabilities
- Clients supporting roots **MUST** declare roots capability
- Optional features include:
  - listChanged: client will notify when root list changes

```json
{
  "capabilities": {
    "roots": {
      "listChanged": true
    }
  }
}
```

#### 3.1.2 Roots List
- Server sends roots/list request
- Client response **MUST** include roots array
- Each root **MUST** include uri
- Each root **MAY** include name

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "roots/list"
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "roots": [
      {
        "uri": "file:///home/user/projects/myproject",
        "name": "My Project"
      }
    ]
  }
}
```

#### 3.1.3 List Changed Notification
- Client **MUST** send notifications/roots/list_changed when root list changes
- Client **MUST** support listChanged capability to use this feature

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/roots/list_changed"
}
```

### 3.2 Sampling

#### 3.2.1 Capabilities
- Clients supporting sampling **MUST** declare sampling capability

```json
{
  "capabilities": {
    "sampling": {}
  }
}
```

#### 3.2.2 Create Message
- Server sends sampling/createMessage request with messages and preferences
- Client response **MUST** include role, content, model, stopReason
- Content **MUST** be one of: text or image

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "What is the capital of France?"
        }
      }
    ],
    "modelPreferences": {
      "hints": [
        {
          "name": "claude-3-sonnet"
        }
      ],
      "intelligencePriority": 0.8,
      "speedPriority": 0.5
    },
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 100
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "content": {
      "type": "text",
      "text": "The capital of France is Paris."
    },
    "model": "claude-3-sonnet-20240307",
    "stopReason": "endTurn"
  }
}
```

## 4. Utilities

### 4.1 Ping

#### 4.1.1 Ping Request/Response
- Either party can send ping request with no parameters
- Receiver **MUST** respond promptly with empty response
- If no response is received within timeout, sender **MAY** terminate connection

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "ping"
}

// Response
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {}
}
```

### 4.2 Cancellation

#### 4.2.1 Cancellation Notification
- Either party can send notifications/cancelled to cancel in-progress request
- Notification **MUST** include requestId of request to cancel
- Notification **MAY** include reason string
- Cancellation notifications **MUST** only reference previously issued requests
- Initialize request **MUST NOT** be cancelled by clients
- Receivers **SHOULD** stop processing cancelled request
- Receivers **MAY** ignore cancellation for unknown or completed requests

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/cancelled",
  "params": {
    "requestId": "123",
    "reason": "User requested cancellation"
  }
}
```

### 4.3 Progress

#### 4.3.1 Progress Request
- To receive progress updates, request includes progressToken in _meta
- Progress tokens **MUST** be unique across active requests

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "some_method",
  "params": {
    "_meta": {
      "progressToken": "abc123"
    }
  }
}
```

#### 4.3.2 Progress Notification
- Progress notifications **MUST** include progressToken and progress value
- Progress notifications **MAY** include total
- Progress value **MUST** increase with each notification
- Progress notifications **MUST** only reference active requests

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100
  }
}
```

### 4.4 Logging

#### 4.4.1 Capabilities
- Servers supporting logging **MUST** declare logging capability

```json
{
  "capabilities": {
    "logging": {}
  }
}
```

#### 4.4.2 Set Log Level
- Client sends logging/setLevel request with minimum log level
- Log levels follow RFC 5424: debug, info, notice, warning, error, critical, alert, emergency

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "logging/setLevel",
  "params": {
    "level": "info"
  }
}
```

#### 4.4.3 Log Message Notification
- Server sends notifications/message with log level, optional logger name, and data

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "error",
    "logger": "database",
    "data": {
      "error": "Connection failed",
      "details": {
        "host": "localhost",
        "port": 5432
      }
    }
  }
}
```

### 4.5 Completion

#### 4.5.1 Completion Request
- Client sends completion/complete request with reference type and argument
- Reference types: ref/prompt, ref/resource
- Server response **MUST** include completion values
- Maximum 100 items per response

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "code_review"
    },
    "argument": {
      "name": "language",
      "value": "py"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "completion": {
      "values": ["python", "pytorch", "pyside"],
      "total": 10,
      "hasMore": true
    }
  }
}
```

### 4.6 Pagination

#### 4.6.1 Pagination Format
- Paginated responses **MAY** include nextCursor field if more results exist
- Client continues pagination by including cursor in subsequent requests
- Clients **MUST** treat cursors as opaque tokens
- Operations supporting pagination:
  - resources/list
  - resources/templates/list
  - prompts/list
  - tools/list

```json
// Response with pagination
{
  "jsonrpc": "2.0",
  "id": "123",
  "result": {
    "resources": [...],
    "nextCursor": "eyJwYWdlIjogM30="
  }
}

// Request with cursor
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {
    "cursor": "eyJwYWdlIjogMn0="
  }
}
```

## Common Error Cases

### Specific Error Codes
- Resource not found: -32002
- Invalid params: -32602
- Method not found: -32601
- Internal error: -32603

```json
// Resource not found error
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32002,
    "message": "Resource not found",
    "data": {
      "uri": "file:///nonexistent.txt"
    }
  }
}

// Invalid params error
{
  "jsonrpc": "2.0",
  "id": 6,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: name"
    }
  }
}
```