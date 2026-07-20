import { db } from './admin';

// Shared by connectWhatsAppAccount (manual System User token — dev/testing
// path) and exchangeWhatsAppEmbeddedSignupCode (real end-user flow) so the
// upsert-not-duplicate logic (see exchangeInstagramCode's igAccounts
// comment) only lives in one place.
export async function upsertWhatsAppAccount(params: {
  ownerUid: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  accessToken: string;
}): Promise<string> {
  const existing = await db
    .collection('whatsAppAccounts')
    .where('ownerUid', '==', params.ownerUid)
    .where('phoneNumberId', '==', params.phoneNumberId)
    .limit(1)
    .get();
  const accountRef = existing.empty ? db.collection('whatsAppAccounts').doc() : existing.docs[0].ref;

  await accountRef.set(
    {
      ownerUid: params.ownerUid,
      phoneNumberId: params.phoneNumberId,
      wabaId: params.wabaId,
      displayPhoneNumber: params.displayPhoneNumber,
      verifiedName: params.verifiedName,
      status: 'active',
      connectedAt: new Date(),
    },
    { merge: true }
  );

  await db.collection('whatsAppAccountsSecrets').doc(accountRef.id).set({
    accessToken: params.accessToken,
  });

  return accountRef.id;
}
