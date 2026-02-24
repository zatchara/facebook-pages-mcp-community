/**
 * Shared MCP Server — used by both Node.js (index.ts) and CF Worker (worker.ts)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FacebookClient } from './client.js';
import { TOOLS } from './tools.js';

export interface FacebookMcpConfig {
  pageAccessToken: string;
  pageId?: string;
}

export function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  client: FacebookClient
) {
  switch (toolName) {
    // ========== Pages ==========
    case 'fb_list_pages':
      return client.listPages();
    case 'fb_get_page':
      return client.getPage(args.page_id as string, args.fields as string | undefined);
    case 'fb_get_page_token':
      return client.getPageToken(args.page_id as string);

    // ========== Posts ==========
    case 'fb_list_posts':
      return client.listPosts(args.page_id as string, args.limit as number | undefined, args.fields as string | undefined);
    case 'fb_get_post':
      return client.getPost(args.post_id as string, args.fields as string | undefined);
    case 'fb_create_post':
      return client.createPost(args.page_id as string, args.message as string | undefined, args.link as string | undefined, args.published as boolean | undefined);
    case 'fb_update_post':
      return client.updatePost(args.post_id as string, args.message as string);
    case 'fb_delete_post':
      return client.deletePost(args.post_id as string);
    case 'fb_schedule_post':
      return client.schedulePost(args.page_id as string, args.message as string, args.scheduled_time as number, args.link as string | undefined);

    // ========== Comments ==========
    case 'fb_list_comments':
      return client.listComments(args.object_id as string, args.limit as number | undefined);
    case 'fb_create_comment':
      return client.createComment(args.object_id as string, args.message as string);
    case 'fb_reply_comment':
      return client.replyComment(args.comment_id as string, args.message as string);
    case 'fb_delete_comment':
      return client.deleteComment(args.comment_id as string);
    case 'fb_hide_comment':
      return client.hideComment(args.comment_id as string, args.is_hidden as boolean);

    // ========== Photos ==========
    case 'fb_upload_photo':
      return client.uploadPhoto(args.page_id as string, args.url as string, args.caption as string | undefined, args.published as boolean | undefined);
    case 'fb_list_photos':
      return client.listPhotos(args.page_id as string, args.limit as number | undefined);
    case 'fb_delete_photo':
      return client.deletePhoto(args.photo_id as string);

    // ========== Videos ==========
    case 'fb_upload_video':
      return client.uploadVideo(args.page_id as string, args.file_url as string, args.title as string | undefined, args.description as string | undefined);
    case 'fb_list_videos':
      return client.listVideos(args.page_id as string, args.limit as number | undefined);
    case 'fb_delete_video':
      return client.deleteVideo(args.video_id as string);

    // ========== Insights ==========
    case 'fb_get_page_insights':
      return client.getPageInsights(args.page_id as string, args.metric as string, args.period as string | undefined, args.since as string | undefined, args.until as string | undefined);
    case 'fb_get_post_insights':
      return client.getPostInsights(args.post_id as string, args.metric as string);
    case 'fb_get_page_fans':
      return client.getPageFans(args.page_id as string);
    case 'fb_get_page_views':
      return client.getPageViews(args.page_id as string, args.period as string | undefined);

    // ========== Conversations ==========
    case 'fb_list_conversations':
      return client.listConversations(args.page_id as string, args.limit as number | undefined);
    case 'fb_get_messages':
      return client.getMessages(args.conversation_id as string, args.limit as number | undefined);
    case 'fb_send_message':
      return client.sendMessage(args.page_id as string, args.recipient_id as string, args.text as string);
    case 'fb_send_typing':
      return client.sendTyping(args.page_id as string, args.recipient_id as string, args.action as string | undefined);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export function createServer(config?: FacebookMcpConfig) {
  const server = new McpServer({
    name: 'facebook-pages-mcp',
    version: '1.0.0',
  });

  let client: FacebookClient | null = null;

  // Register all 28 tools with annotations
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        annotations: tool.annotations,
      },
      async (args: Record<string, unknown>) => {
        const pageAccessToken =
          config?.pageAccessToken ||
          (args as Record<string, unknown>).FACEBOOK_PAGE_ACCESS_TOKEN as string;

        if (!pageAccessToken) {
          return {
            content: [{ type: 'text' as const, text: 'Error: FACEBOOK_PAGE_ACCESS_TOKEN is required' }],
            isError: true,
          };
        }

        if (!client || config?.pageAccessToken !== pageAccessToken) {
          client = new FacebookClient({ pageAccessToken, pageId: config?.pageId });
        }

        try {
          const result = await handleToolCall(tool.name, args, client);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            isError: false,
          };
        } catch (error) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          };
        }
      }
    );
  }

  // Register prompts
  server.prompt(
    'manage-page',
    'Guide for managing Facebook Page content: posts, photos, videos, and comments',
    async () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            'You are a Facebook Page management assistant.',
            '',
            'Available actions:',
            '1. **List pages** — Use fb_list_pages to find your pages',
            '2. **Create post** — Use fb_create_post with page_id and message/link',
            '3. **Schedule post** — Use fb_schedule_post with Unix timestamp',
            '4. **Upload photo** — Use fb_upload_photo with page_id and image URL',
            '5. **Upload video** — Use fb_upload_video with page_id and video URL',
            '6. **Manage comments** — Use fb_list_comments, fb_create_comment, fb_reply_comment',
            '7. **Moderate** — Use fb_hide_comment or fb_delete_comment',
            '',
            'Start by listing your pages with fb_list_pages.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.prompt(
    'page-analytics',
    'Guide for viewing Facebook Page insights and analytics',
    async () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            'You are a Facebook analytics assistant.',
            '',
            'Available metrics:',
            '1. **Page insights** — fb_get_page_insights with metrics like page_impressions, page_engaged_users',
            '2. **Post insights** — fb_get_post_insights with metrics like post_impressions, post_clicks',
            '3. **Fan count** — fb_get_page_fans for follower trends',
            '4. **Page views** — fb_get_page_views for profile view counts',
            '',
            'Common page metrics: page_impressions, page_engaged_users, page_post_engagements, page_fan_adds',
            'Common post metrics: post_impressions, post_engaged_users, post_clicks, post_reactions_by_type_total',
            '',
            'Period options: "day", "week", "days_28". Max 90 days range.',
          ].join('\n'),
        },
      }],
    }),
  );

  // Register resource
  server.resource(
    'server-info',
    'facebook://server-info',
    {
      description: 'Connection status and available tools for this Facebook Pages MCP server',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [{
        uri: 'facebook://server-info',
        mimeType: 'application/json',
        text: JSON.stringify({
          name: 'facebook-pages-mcp',
          version: '1.0.0',
          connected: !!config,
          tools_available: TOOLS.length,
          tool_categories: {
            pages: 3,
            posts: 6,
            comments: 5,
            photos: 3,
            videos: 3,
            insights: 4,
            conversations: 4,
          },
        }, null, 2),
      }],
    }),
  );

  // Override tools/list handler to return raw JSON Schema with property descriptions
  (server as any).server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  }));

  return server;
}
