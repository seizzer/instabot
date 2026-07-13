import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { REGION, db } from '../lib/admin';
import { listInstagramMedia as fetchMedia } from '../lib/graphApi';

interface Request {
  igAccountId: string;
}

export const listInstagramMedia = onCall<Request>({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');

  const igAccountDoc = await db.collection('igAccounts').doc(request.data.igAccountId).get();
  const igAccount = igAccountDoc.data();
  if (!igAccount || igAccount.ownerUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Bu hesaba erişimin yok.');
  }

  const secretDoc = await db.collection('igAccountsSecrets').doc(request.data.igAccountId).get();
  const accessToken = secretDoc.data()?.accessToken as string | undefined;
  if (!accessToken) throw new HttpsError('failed-precondition', 'Instagram bağlantısı bulunamadı.');

  const media = await fetchMedia(igAccount.igUserId, accessToken);
  return {
    media: media.map((m) => ({
      id: m.id,
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? '',
      caption: m.caption ?? '',
      permalink: m.permalink,
    })),
  };
});
