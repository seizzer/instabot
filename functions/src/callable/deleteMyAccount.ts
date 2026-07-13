import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { REGION, db } from '../lib/admin';

const COLLECTIONS_WITH_OWNER_UID = ['igAccounts', 'rules', 'automationLogs', 'conversations'];

// Meta App Review requires a working "data deletion" path for connected
// accounts — this satisfies that plus general user-initiated account deletion.
export const deleteMyAccount = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  const uid = request.auth.uid;

  const igAccountsSnap = await db.collection('igAccounts').where('ownerUid', '==', uid).get();
  const batch = db.batch();

  for (const collectionName of COLLECTIONS_WITH_OWNER_UID) {
    const snap = await db.collection(collectionName).where('ownerUid', '==', uid).get();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
  }
  igAccountsSnap.docs.forEach((doc) => {
    batch.delete(db.collection('igAccountsSecrets').doc(doc.id));
  });
  batch.delete(db.collection('users').doc(uid));
  batch.delete(db.collection('subscriptions').doc(uid));

  await batch.commit();
  await getAuth().deleteUser(uid);

  return { success: true };
});
