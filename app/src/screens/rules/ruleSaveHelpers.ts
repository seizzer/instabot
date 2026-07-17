import { createRule, markFreePostUsed, updateRule } from '../../services/firestore';
import { Rule, SubscriptionTier } from '../../types/models';

// Shared by RuleWizardScreen and SimpleTriggerRuleScreen — every rule type
// goes through the same freemium gate (first automated rule is free) and
// create/update branching, only the payload shape differs per screen.
export async function saveRuleWithFreemiumGate(params: {
  editingRuleId: string | undefined;
  userUid: string;
  subscriptionTier: SubscriptionTier | undefined;
  freePostUsed: boolean | undefined;
  payload: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>;
}): Promise<'saved' | 'paywall'> {
  if (!params.editingRuleId && params.subscriptionTier !== 'pro' && params.freePostUsed) {
    return 'paywall';
  }

  if (params.editingRuleId) {
    await updateRule(params.editingRuleId, params.payload);
  } else {
    await createRule(params.payload);
    if (params.subscriptionTier !== 'pro' && !params.freePostUsed) {
      await markFreePostUsed(params.userUid);
    }
  }

  return 'saved';
}
