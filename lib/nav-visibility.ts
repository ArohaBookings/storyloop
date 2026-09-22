import { hasFeatureAccess, planRank, requiredPlanForFeature, type FeatureKey, type PlanKey } from "@/lib/plans";

/**
 * Whether a nav item is shown to this plan. Unlocked items always are. A
 * locked item is shown only when it is within one step: an individual plan
 * sees individual-plan features it lacks, and a centre plan sees the centre
 * features above it.
 */
export function navItemVisible(plan: PlanKey, feature?: FeatureKey) {
  if (!feature || hasFeatureAccess(plan, feature)) return true;
  const required = requiredPlanForFeature(feature);
  const individual = planRank(plan) < planRank("centre_starter");
  const requiresCentre = planRank(required) >= planRank("centre_starter");
  return !(individual && requiresCentre);
}
