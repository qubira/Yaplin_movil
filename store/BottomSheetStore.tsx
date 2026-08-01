import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { View, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useEffect } from 'react';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

interface StackEntry {
  node: ReactNode;
  dismissOnBackdrop: boolean;
}

interface BottomSheetContextValue {
  // Renders `content` as a full-screen absolutely-positioned overlay, a
  // sibling of the whole app (mounted once, at the very root, above the Tabs
  // navigator) — deliberately NOT React Native's <Modal>. Every bottom sheet
  // in the app used to be its own <Modal>, and on this project's Android/Expo
  // setup that repeatedly left a gap at the bottom showing the screen behind
  // it (both at rest and, worse, right after the keyboard closed) no matter
  // how it was configured (statusBarTranslucent, navigationBarTranslucent,
  // KeyboardAvoidingView, a hand-rolled keyboard-height hook — none of it
  // stuck). A Modal opens a *separate native window* on Android, and getting
  // that window's bounds to always match the real screen, in every keyboard
  // state, turned out to be unreliable on this device/OS combination. This
  // overlay is just a plain View in the SAME tree as everything else, sized
  // by ordinary flexbox against the app's own root container — there is no
  // separate window whose bounds can disagree with the screen.
  //
  // `present` pushes onto a stack rather than replacing a single slot — a
  // form sheet (e.g. the store/member forms) may itself call `present()` to
  // open a secondary picker on top of it (e.g. StorePickerModal); `dismiss`
  // pops just that top entry, revealing the form sheet again underneath,
  // instead of closing everything.
  present: (content: ReactNode, options?: { dismissOnBackdrop?: boolean }) => void;
  dismiss: () => void;
  isOpen: boolean;
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const keyboardHeight = useKeyboardHeight();

  const present = useCallback((node: ReactNode, options?: { dismissOnBackdrop?: boolean }) => {
    setStack(prev => [...prev, { node, dismissOnBackdrop: options?.dismissOnBackdrop ?? true }]);
  }, []);

  const dismiss = useCallback(() => setStack(prev => prev.slice(0, -1)), []);

  const top = stack[stack.length - 1];

  useEffect(() => {
    if (!top) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [top, dismiss]);

  const value = useMemo<BottomSheetContextValue>(() => ({ present, dismiss, isOpen: !!top }), [present, dismiss, top]);

  return (
    <BottomSheetContext.Provider value={value}>
      {children}
      {/* Every entry in the stack renders, not just the top one — a form
          sheet presenting a secondary picker on top of itself (e.g.
          StorePickerModal over the store/member form) used to make the form
          disappear from the tree entirely while the picker was open, which
          unmounted it and threw away all its local state (typed fields,
          the very selection the picker was for). Rendering each entry keeps
          every lower sheet mounted underneath; its own opaque backdrop and
          card still fully cover whatever's below it, so this is purely a
          "stay mounted, not visible" fix, not a visual change. */}
      {stack.map((entry, i) => (
        <View
          key={i}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="box-none"
        >
          <TouchableWithoutFeedback onPress={() => { if (entry.dismissOnBackdrop) dismiss(); }}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,6,10,0.82)' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={{ width: '100%', marginBottom: keyboardHeight }}>
                  {entry.node}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      ))}
    </BottomSheetContext.Provider>
  );
}

export function useBottomSheet(): BottomSheetContextValue {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) throw new Error('useBottomSheet must be used within BottomSheetProvider');
  return ctx;
}
