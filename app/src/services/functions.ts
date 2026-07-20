import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp, FUNCTIONS_REGION } from './firebase';

const functions = getFunctions(firebaseApp, FUNCTIONS_REGION);

export interface ExchangeInstagramCodeRequest {
  authorizationCode: string;
  redirectUri: string;
}
export interface ExchangeInstagramCodeResponse {
  igAccountId: string;
  igUsername: string;
}
export const exchangeInstagramCode = httpsCallable<
  ExchangeInstagramCodeRequest,
  ExchangeInstagramCodeResponse
>(functions, 'exchangeInstagramCode');

export interface ConnectWhatsAppAccountRequest {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}
export interface ConnectWhatsAppAccountResponse {
  whatsAppAccountId: string;
  displayPhoneNumber: string;
}
export const connectWhatsAppAccount = httpsCallable<
  ConnectWhatsAppAccountRequest,
  ConnectWhatsAppAccountResponse
>(functions, 'connectWhatsAppAccount');

export interface ExchangeWhatsAppEmbeddedSignupCodeRequest {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}
export interface ExchangeWhatsAppEmbeddedSignupCodeResponse {
  whatsAppAccountId: string;
  displayPhoneNumber: string;
  webhookSubscribed: boolean;
}
export const exchangeWhatsAppEmbeddedSignupCode = httpsCallable<
  ExchangeWhatsAppEmbeddedSignupCodeRequest,
  ExchangeWhatsAppEmbeddedSignupCodeResponse
>(functions, 'exchangeWhatsAppEmbeddedSignupCode');

export interface PreviewAiReplyRequest {
  commentText: string;
  tone: 'samimi' | 'resmi';
}
export interface PreviewAiReplyResponse {
  intent: string;
  suggestedReply: string;
}
export const previewAiReply = httpsCallable<PreviewAiReplyRequest, PreviewAiReplyResponse>(
  functions,
  'previewAiReply'
);

export interface InstagramMediaItem {
  id: string;
  thumbnailUrl: string;
  caption: string;
  permalink: string;
}
export interface ListInstagramMediaRequest {
  igAccountId: string;
}
export interface ListInstagramMediaResponse {
  media: InstagramMediaItem[];
}
export const listInstagramMedia = httpsCallable<
  ListInstagramMediaRequest,
  ListInstagramMediaResponse
>(functions, 'listInstagramMedia');

export interface DeleteMyAccountResponse {
  success: boolean;
}
export const deleteMyAccount = httpsCallable<void, DeleteMyAccountResponse>(
  functions,
  'deleteMyAccount'
);

export interface MintCustomTokenForPhoneAuthRequest {
  idToken: string;
}
export interface MintCustomTokenForPhoneAuthResponse {
  customToken: string;
}
export const mintCustomTokenForPhoneAuth = httpsCallable<
  MintCustomTokenForPhoneAuthRequest,
  MintCustomTokenForPhoneAuthResponse
>(functions, 'mintCustomTokenForPhoneAuth');

export interface SendManualMessageRequest {
  igAccountId: string;
  recipientUserId: string;
  text: string;
}
export interface SendManualMessageResponse {
  success: boolean;
}
export const sendManualMessage = httpsCallable<
  SendManualMessageRequest,
  SendManualMessageResponse
>(functions, 'sendManualMessage');

export interface SendBroadcastRequest {
  igAccountId: string;
  text: string;
  targetTag: string | null;
}
export interface SendBroadcastResponse {
  broadcastId: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}
export const sendBroadcast = httpsCallable<SendBroadcastRequest, SendBroadcastResponse>(
  functions,
  'sendBroadcast'
);

export interface GetBroadcastRecipientCountRequest {
  igAccountId: string;
  targetTag: string | null;
}
export interface GetBroadcastRecipientCountResponse {
  count: number;
}
export const getBroadcastRecipientCount = httpsCallable<
  GetBroadcastRecipientCountRequest,
  GetBroadcastRecipientCountResponse
>(functions, 'getBroadcastRecipientCount');
