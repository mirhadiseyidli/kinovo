import React from 'react';
import { ThemedView } from '@/components/ThemedView';
import SignUpContent from '@/components/Auth/SignUpContent';

export default function SignUp() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SignUpContent />
    </ThemedView>
  );
}