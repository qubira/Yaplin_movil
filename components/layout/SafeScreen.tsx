import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/colors';

interface SafeScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export default function SafeScreen({
  children,
  scrollable = false,
  keyboardAvoiding = false,
  edges = ['top', 'bottom'],
}: SafeScreenProps) {
  const content = scrollable ? (
    <ScrollView
      style={s.flex}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.grow}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={s.flex}>{children}</View>
  );

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {content}
    </KeyboardAvoidingView>
  ) : content;

  return (
    <SafeAreaView style={s.root} edges={edges}>
      <StatusBar style="light" />
      {wrapped}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.BACKGROUND_DARK },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
});
