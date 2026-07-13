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
