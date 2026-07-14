import { User } from '../services/supabaseService';

export const isTrialExpired = (user: User) => {
  const now = new Date().getTime();
  
  if (user.trialEndsAt) {
    return now > new Date(user.trialEndsAt).getTime();
  }

  // Fallback for older accounts without trialEndsAt
  const trialStart = new Date(user.trialStartDate);
  const trialEnds = new Date(trialStart);
  
  if (user.type === 'particulier') {
    trialEnds.setMonth(trialStart.getMonth() + 3);
  } else {
    trialEnds.setDate(trialStart.getDate() + 7);
  }
  
  return now > trialEnds.getTime();
};

export const hasActiveSubscription = (user: User) => {
  if (!user.subscription) return false;
  const end = new Date(user.subscription.endDate).getTime();
  const now = new Date().getTime();
  return end > now;
};

export const isSubscriptionExpired = (user: User) => {
  if (!user.subscription) return true;
  const end = new Date(user.subscription.endDate).getTime();
  const now = new Date().getTime();
  return now > end;
};

export const canAccessContent = (user: User) => {
  if (user.type === 'particulier') return true;
  
  // Robust production check: if subscription status is active, allow full access immediately.
  if (user.subscriptionStatus === 'active') {
    return true;
  }
  
  // Otherwise, fallback to active trial check
  const trialActive = !isTrialExpired(user);
  
  return trialActive;
};
