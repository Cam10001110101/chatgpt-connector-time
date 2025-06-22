import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import timeRecordsData from './time_records.json';

// Initialize dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

export interface Env {
	// Environment variables can be configured in wrangler.toml or via the Cloudflare dashboard
}

// Define interfaces for time records
interface TimeRecord {
	id: string;
	title: string;
	text: string;
	url?: string;
	metadata: {
		category: string;
		year: number;
	};
}

// Load time records and create lookup map
const TIME_RECORDS: TimeRecord[] = timeRecordsData as TimeRecord[];
const TIME_RECORDS_LOOKUP: Record<string, TimeRecord> = TIME_RECORDS.reduce((acc, record) => {
	acc[record.id] = record;
	return acc;
}, {} as Record<string, TimeRecord>);

// Tool definitions
const tools = [
	{
		name: 'current_time',
		title: 'Get Current Time',
		description: 'Returns the current time in UTC and a specified or guessed timezone.',
		inputSchema: {
			type: "object",
			properties: {
				format: {
					type: "string",
					description: "The format for the returned time string.",
					default: "YYYY-MM-DD HH:mm:ss"
				},
				timezone: {
					type: "string",
					description: "The IANA timezone name (e.g., \"America/New_York\"). Defaults to the server's guessed timezone."
				}
			}
		}
	},
	{
		name: 'relative_time',
		title: 'Get Relative Time',
		description: 'Calculates the relative time from now to a given time string.',
		inputSchema: {
			type: "object",
			properties: {
				time: {
					type: "string",
					description: "The time to compare. Format: YYYY-MM-DD HH:mm:ss"
				}
			},
			required: ["time"]
		}
	},
	{
		name: 'days_in_month',
		title: 'Get Days in Month',
		description: 'Returns the number of days in the month of a given date.',
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					description: "The date to check. Format: YYYY-MM-DD"
				}
			}
		}
	},
	{
		name: 'get_timestamp',
		title: 'Get Timestamp',
		description: 'Converts a date-time string to a Unix timestamp in milliseconds.',
		inputSchema: {
			type: "object",
			properties: {
				time: {
					type: "string",
					description: "The time to convert. Format: YYYY-MM-DD HH:mm:ss"
				}
			}
		}
	},
	{
		name: 'convert_time',
		title: 'Convert Timezone',
		description: 'Converts a time from a source timezone to a target timezone.',
		inputSchema: {
			type: "object",
			properties: {
				sourceTimezone: {
					type: "string",
					description: "The source IANA timezone name (e.g., \"Asia/Shanghai\")."
				},
				targetTimezone: {
					type: "string",
					description: "The target IANA timezone name (e.g., \"Europe/London\")."
				},
				time: {
					type: "string",
					description: "The time to convert. e.g., \"2025-03-23 12:30:00\"."
				}
			},
			required: ["sourceTimezone", "targetTimezone", "time"]
		}
	},
	{
		name: 'get_week_year',
		title: 'Get Week of Year',
		description: 'Returns the week and ISO week number for a given date.',
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					description: "The date to check. e.g., \"2025-03-23\""
				}
			}
		}
	},
	{
		name: 'search',
		title: 'Search Time Knowledge',
		description: 'Searches for time-related historical facts, calendar systems, timekeeping technologies, and time standards using keyword matching across titles, content, and metadata.',
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query for time-related topics. Examples: 'calendar', 'atomic clock', 'UTC', 'leap year', 'timezone', 'maya calendar', 'sundial'"
				}
			},
			required: ["query"]
		}
	},
	{
		name: 'fetch',
		title: 'Fetch Time Knowledge Item',
		description: 'Retrieves detailed content for a specific time-related knowledge item by its ID.',
		inputSchema: {
			type: "object",
			properties: {
				id: {
					type: "string",
					description: "ID of the time knowledge item to fetch (e.g., 'gregorian-calendar', 'unix-epoch', 'atomic-clock')"
				}
			},
			required: ["id"]
		}
	}
];

// Helper functions for security and protocol validation
function isValidOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		// Allow localhost and secure origins for development and production
		const allowedHosts = [
			'localhost',
			'127.0.0.1',
			'0.0.0.0',
			'mcpcentral.io',
			'mcp.time.mcpcentral.io'
		];
		
		// Allow any localhost port for development
		if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
			return true;
		}
		
		// Allow our production domains
		return allowedHosts.some(host => 
			url.hostname === host || url.hostname.endsWith('.' + host)
		);
	} catch {
		return false;
	}
}

function isSupportedProtocolVersion(version: string): boolean {
	const supportedVersions = [
		'2025-06-18',
		'2025-03-26', // Backwards compatibility
		'2024-11-05'  // Backwards compatibility
	];
	return supportedVersions.includes(version);
}

// Tool execution functions
async function executeTool(name: string, args: any) {
	try {
		switch (name) {
			case 'current_time':
				const utcTime = dayjs.utc();
				const localTimezone = args.timezone ?? dayjs.tz.guess();
				const localTime = utcTime.tz(localTimezone);
				const format = args.format ?? 'YYYY-MM-DD HH:mm:ss';

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							utcTime: utcTime.format(format),
							localTime: localTime.format(format),
							timezone: localTimezone,
						}, null, 2)
					}],
					isError: false
				};

			case 'relative_time':
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							relativeTime: dayjs(args.time).fromNow(),
						}, null, 2)
					}],
					isError: false
				};

			case 'days_in_month':
				const result = args.date ? dayjs(args.date).daysInMonth() : dayjs().daysInMonth();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							days: result,
						}, null, 2)
					}],
					isError: false
				};

			case 'get_timestamp':
				const timestamp = args.time ? dayjs(args.time).valueOf() : dayjs().valueOf();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							timestamp: timestamp,
						}, null, 2)
					}],
					isError: false
				};

			case 'convert_time':
				const sourceTime = dayjs.tz(args.time, args.sourceTimezone);
				const targetTime = sourceTime.tz(args.targetTimezone);
				const formatString = 'YYYY-MM-DD HH:mm:ss';
				const timeDiff = targetTime.utcOffset() - sourceTime.utcOffset();
				const hoursDiff = Math.round(timeDiff / 60);

				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							convertedTime: targetTime.format(formatString),
							hourDifference: hoursDiff,
						}, null, 2)
					}],
					isError: false
				};

			case 'get_week_year':
				const week = args.date ? dayjs(args.date).week() : dayjs().week();
				const isoWeek = args.date ? dayjs(args.date).isoWeek() : dayjs().isoWeek();
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							week,
							isoWeek,
						}, null, 2)
					}],
					isError: false
				};

			case 'search':
				const query = args.query?.toLowerCase() || '';
				const searchTokens = query.split(/\s+/).filter((token: string) => token.length > 0);
				
				const matchingIds: string[] = [];
				
				for (const record of TIME_RECORDS) {
					const searchText = [
						record.title,
						record.text,
						record.metadata.category,
						record.metadata.year.toString(),
						record.id
					].join(' ').toLowerCase();
					
					// Check if any search token matches the content
					const hasMatch = searchTokens.some((token: string) => 
						searchText.includes(token)
					);
					
					if (hasMatch) {
						matchingIds.push(record.id);
					}
				}
				
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							results: matchingIds.map(id => {
								const record = TIME_RECORDS_LOOKUP[id];
								return {
									id: record.id,
									title: record.title,
									text: record.text.substring(0, 200) + (record.text.length > 200 ? '...' : ''),
									url: record.url || null
								};
							})
						}, null, 2)
					}],
					isError: false
				};

			case 'fetch':
				const recordId = args.id;
				const record = TIME_RECORDS_LOOKUP[recordId];
				
				if (!record) {
					return {
						content: [{
							type: "text",
							text: `Record not found: ${recordId}`
						}],
						isError: true
					};
				}
				
				return {
					content: [{
						type: "text",
						text: JSON.stringify({
							id: record.id,
							title: record.title,
							text: record.text,
							url: record.url || null,
							metadata: record.metadata
						}, null, 2)
					}],
					isError: false
				};

			default:
				return {
					content: [{
						type: "text",
						text: `Unknown tool: ${name}`
					}],
					isError: true
				};
		}
	} catch (error: any) {
		return {
			content: [{
				type: "text",
				text: `Tool execution error: ${error.message || error}`
			}],
			isError: true
		};
	}
}

// MCP message handler
async function handleMcpRequest(request: any): Promise<any> {
	const { method, params, id } = request;

	switch (method) {
		case 'initialize':
			// Use the client's requested protocol version if supported, otherwise default to latest
			const clientProtocolVersion = params?.protocolVersion || '2025-06-18';
			const responseProtocolVersion = isSupportedProtocolVersion(clientProtocolVersion) 
				? clientProtocolVersion 
				: '2024-11-05'; // Fall back to widely supported version

			return {
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: responseProtocolVersion,
					capabilities: {
						tools: {}
					},
					serverInfo: {
						name: 'mcp-server-http-time',
						version: '1.0.0'
					},
					instructions: "This MCP server provides time-related tools including current time, timezone conversion, relative time calculation, and more."
				}
			};

		case 'tools/list':
			return {
				jsonrpc: '2.0',
				id,
				result: {
					tools: tools
				}
			};

		case 'tools/call':
			try {
				const { name, arguments: args } = params;
				const result = await executeTool(name, args || {});
				return {
					jsonrpc: '2.0',
					id,
					result
				};
			} catch (error: any) {
				return {
					jsonrpc: '2.0',
					id,
					error: {
						code: -32603,
						message: `Tool execution error: ${error.message || error}`
					}
				};
			}

		case 'initialized':
			// This is a notification, no response needed
			return null;

		default:
			return {
				jsonrpc: '2.0',
				id,
				error: {
					code: -32601,
					message: `Method not found: ${method}`
				}
			};
	}
}

// Cloudflare Worker fetch handler
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id, Origin',
				},
			});
		}

		// Security: Validate Origin header to prevent DNS rebinding attacks (MCP requirement 1.2.2.5)
		const origin = request.headers.get('Origin');
		if (origin && !isValidOrigin(origin)) {
			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: 'Invalid origin',
				},
				id: null,
			}), {
				status: 403,
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}

		// Validate MCP Protocol Version header if present
		const protocolVersion = request.headers.get('MCP-Protocol-Version');
		if (protocolVersion && !isSupportedProtocolVersion(protocolVersion)) {
			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: `Unsupported protocol version: ${protocolVersion}`,
				},
				id: null,
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		try {
			if (request.method === 'POST') {
				// Handle MCP requests via POST
				console.log('POST request received');
				const bodyText = await request.text();
				console.log('Raw body:', bodyText);
				
				let body;
				try {
					body = JSON.parse(bodyText);
					console.log('Parsed body:', JSON.stringify(body));
				} catch (parseError) {
					console.error('JSON parse error:', parseError);
					return new Response(JSON.stringify({
						jsonrpc: '2.0',
						error: {
							code: -32700,
							message: 'Parse error',
						},
						id: null,
					}), {
						status: 400,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					});
				}
				
				const mcpResponse = await handleMcpRequest(body);
				console.log('MCP response:', JSON.stringify(mcpResponse));
				
				// If it's a notification (initialized), return 202 Accepted
				if (mcpResponse === null) {
					return new Response(null, {
						status: 202,
						headers: {
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
							'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id',
						},
					});
				}
				
				return new Response(JSON.stringify(mcpResponse), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id',
					},
				});
			} else if (request.method === 'GET') {
				// For now, return 405 Method Not Allowed for GET requests
				// In a full implementation, this would handle SSE streams
				return new Response('Method not allowed', { 
					status: 405,
					headers: {
						'Access-Control-Allow-Origin': '*',
					}
				});
			} else {
				return new Response('Method not allowed', { 
					status: 405,
					headers: {
						'Access-Control-Allow-Origin': '*',
					}
				});
			}
		} catch (error: any) {
			console.error('Error handling MCP request:', error);
			
			// Return proper JSON-RPC error response
			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: 'Internal server error',
				},
				id: null,
			}), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	},
};
