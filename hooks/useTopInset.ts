import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthStore';
import { isSubscriptionBannerVisible } from '../components/ui/SubscriptionBanner';

/**
 * Full top padding for a tab screen's header, given the padding it would
 * normally add below the status bar (e.g. 16-24). The subscription banner
 * (rendered once, above the tab navigator) already reserves the status-bar
 * area and its own bottom padding when visible, so screens must not stack
 * insets.top + their usual gap on top of it — that doubles the space and
 * leaves the header looking detached from the banner. When the banner is
 * showing, collapse down to a small fixed gap instead.
 */
export function useTopInset(basePadding: number): number {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  return isSubscriptionBannerVisible(user?.subscription) ? 8 : insets.top + basePadding;
}
