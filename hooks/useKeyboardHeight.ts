import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Deliberately NOT using KeyboardAvoidingView here — its 'padding' behavior
// left a small residual gap at the bottom of bottom-sheet Modals specifically
// right after the keyboard was dismissed (Android's keyboard-hide height
// event landing a frame late/imprecise inside a translucent Modal window).
// Tracking the height ourselves and forcing it to exactly 0 on hide removes
// that ambiguity entirely.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
