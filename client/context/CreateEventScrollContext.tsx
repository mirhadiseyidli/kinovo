import React from 'react';

// Create a context for sharing scroll state between tabs
export const CreateEventScrollContext = React.createContext<{
  bounceCompleted: { value: boolean };
  wasDraggingAtTop: { value: boolean };
  isDismissing: { value: boolean };
  handleDismiss: () => void;
}>({
  bounceCompleted: { value: false },
  wasDraggingAtTop: { value: false },
  isDismissing: { value: false },
  handleDismiss: () => {},
}); 