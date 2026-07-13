import fetch from 'node-fetch';
import { GRAPH_API_VERSION } from './admin';
import { DmFlowButton } from './types';

const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class GraphApiError extends Error {
  constructor(
    message: string,
    public code: string | number | undefined,
    public raw: unknown
  ) {
    super(message);
  }
}

async function graphRequest<T>(
  path: string,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };

  if (method === 'GET') {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  } else {
    url.searchParams.set('access_token', params.access_token);
    init.headers = { 'Content-Type': 'application/json' };
    const { access_token: _unused, ...body } = params;
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), init);
  const json = (await response.json()) as any;
  if (!response.ok || json.error) {
    throw new GraphApiError(json.error?.message ?? 'Graph API error', json.error?.code, json);
  }
  return json as T;
}

// ---- OAuth ----

export async function exchangeCodeForToken(params: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}) {
  return graphRequest<{ access_token: string; token_type: string; expires_in: number }>(
    '/oauth/access_token',
    {
      client_id: params.appId,
      client_secret: params.appSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
    }
  );
}

export async function exchangeForLongLivedToken(params: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
}) {
  return graphRequest<{ access_token: string; expires_in: number }>('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: params.appId,
    client_secret: params.appSecret,
    fb_exchange_token: params.shortLivedToken,
  });
}

export async function refreshLongLivedToken(accessToken: string) {
  return graphRequest<{ access_token: string; expires_in: number }>(
    '/refresh_access_token',
    { grant_type: 'ig_refresh_token', access_token: accessToken }
  );
}

// ---- Account linking ----

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}
export async function listManagedPages(userAccessToken: string) {
  const result = await graphRequest<{ data: FacebookPage[] }>('/me/accounts', {
    access_token: userAccessToken,
    fields: 'id,name,access_token',
  });
  return result.data;
}

export async function getInstagramBusinessAccountId(pageId: string, pageAccessToken: string) {
  const result = await graphRequest<{ instagram_business_account?: { id: string } }>(
    `/${pageId}`,
    { access_token: pageAccessToken, fields: 'instagram_business_account' }
  );
  return result.instagram_business_account?.id ?? null;
}

export async function getInstagramUsername(igUserId: string, accessToken: string) {
  const result = await graphRequest<{ username: string }>(`/${igUserId}`, {
    access_token: accessToken,
    fields: 'username',
  });
  return result.username;
}

// Registers the Page for the webhook fields the product depends on: new
// comments, incoming DMs, and button (postback) clicks.
export async function subscribePageWebhooks(pageId: string, pageAccessToken: string) {
  await graphRequest(
    `/${pageId}/subscribed_apps`,
    {
      access_token: pageAccessToken,
      subscribed_fields: 'comments,messages,messaging_postbacks',
    },
    'POST'
  );
}

// ---- Media ----

export interface InstagramMedia {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  permalink: string;
}
export async function listInstagramMedia(igUserId: string, accessToken: string) {
  const result = await graphRequest<{ data: InstagramMedia[] }>(`/${igUserId}/media`, {
    access_token: accessToken,
    fields: 'id,caption,thumbnail_url,media_url,permalink',
    limit: '30',
  });
  return result.data;
}

// ---- Comments ----

export async function postCommentReply(commentId: string, message: string, accessToken: string) {
  return graphRequest(`/${commentId}/replies`, { access_token: accessToken, message }, 'POST');
}

// ---- Messaging (private replies / DM with buttons) ----

function toGraphButtons(buttons: DmFlowButton[]) {
  // Instagram's button template supports at most 3 buttons; url buttons open
  // a link client-side, postback buttons round-trip through our webhook.
  return buttons.slice(0, 3).map((button) => {
    if (button.action === 'url') {
      return { type: 'web_url', url: button.url ?? '', title: button.label };
    }
    return { type: 'postback', title: button.label, payload: button.id };
  });
}

interface SendMessageParams {
  igUserId: string;
  accessToken: string;
  recipientCommentId?: string; // first message in reply to a comment (7-day window)
  recipientUserId?: string; // subsequent messages in an existing thread
  text: string;
  buttons?: DmFlowButton[];
  mediaUrl?: string | null;
}

export async function sendDirectMessage(params: SendMessageParams) {
  const recipient = params.recipientCommentId
    ? { comment_id: params.recipientCommentId }
    : { id: params.recipientUserId };

  const hasButtons = params.buttons && params.buttons.length > 0;
  const message = hasButtons
    ? {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: params.text,
            buttons: toGraphButtons(params.buttons!),
          },
        },
      }
    : { text: params.text };

  await graphRequest(
    `/${params.igUserId}/messages`,
    { access_token: params.accessToken, recipient: recipient as any, message: message as any },
    'POST'
  );

  if (params.mediaUrl) {
    await graphRequest(
      `/${params.igUserId}/messages`,
      {
        access_token: params.accessToken,
        recipient: recipient as any,
        message: { attachment: { type: 'image', payload: { url: params.mediaUrl } } } as any,
      },
      'POST'
    );
  }
}
