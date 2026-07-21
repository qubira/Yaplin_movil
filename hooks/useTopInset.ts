import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthStore';
import { isSubscriptionBannerVisible } from '../components/ui/SubscriptionBanner';

/**
 * Top padding for tab screens. The subscription banner (rendered once,
 * above the tab navigator) already reserves the status-bar area when it's
 * visible — screens must not add insets.top on top of it or the header
 * ends up pushed down twice.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  return isSubscriptionBannerVisible(user?.subscription) ? 0 : insets.top;
}
