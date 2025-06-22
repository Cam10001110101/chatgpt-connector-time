## Connectors in ChatGPT

Bring your tools and data into ChatGPT so you can search, reference, and work faster—all without leaving the conversation.

## Overview

Make ChatGPT more actionable and personalized with your own data sources or company knowledge, now available on demand. Connectors let ChatGPT securely connect to third‑party applications—like Google Drive, GitHub, or SharePoint—so you can search files, pull live data, and reference content right in the chat.

Depending on your plan and role, you can:

- **Search** connected apps in a chat to help with everyday tasks, previewing results inside ChatGPT.
- **Run deep research** for complex projects that require deep analysis across multiple sources at once, with citations back to the originals.
- **Sync** and index select knowledge sources in advance, to speed up and help improve ChatGPT’s answers.

---

When you enable a connector, ChatGPT can send and retrieve information from the connected app in order to find information relevant to your prompts and use them in its responses. For example, if the GitHub connector is enabled and you ask, “Can you show me where I handled file uploads in the backend?”, then ChatGPT might send a query to GitHub like “file upload handler backend.” If needed, it may send a few different queries to find the most relevant information.

If you have “Memory” enabled, when ChatGPT sends a query to connected apps, it may also leverage relevant information from memories to make the query better and more useful. For example, if the user has “Memory” turned on and their memories mention working in a repo called acme-uploader, and they ask “Can you show me where I handled file uploads in the backend?”, ChatGPT might include “acme-uploader” in the query. You can learn more [here](https://help.openai.com/en/articles/8590148-memory-faq) about Memory, including how to disable it or control individual memories.

---

When you enable a connection, ChatGPT will use information in the connected application as context to help ChatGPT provide you with responses. If you have [Memory enabled](https://help.openai.com/en/articles/8590148-memory-faq) in your settings, ChatGPT may remember relevant information accessed from connectors. ChatGPT can also use relevant information accessed from Connectors to inform search queries when ChatGPT [searches the web](https://help.openai.com/en/articles/9237897-chatgpt-search) to provide a response.

---

For ChatGPT Team, Enterprise, and Edu customers, we do not use information accessed from connectors to train our modes. Please see our [Enterprise Privacy page](https://openai.com/enterprise-privacy/) for information on how we use business data.

For ChatGPT Free, Plus, and Pro users, we may use information accessed from connectors to train our models if your “Improve the model for everyone” setting is on. You can read more about how your data is stored and used in [this article](https://help.openai.com/en/articles/7730893-data-controls-faq) in our help center.

---

Quick, one‑off searches that are great for everyday tasks like back-and-forth iteration, synthesizing content across sources, and quickly finding the files or context you need. Ask questions like “Show me Q2 goals in Drive” or “Find last week’s roadmap in Box.” Results appear inline with links to open the original file.

For more complex tasks, run deep research queries across many sources—perfect for competitive analysis, incident retros, or code reviews. Deep research can use connectors to read, reason over, and cite internal sources, alongside the web, to produce fully cited reports.

- *“Summarize everything we shipped in the last two sprints across PR descriptions, design docs, and spec files.”*
- *“Compare our feature adoption numbers with industry benchmarks mentioned in analyst reports.”*
- *“Find the root cause of the outage referenced in yesterday’s post‑mortem and list the follow‑up actions.”*

Sync and index selected content from your connected sources in advance, so you have up‑to‑date information on-demand in your workspace’s knowledge base. This enables ChatGPT to answer questions even faster and can improve the quality of responses, without re‑querying each source.

For additional information on Synced connectors, please refer to our help article here: [Synced Connectors FAQ](https://help.openai.com/en/articles/10847137)

Custom connectors are also available for (a) ChatGPT Pro users and (b) ChatGPT Team, Enterprise, and Edu workspaces. With this feature, you can add **custom connectors** that follow the Model Context Protocol (MCP) to connect to custom third-party apps and your internal sources.

***Note:*** *In Team, Enterprise, and Edu workspaces, only workspace **owners** and **admins** have permission to add custom connectors. Users with a regular **member** role do **not** have the ability to add custom connectors themselves.*

*Once a connector is added and enabled by an owner or admin user, it becomes available for all members of the workspace to use.*

*As with other connectors, end users must authenticate with each connector themselves before first use.*

Please note that custom connectors are not verified by OpenAI and are intended for developer use only. You should only add custom connectors to your workspace if you know and trust the underlying application. [Learn more](https://platform.openai.com/docs/mcp#risks-and-safety).

For additional information regarding how to setup a custom connector using MCP, please refer to our documentation here: [http://platform.openai.com/docs/mcp](http://platform.openai.com/docs/mcp)

---

Available globally.

| **Connector** | **ChatGPT search** | **Deep research** |
| --- | --- | --- |
| Box | ✔︎ | ✔︎ |
| Custom Connectors (MCP) | \- | ✔︎ |
| Dropbox | ✔︎ | ✔︎ |
| GitHub | \- | ✔︎ |
| Gmail | \- | ✔︎ |
| Google Calendar | \- | ✔︎ |
| Google Drive | \- | ✔︎ |
| Google Drive *synced connector* | ✔︎ | \- |
| Hubspot | \- | ✔︎ |
| Linear | \- | ✔︎ |
| Microsoft OneDrive | ✔︎ | ✔︎ |
| Microsoft Outlook Calendar | \- | ✔︎ |
| Microsoft Outlook Email | \- | ✔︎ |
| Microsoft SharePoint | ✔︎ | ✔︎ |
| Microsoft Teams | \- | ✔︎ |

| **Connector** | **Chat search** | **Deep research** |
| --- | --- | --- |
| Box\* | \- | ✔︎ |
| Custom Connectors (MCP)\*⁺ | \- | ✔︎ |
| Dropbox\* | \- | ✔︎ |
| GitHub | \- | ✔︎ |
| Gmail\* | \- | ✔︎ |
| Google Calendar\* | \- | ✔︎ |
| Google Drive\* | \- | ✔︎ |
| Google Drive *synced connector* \* | \- | \- |
| Hubspot\* | \- | ✔︎ |
| Linear\* | \- | ✔︎ |
| Microsoft OneDrive\* | \- | ✔︎ |
| Microsoft Outlook Calendar\* | \- | ✔︎ |
| Microsoft Outlook Email\* | \- | ✔︎ |
| Microsoft SharePoint\* | \- | ✔︎ |
| Microsoft Teams\* | \- | ✔︎ |

Footnotes

\* *Not currently available for users located in EEA, Switzerland, and the UK for Plus/Pro users*

*⁺ Not currently available for Plus plans.*

---

Select your profile icon in the top-right corner and click **Settings > Connectors > Connect** on the application.

[![](https://downloads.intercomcdn.com/i/o/dgkjq2bp/1581229203/0bd3f220eb394f7a8f6210ad872e/image.png?expires=1750595400&signature=86830e007f9daaa8d82e7f0fef939f3161c6612bf81377417123d911e838668b&req=dSUvF8t8lINfWvMW1HO4zTqR4t%2F2YVcOOjuAaBwnm65w%2BC6aIodMt1dudZFV%0Auao0gQ5uDKKMTbFckT0%3D%0A)](https://downloads.intercomcdn.com/i/o/dgkjq2bp/1581229203/0bd3f220eb394f7a8f6210ad872e/image.png?expires=1750595400&signature=86830e007f9daaa8d82e7f0fef939f3161c6612bf81377417123d911e838668b&req=dSUvF8t8lINfWvMW1HO4zTqR4t%2F2YVcOOjuAaBwnm65w%2BC6aIodMt1dudZFV%0Auao0gQ5uDKKMTbFckT0%3D%0A)

---

1. Open a new chat in ChatGPT.
2. Click **Tools**
3. Click **Search connectors** (for Chat Search) *or* **Run deep research**.
4. Select one or more sources.
5. Ask your question.
6. When reviewing ChatGPT’s response, click a citation to open it in the native connected app.

*Note: For synced connectors, ChatGPT automatically references indexed data when ChatGPT thinks that data can help answer your question, without requiring you to make an explicit source selection. Optionally, you can include or exclude a synced connector by telling ChatGPT in your prompt at any time.*

---

For additional information regarding available controls for admin users in Team, Enterprise, and Edu workspaces, as well as information regarding security and compliance, please refer to our article, here: [Admin controls, security, and compliance in connectors](https://help.openai.com/en/articles/11509118)

---

## FAQ

Workspace owners and admins manage availability in **Settings → Connectors**.

No. Connectors follow normal ChatGPT rate limits for your plan (external apps may impose their own caps).

Yes. You can remove a connector anytime from **Settings → Connectors**. Your connected third-party application may also have its own options for how to unlink a connector.

We’re actively working with additional providers and will post updates in our release notes.

Currently, connectors are able to retrieve text data from most common file types, including TXT, PDF, CSV, XLSX, PPTX, DOCX. The ability to analyze images, visual PDFs, etc. (multimodal support) is not currently available.

---

## Troubleshooting

This error can occur when attempting to connect ChatGPT to a custom connector using the managed connector platform (MCP) which doesn’t fully meet our technical requirements.

In most cases, this means the connector is missing a required tool (currently tools "search" and "fetch" are both required). To resolve this, the team that develops or maintains the desired connector will need to make changes to bring it into compatibility with the expected structure.

For more information regarding our specification and information about MCP, please refer to our documentation: [https://platform.openai.com/docs/mcp](https://platform.openai.com/docs/mcp)

Some users may experience an error message suggesting that ChatGPT is unauthorized to connect to their application. In these cases, you'll need to contact your Systems Administrator in order to allow ChatGPT access to the application.

In some situations, additional allowlisting (such as IP or Domain) may be required, even after granting ChatGPT permissions. We recommend to review our network recommendation guide for additional assistance: [Network recommendations for ChatGPT errors on web and apps](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps)
