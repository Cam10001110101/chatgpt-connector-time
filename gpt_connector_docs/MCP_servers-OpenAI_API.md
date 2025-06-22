# MCP Servers

Customize ChatGPT with company knowledge by building and connecting to a custom remote MCP server.

[Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) is an open protocol that's becoming the industry standard for extending AI models with additional tools and knowledge. You can build an MCP server on top of any data source. This guide covers how to set up a basic remote MCP server for use in ChatGPT.


## How it works

Connect any of your tools—including proprietary systems—to ChatGPT deep research, allowing employees to access your company knowledge from ChatGPT. The general process is:

1. Build an MCP server optimized for deep research by exposing a `search` tool and a `fetch` tool.
2. Create a custom deep research connector in ChatGPT.
3. Include detailed usage instructions in the connector setup to help ChatGPT interact with your service effectively.
4. Test and refine the connector directly in ChatGPT.
5. Optionally (for ChatGPT Enterprise, Edu, or Team admins), publish your connector to the entire workspace—where it appears as an additional knowledge source in deep research.

**Looking to access MCP remote servers in your application?**

The guide you're reading is about creating remote MCP servers to connect to ChatGPT. For API access to a network of tools in your LLM application, learn how to [enable your model to use MCP remote servers](https://platform.openai.com/docs/guides/tools-remote-mcp).


## The MCP ecosystem

We're still in the early days of the MCP ecosystem. Popular remote MCP servers today include [Cloudflare](https://developers.cloudflare.com/agents/guides/remote-mcp-server/), [HubSpot](https://developers.hubspot.com/mcp), [Intercom](https://developers.intercom.com/docs/guides/mcp), [PayPal](https://developer.paypal.com/tools/mcp-server/), [Pipedream](https://pipedream.com/docs/connect/mcp/openai/), [Plaid](https://plaid.com/docs/mcp/), [Shopify](https://shopify.dev/docs/apps/build/storefront-mcp), [Stripe](https://docs.stripe.com/mcp), [Square](https://developer.squareup.com/docs/mcp), [Twilio](https://github.com/twilio-labs/function-templates/tree/main/mcp-server) and [Zapier](https://zapier.com/mcp). We expect many more servers—and registries making it easy to discover these servers—to launch. The MCP protocol itself is also early, and we expect to add many more updates to our MCP tool as the protocol evolves.

You may want to understand [risks and safety information](https://platform.openai.com/docs/#risks-and-safety) before deciding to use custom remote MCP servers.


## Build an MCP server

If you're not yet familiar with MCP, read an [introduction to MCP](https://modelcontextprotocol.io/introduction). You can find simple server instructions from your preferred tools and libraries. Here are some resources:

- [Cloudflare](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [Azure Functions](https://devblogs.microsoft.com/dotnet/build-mcp-remote-servers-with-azure-functions/)
- [Stainless](https://www.stainless.com/blog/generate-mcp-servers-from-openapi-specs)


### Setup a basic remote server

As a starting place, use our deep research MCP server [sample app on GitHub](https://github.com/kwhinnery-openai/sample-deep-research-mcp). This minimal example demonstrates creating and running a remote MCP server for searching and fetching cupcake orders.

1. Clone [the repo](https://github.com/kwhinnery-openai/sample-deep-research-mcp) or copy the files into an existing repo.
2. Set up the server. In Python, you can run the following commands:
	```shell

	python -m venv env
	source env/bin/activate
	pip install -r requirements.txt
	```
3. Run the server. It'll start on `http://127.0.0.1:8000` using SSE transport.
	```shell
	python sample_mcp.py
	```
4. Update the sample files with any customization you need:
- `sample_mcp.py` is the main server code
- `records.json` is the cupcake order data (must be present in the same directory)

MCP servers can have a number of tools. Currently, connecting to MCP servers in ChatGPT is limited to enabling users to perform deep research. This means your MCP remote server should resemble a search engine, with tools for search and document retrieval.


#### Set up search

Define a search tool. In our simple cupcake order example, the code looks like this:

```python

def create_server():
    mcp = FastMCP(name="Cupcake MCP", instructions="Search cupcake orders")

    @mcp.tool()
    async def search(query: str):
        """
        Search for cupcake orders – keyword match.
        """
        toks = query.lower().split()
        ids = []
        for r in RECORDS:
            hay = " ".join(
                [
                    r.get("title", ""),
                    r.get("text", ""),
                    " ".join(r.get("metadata", {}).values()),
                ]
            ).lower()
            if any(t in hay for t in toks):
                ids.append(r["id"])
        return {"ids": ids}
```

#### Search semantics

The search semantics for defining this tool and exposing it through an MCP server are slightly different from what you may be used to. Here's our full specification:

```json

{
  "tools": [
    {
      "name": "search",
      "description": "Searches for resources using the provided query string and returns matching results.",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {"type": "string", "description": "Search query."}
        },
        "required": ["query"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {"type": "string", "description": "ID of the resource."},
                "title": {"type": "string", "description": "Title or headline of the resource."},
                "text": {"type": "string", "description": "Text snippet or summary from the resource."},
                "url": {"type": ["string", "null"], "description": "URL of the resource. Optional but needed for citations to work."},
              },
              "required": ["id", "title", "text"]
            }
          }
        },
        "required": ["results"]
      }
    }
  ]
}
```


#### Teach the model how to form valid queries

In the specification above, the `description` field is important. This is where you describe to the deep research model *how* to use this tool to construct a valid search query.

For example, you may want your remote MCP server to support complex query syntax from users, all expressed in one single query string, like this:

```
type:deals amount:gt:1000
```

To enable this kind of query syntax, your `description` field must teach the model how to form a valid query out of this user input. OpenAI relies on the description to prompt our deep research model to form a query string to call this search tool.

Use it to build expressive queries. As a real example, here's search tool description from HubSpot.

```json
Purpose:\\n  1. Search for resources in the HubSpot CRM of a specific object type (only contacts, deals, companies, tickets are supported).\\n  2. Note that only a subset of the properties will be returned.\\n  3. For the complete set of properties, use the Fetch tool.\\n\\nUsage:\\n  1. List a few objects to understand the data model of a specific object type.\\n  2. Search for objects of a specific object type using filters.\\n  3. Make sure to use the offset from the prior search result to call the tool again to paginate through the entire list.\\n  4. Search for associated objects.\\n\\nSearch Tool Response:\\n  1. The Search Tools response contains an idfor each attribute. Note that thisidis not the same as thehs_object_idof the object.\\n  2. Theidcan ONLY be used to fetch the object metadata using the Fetch tool. Use thehs_object_id when creating search queries involving specific objects.\\n', is_consequential=True, params={'type': 'object', 'properties': {'query': {'type': 'string', 'description': 'HubSpot Search Query DSL specification.\\n\\n • Tokens separated by spaces\\n • Each token: key[:op]:value\\n   – key ∈ { object_type, q|query, any HubSpot CRM property name, associated_{object_type} , limit, offset, sort }\\n   – op (optional; default “eq”) ∈ { eq, neq, gt, gte, lt, lte, in, not_in, contains_token, not_contains_token, has_property, not_has_property }\\n   – value:\\n     • unquoted (alphanumeric, no spaces)\\n     • or quoted in single/double quotes (to include spaces)\\n     • for in/not_in: comma-separated list (no spaces)\\n • Semantics:\\n   – object_type (mandatory) → which object to search (only contacts, deals, companies & tickets supported)\\n   – q/query → free-text search on a few key fields unique for each object type.\\n   – propertyName[:op]:value → filters, all AND’d in one group\\n   – associated_{object_type}:id → search for objects associated with the specified object type (e.g. associated_contacts:<hs_object_id of contact>).\\n      You can also use the associated_{object_type} key with in, not_in, eq and neq operators. For example, associated_contacts:in:123,456. No other format is supported.\\n   – limit, offset → integers. offset can help paginate through results, and will be returned in the search API response if more items exist.\\n   – sort:property[:asc|:desc] (default asc)\\n\\n • Searching for associated objects to a given object requires knowing its hs_object_id. If the given object\\'s hs_object_id is not known,\\n   then search must be done in two steps:\\n     1. Search for the given object to get its hs_object_id (e.g. for contact, use a query like: object_type:contacts email:someone@example.com )\\n     2. Search for the associated objects using that hs_object_id ( e.g. for the contact with hs_object_id 123, use the filter: associated_contacts:123 )\\n\\n • The q/query attribute searches across a few key fields unique for each object type:\\n  – Contacts: firstname, lastname, email, phone, company, hs_additional_emails, fax\\n  – Companies: name, website, domain, phone\\n  – Deals: dealname, pipeline, dealstage, description, dealtype\\n  – Tickets: subject, content, hs_pipeline_stage, hs_ticket_category, hs_ticket_id\\n\\n EXAMPLES:\\n\\n user: show me my deals\\n query: object_type:deals\\n\\n user: show me all contacts containing \\'John Doe\\'\\n query: object_type:contacts q:\\'John Doe\\'\\n\\n user: Show me the 5 most recently modified contacts.\\n query: object_type:contacts limit:5 offset:0 sort:lastmodifieddate:desc\\n\\n user: Find contacts whose email contains “@example.com”, sorted by the last contacted date.\\n query: object_type:contacts email:contains_token:\"@example.com\" limit:20 offset:0 sort:lastcontacted:desc\\n\\n user: List marketing qualified and sales qualified leads in the U.S.\\n query: object_type:contacts lifecyclestage:in:marketingqualifiedlead,salesqualifiedlead country:US\\n\\n user: Retrieve deals for owner 12345 in Q1 2025 but exclude “Closed Lost”.\\n query: object_type:deals hubspot_owner_id:12345 dealstage:not_in:closedlost closedate:gte:2025-01-01 closedate:lte:2025-03-31 limit:100 offset:0 sort:closedate:asc\\n\\n user: Find tech companies with annual revenue between $1,000,000 and $10,000,000.\\n query: object_type:companies industry:Technology annualrevenue:gte:1000000 annualrevenue:lte:10000000 limit:100 offset:0 sort:annualrevenue:desc\\n\\n user: List contacts that have a phone number defined but no website.\\n query: object_type:contacts phone:has_property website:not_has_property limit:100 offset:0 sort:createdate:asc\\n\\n user: Find companies whose description does not contain “startup”\\n query: object_type:companies description:not_contains_token:\"startup\"\\n\\n user: Find tickets mentioning \\'refund\\'\\n query: object_type:tickets q:\\'refund\\'\\n\\n user: Find all contacts associated with company hs_object_id 12345.\\n query: object_type:contacts associated_companies:12345 limit:100 offset:0 sort:createdate:desc\\n\\n user: Show me deals not associated with contact hs_object_id 54321.\\n query: object_type:deals associated_contacts:neq:54321 limit:100 offset:0 sort:amount:desc\\n\\n user: Find contacts associated with deals with hs_object_ids in 24680,24681 who are in California.\\n query: object_type:contacts associated_deals:in:24680,24681 state:CA limit:100 offset:0\\n\\n Unsupported features:\\n   • Boolean logic: NO OR, NOT, AND keywords or parenthesis grouping\\n   • Relative dates: NO “now–7d”, “today”, “last week” syntax\\n   • Aggregations / metrics: NO count, sum, facet, group‐by\\n   • Fuzzy or proximity: NO “~2” fuzzy match operators\\n   • Nested expressions or sub-queries\\n   • Custom functions or scripts\\n   • Escaping beyond simple single/double quotes\\n   • No support for searching for objects without associations directly. You must list all objects and see if they have associations from contacts, companies, or deals.'}}, 'required': ['query'], 'additionalProperties': False}, return_type={'$defs': {'Annotations': {'additionalProperties': True, 'properties': {'audience': {'anyOf': [{'items': {'enum': ['user', 'assistant'], 'type': 'string'}, 'type': 'array'}, {'type': 'null'}], 'default': None, 'title': 'Audience'}, 'priority': {'anyOf': [{'maximum': 1.0, 'minimum': 0.0, 'type': 'number'}, {'type': 'null'}], 'default': None, 'title': 'Priority'}}, 'title': 'Annotations', 'type': 'object'}, 'BlobResourceContents': {'additionalProperties': True, 'description': 'Binary contents of a resource.', 'properties': {'uri': {'format': 'uri', 'minLength': 1, 'title': 'Uri', 'type': 'string'}, 'mimeType': {'anyOf': [{'type': 'string'}, {'type': 'null'}], 'default': None, 'title': 'Mimetype'}, 'blob': {'title': 'Blob', 'type': 'string'}}, 'required': ['uri', 'blob'], 'title': 'BlobResourceContents', 'type': 'object'}, 'EmbeddedResource': {'additionalProperties': True, 'description': 'The contents of a resource, embedded into a prompt or tool call result.\\n\\nIt is up to the client how best to render embedded resources for the benefit\\nof the LLM and/or the user.', 'properties': {'type': {'const': 'resource', 'title': 'Type', 'type': 'string'}, 'resource': {'anyOf': [{'$ref': '#/$defs/TextResourceContents'}, {'$ref': '#/$defs/BlobResourceContents'}], 'title': 'Resource'}, 'annotations': {'anyOf': [{'$ref': '#/$defs/Annotations'}, {'type': 'null'}], 'default': None}}, 'required': ['type', 'resource'], 'title': 'EmbeddedResource', 'type': 'object'}, 'ImageContent': {'additionalProperties': True, 'description': 'Image content for a message.', 'properties': {'type': {'const': 'image', 'title': 'Type', 'type': 'string'}, 'data': {'title': 'Data', 'type': 'string'}, 'mimeType': {'title': 'Mimetype', 'type': 'string'}, 'annotations': {'anyOf': [{'$ref': '#/$defs/Annotations'}, {'type': 'null'}], 'default': None}}, 'required': ['type', 'data', 'mimeType'], 'title': 'ImageContent', 'type': 'object'}, 'TextContent': {'additionalProperties': True, 'description': 'Text content for a message.', 'properties': {'type': {'const': 'text', 'title': 'Type', 'type': 'string'}, 'text': {'title': 'Text', 'type': 'string'}, 'annotations': {'anyOf': [{'$ref': '#/$defs/Annotations'}, {'type': 'null'}], 'default': None}}, 'required': ['type', 'text'], 'title': 'TextContent', 'type': 'object'}, 'TextResourceContents': {'additionalProperties': True, 'description': 'Text contents of a resource.', 'properties': {'uri': {'format': 'uri', 'minLength': 1, 'title': 'Uri', 'type': 'string'}, 'mimeType': {'anyOf': [{'type': 'string'}, {'type': 'null'}], 'default': None, 'title': 'Mimetype'}, 'text': {'title': 'Text', 'type': 'string'}}, 'required': ['uri', 'text'], 'title': 'TextResourceContents', 'type': 'object'}}, 'additionalProperties': True, 'description': \"The server's response to a tool call.\", 'properties': {'_meta': {'anyOf': [{'additionalProperties': True, 'type': 'object'}, {'type': 'null'}], 'default': None, 'title': 'Meta'}, 'content': {'items': {'anyOf': [{'$ref': '#/$defs/TextContent'}, {'$ref': '#/$defs/ImageContent'}, {'$ref': '#/$defs/EmbeddedResource'}]}, 'title': 'Content', 'type': 'array'}, 'isError': {'default': False, 'title': 'Iserror', 'type': 'boolean'}}, 'required': ['content'], 'title': 'CallToolResult', 'type': 'object'}
```


#### Setup document retreival

The document retrieval tool helps enable citations. In our cupcake order example, the code for document retrieval looks like this:

```python

@mcp.tool()
async def fetch(id: str):
    """
    Fetch a cupcake order by ID.
    """
    if id not in LOOKUP:
        raise ValueError("unknown id")
    return LOOKUP[id]

return mcp
```

Here's our full specification:

```json

{
  "tools": [
    {
      "name": "fetch",
      "description": "Retrieves detailed content for a specific resource identified by the given ID.",
      "input_schema": {
        "type": "object",
        "properties": {
          "id": {"type": "string", "description": "ID of the resource to fetch."}
        },
        "required": ["id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "id": {"type": "string", "description": "ID of the resource."},
          "title": {"type": "string", "description": "Title or headline of the fetched resource."},
          "text": {"type": "string", "description": "Complete textual content of the resource."},
          "url": {"type": ["string", "null"], "description": "URL of the resource. Optional but needed for citations to work."},
          "metadata": {
            "type": ["object", "null"],
            "additionalProperties": {"type": "string"},
            "description": "Optional metadata providing additional context."
          }
        },
        "required": ["id", "title", "text"]
      }
    }
  ]
}
```

### Handle authentication

As someone building a custom remote MCP server, authorization and authentication help you protect your data. We recommend using OAuth and . To learn more about the protocol's authentication, read the or see the .

After connecting your custom remote MCP server in ChatGPT, users in your workspace will get an OAuth flow to your application.


### Transport and tunneling

Your remote MCP server must be internet addressable, so if the server is hosted in your intranet, you need some form of tunneling. [ngrok](https://ngrok.com/) is one convenient tool to do this, but there are other tunneling solutions—e.g., from Cloudflare.


### Testing and debugging

To test your MCP server, use the API [Playground](https://platform.openai.com/playground) to make sure the server is reachable and that the tool list resolves as expected. You can use Playground to spot-check the server's ability to return results before running deep research on it—which is slower to iteratively refine (e.g., while refining your search tool description).

For best results, we recommend testing with OpenAI o3 or o3 mini in the Playground.


## Connect your remote MCP server

1. Import your remote MCP servers directly in [ChatGPT settings](https://chatgpt.com/#settings).
2. Connect your server in the **Connectors** tab. It should now be visible in the composer > deep research tool. You may have to add the server as a source.
3. Test your server by running some prompts.


## Risks and safety

Custom MCP servers enable you to connect your ChatGPT workspace to external applications, which allows ChatGPT to access, send and receive data, and take action in these applications. Please note that custom MCP servers are not developed or verified by OpenAI, and are third-party services that are subject to their own terms and conditions.

If you come ac

#### Connect to trusted servers

Be careful with which custom MCP servers you add to your ChatGPT workspace. Currently, we only support deep research with custom MCP servers in ChatGPT, meaning the only tools intended to be available within the remote MCP servers are **search** and **document retrieval**. However, risks still apply even with this narrow scope.

We recommend that you do not connect to a custom MCP server unless you know and trust the underlying application. For example, pick official servers hosted by the service providers themselves (e.g., we recommend connecting to the Stripe server hosted by Stripe themselves on mcp.stripe.com, instead of a custom Stripe MCP server hosted by a third party). Because there aren't many official remote MCP servers today, you may be tempted to use a MCP server hosted by an organization that doesn't operate that server and simply proxies requests to that service via an API. If you do this, be extra careful in doing your due diligence on these unofficial MCP servers, and only connect once you’ve carefully reviewed how they use your data and have verified that you can trust the server. When building and connecting to your own MCP server, double check that it's the correct server.

Malicious MCP servers may include hidden instructions (prompt injections) designed to make ChatGPT behave unexpectedly. While OpenAI has implemented built-in safeguards to help detect and block these threats, it's essential to carefully review and ensure connections are established only with trusted servers.

When connecting to MCP servers that define their own tool definitions, your organization may get requests for data that you do not want or intend to share with the host of that MCP server. Before connecting to any MCP server, review the type of data being shared carefully and robustly.

MCP servers may update tool behavior unexpectedly, potentially leading to unintended or malicious behavior.

### Building servers

Be careful with the data you allow access to. Your remote MCP server permits others to connect OpenAI to your services and allows OpenAI to access, send and receive data, and take action in these services. Avoid putting any sensitive information in the JSON for your tools, and avoid storing any sensitive information from ChatGPT users accessing your remote MCP server.

As someone building an MCP server, don't put anything malicious in your tool definitions. At this time, we only support search and document retrieval.

Large enterprises may want to deploy an MCP server to allow others to use their company knowledge with deep research in ChatGPT. To deploy an MCP server, work with your admin.