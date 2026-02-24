# @node2flow/facebook-pages-mcp

[![npm version](https://img.shields.io/npm/v/@node2flow/facebook-pages-mcp)](https://www.npmjs.com/package/@node2flow/facebook-pages-mcp)
[![Smithery](https://smithery.ai/badge/@node2flow/facebook-pages-mcp)](https://smithery.ai/server/node2flow/facebook-pages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for Facebook Pages API — manage posts, comments, photos, videos, insights, and Messenger conversations through 28 tools.

## Quick Start

### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "facebook-pages": {
      "command": "npx",
      "args": ["-y", "@node2flow/facebook-pages-mcp"],
      "env": {
        "FACEBOOK_PAGE_ACCESS_TOKEN": "your_page_access_token"
      }
    }
  }
}
```

### Streamable HTTP (for n8n, custom clients)

```bash
FACEBOOK_PAGE_ACCESS_TOKEN=xxx npx @node2flow/facebook-pages-mcp --http
# Server starts on http://localhost:3000/mcp
```

### Docker

```bash
docker compose up -d
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Yes | Page Access Token (long-lived or never-expiring) |
| `FACEBOOK_PAGE_ID` | No | Page ID (auto-detected from token if not set) |

### Getting a Page Access Token

1. Go to [Meta for Developers](https://developers.facebook.com/tools/explorer/)
2. Select your app, then select **Get Page Access Token**
3. Grant the required permissions (see below)
4. Exchange for a **long-lived token** (60 days) or **never-expiring page token**

### Required Permissions

- `pages_show_list` — List managed pages
- `pages_read_engagement` — Read likes, comments, shares
- `pages_manage_posts` — Create, edit, delete posts
- `pages_manage_engagement` — Manage comments
- `read_insights` — Access analytics
- `pages_messaging` — Send/receive Messenger messages

## 28 Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Pages** (3) | `fb_list_pages`, `fb_get_page`, `fb_get_page_token` | List managed pages, get info, get access tokens |
| **Posts** (6) | `fb_list_posts`, `fb_get_post`, `fb_create_post`, `fb_update_post`, `fb_delete_post`, `fb_schedule_post` | Full CRUD + scheduling |
| **Comments** (5) | `fb_list_comments`, `fb_create_comment`, `fb_reply_comment`, `fb_delete_comment`, `fb_hide_comment` | Comment management + moderation |
| **Photos** (3) | `fb_upload_photo`, `fb_list_photos`, `fb_delete_photo` | Upload from URL, list, delete |
| **Videos** (3) | `fb_upload_video`, `fb_list_videos`, `fb_delete_video` | Upload from URL, list, delete |
| **Insights** (4) | `fb_get_page_insights`, `fb_get_post_insights`, `fb_get_page_fans`, `fb_get_page_views` | Page and post analytics |
| **Conversations** (4) | `fb_list_conversations`, `fb_get_messages`, `fb_send_message`, `fb_send_typing` | Messenger integration |

## Prompts

| Prompt | Description |
|--------|-------------|
| `manage-page` | Guide for managing page content: posts, photos, videos, comments |
| `page-analytics` | Guide for viewing page insights and analytics |

## License & Links

- **License**: [MIT](./LICENSE)
- **npm**: [@node2flow/facebook-pages-mcp](https://www.npmjs.com/package/@node2flow/facebook-pages-mcp)
- **GitHub**: [node2flow-th/facebook-pages-mcp-community](https://github.com/node2flow-th/facebook-pages-mcp-community)
- **Smithery**: [node2flow/facebook-pages](https://smithery.ai/server/node2flow/facebook-pages)

## Maintenance Notes (Patchara Fork)

Use this section as source of truth for our fork maintenance.

### Token Type Rules

- `fb_list_posts` and most page operations require a **Page access token**.
- A **User token** can list pages via `GET /me/accounts` but cannot read page feed directly for New Pages Experience.
- Quick check:
  - User token: `GET /me/accounts` works.
  - Page token: `GET /{page_id}/feed` works.

### What We Fixed Locally

- Fixed MCP crash (`v3Schema.safeParseAsync is not a function`) by removing raw JSON `inputSchema` pass-through in `registerTool`.
- Added robust callback argument handling so tool args are read whether MCP SDK passes `(args, extra)` or only `(extra)`.
- Added `FACEBOOK_PAGE_ID` fallback so tools can still work when `page_id` is missing in runtime args.
- Added `fb_list_pages` fallback for page-token mode:
  - If `me/accounts` is unavailable, server falls back to `GET /me` and returns single-page result.

### Recommended Config

Set both values in MCP env:

- `FACEBOOK_PAGE_ACCESS_TOKEN` = page token for target page
- `FACEBOOK_PAGE_ID` = target page id

### Quick Smoke Test

After restart:

1. `fb_list_pages`
2. `fb_list_posts` with `page_id` and `limit`

If both return data, core path is healthy.
