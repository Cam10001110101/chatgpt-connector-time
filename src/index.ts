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

// Tool definitions - organized for both Chat and Deep Research capabilities
const tools = [
	// CHAT TOOLS - For quick, conversational interactions
	{
		name: 'current_time',
		title: 'Current Time',
		description: 'Get the current time now. Perfect for questions like "What time is it?" or "What time is it in Tokyo?" Supports any timezone and custom formatting.',
		inputSchema: {
			type: "object",
			properties: {
				format: {
					type: "string",
					description: "How to format the time (default: YYYY-MM-DD HH:mm:ss). Examples: 'h:mm A' for 12-hour, 'HH:mm' for 24-hour",
					default: "YYYY-MM-DD HH:mm:ss"
				},
				timezone: {
					type: "string",
					description: "IANA timezone name like 'America/New_York', 'Europe/London', 'Asia/Tokyo'. If not specified, uses system timezone."
				}
			}
		}
	},
	{
		name: 'convert_time',
		title: 'Convert Time Between Timezones',
		description: 'Convert any time from one timezone to another. Great for scheduling across timezones or travel planning.',
		inputSchema: {
			type: "object",
			properties: {
				sourceTimezone: {
					type: "string",
					description: "Source timezone (e.g., 'America/Los_Angeles', 'UTC', 'Europe/Paris')"
				},
				targetTimezone: {
					type: "string",
					description: "Target timezone (e.g., 'Asia/Tokyo', 'America/New_York')"
				},
				time: {
					type: "string",
					description: "Time to convert in format YYYY-MM-DD HH:mm:ss (e.g., '2025-06-22 15:30:00')"
				}
			},
			required: ["sourceTimezone", "targetTimezone", "time"]
		}
	},
	{
		name: 'relative_time',
		title: 'Time Ago/Until',
		description: 'Calculate how long ago something happened or how long until a future event. Examples: "How long ago was 2020-01-01?" or "How long until Christmas?"',
		inputSchema: {
			type: "object",
			properties: {
				time: {
					type: "string",
					description: "Date/time to compare (format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD)"
				}
			},
			required: ["time"]
		}
	},
	{
		name: 'days_in_month',
		title: 'Days in Month',
		description: 'Find out how many days are in any month and year. Accounts for leap years automatically.',
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					description: "Date in format YYYY-MM-DD (e.g., '2024-02-01'). If not provided, uses current month."
				}
			}
		}
	},
	{
		name: 'get_timestamp',
		title: 'Unix Timestamp',
		description: 'Convert a date/time to Unix timestamp (milliseconds since 1970). Useful for programming and API work.',
		inputSchema: {
			type: "object",
			properties: {
				time: {
					type: "string",
					description: "Date/time to convert (format: YYYY-MM-DD HH:mm:ss). If not provided, uses current time."
				}
			}
		}
	},
	{
		name: 'get_week_year',
		title: 'Week Number',
		description: 'Get the week number of the year for any date. Returns both standard and ISO week numbers.',
		inputSchema: {
			type: "object",
			properties: {
				date: {
					type: "string",
					description: "Date to check (format: YYYY-MM-DD). If not provided, uses today."
				}
			}
		}
	},
	
	// DEEP RESEARCH TOOLS - For comprehensive time knowledge search
	{
		name: 'search',
		title: 'Search Time Knowledge',
		description: `Search comprehensive time-related knowledge including historical events, calendar systems, timekeeping technologies, and scientific developments.

Usage Guidelines:
• Use specific keywords related to time concepts (e.g., "atomic clock", "calendar reform", "time zone history")
• Search by historical periods (e.g., "ancient timekeeping", "medieval calendar")
• Look for scientific developments (e.g., "UTC development", "leap second")
• Find cultural time practices (e.g., "Mayan calendar", "lunar calendar")

Examples:
• "atomic clock invention" - Find the history of atomic timekeeping
• "gregorian calendar reform" - Learn about calendar system changes
• "sundial ancient civilizations" - Discover early timekeeping methods
• "time zone standardization" - Research time zone development
• "leap year calculation" - Understand leap year history and methods

The search covers topics from ancient civilizations to modern scientific timekeeping.`,
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query for time-related knowledge. Use specific keywords about time concepts, historical periods, technologies, or cultural practices."
				}
			},
			required: ["query"]
		}
	},
	{
		name: 'fetch',
		title: 'Get Detailed Time Knowledge',
		description: 'Retrieve complete details about a specific time-related topic by its ID. Use this after searching to get full information with sources and references.',
		inputSchema: {
			type: "object",
			properties: {
				id: {
					type: "string",
					description: "ID of the knowledge item (obtained from search results)"
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
				// Return server info for GET requests
				const url = new URL(request.url);
				if (url.pathname === '/sse') {
					// SSE endpoint - future implementation
					return new Response('SSE endpoint not yet implemented', {
						status: 501,
						headers: {
							'Access-Control-Allow-Origin': '*',
						}
					});
				}
				
				// Default GET - return server information
				return new Response(JSON.stringify({
					name: 'mcp-server-http-time',
					version: '1.0.0',
					description: 'Time utilities and comprehensive time knowledge MCP server',
					transport: ['http'],
					capabilities: {
						tools: true,
						search: true,
						fetch: true
					},
					instructions: 'This server provides access to comprehensive time-related knowledge. Use the search tool to find information about historical timekeeping, scientific time standards, calendar systems, time zones, cultural time practices, and modern time synchronization. For current time operations, use the utility tools.'
				}, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
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
