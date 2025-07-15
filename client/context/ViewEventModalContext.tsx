import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';

export type ViewEventModalType = 
  | 'report_confirm' 
  | 'report_reason' 
  | 'report_other'
  | 'report_success'
  | 'cancel_confirm_recurring'
  | 'cancel_confirm'
  | 'cancel_success'
  | 'status_change_recurring'
  | 'attendee_remove_confirm'
  | 'remove_attendee_recurring'
  | 'invite_recurring_confirm'
  | 'invite_error'
  | 'host_cancel_confirm'
  | 'not_interested_success';

interface ViewEventModalState {
  type: ViewEventModalType | null;
  data?: any;
}

interface ViewEventModalContextType {
  showModal: (type: ViewEventModalType, data?: any) => void;
  hideModal: () => void;
  isModalActive: boolean;
}

export const ViewEventModalContext = createContext<ViewEventModalContextType | null>(null);

export const useViewEventModal = () => {
  const context = useContext(ViewEventModalContext);
  if (!context) {
    throw new Error('useViewEventModal must be used within ViewEventModalProvider');
  }
  return context;
};

export const ViewEventModalProvider: React.FC<{ children: React.ReactNode; event: any }> = ({ children, event }) => {
  const [modalState, setModalState] = useState<ViewEventModalState>({ type: null });
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);
  const router = useRouter();

  const showModal = useCallback((type: ViewEventModalType, data?: any) => {
    setModalState({ type, data });
  }, []);

  const hideModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  // Handle navigation after modal dismissal
  useEffect(() => {
    if (shouldNavigateBack) {
      InteractionManager.runAfterInteractions(() => {
        if (router.canGoBack()) {
          router.back();
        }
        setShouldNavigateBack(false);
      });
    }
  }, [shouldNavigateBack, router]);

  // Centralized modal handler
  useEffect(() => {
    if (!modalState.type) return;

    const { type, data } = modalState;

    switch (type) {
      case 'status_change_recurring':
        const statusText = data.status === 'accepted' ? 'accept' : data.status === 'maybe' ? 'mark as maybe' : 'decline';
        Alert.alert(
          'Recurring Event',
          `Do you want to ${statusText} this event only or all future events?`,
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm(data.status, { modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm(data.status, { modifyType: 'all_future' }); }},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'cancel_confirm_recurring':
        Alert.alert('Recurring Event', 'Do you want to cancel this event only or all future events?',
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'all_future' }); }, style: 'destructive' },
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
      
      case 'cancel_confirm':
        Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?',
          [
            { text: 'Yes', onPress: () => { hideModal(); data.onConfirm(); }, style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'host_cancel_confirm':
        Alert.alert('Cancel Event', 'Are you sure you want to cancel the event?',
          [
            { text: 'Yes', onPress: () => { hideModal(); data.onConfirm(); }, style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
      
      case 'cancel_success':
        Alert.alert('Event Cancelled', data.message,
          [ { text: 'OK', onPress: () => { hideModal(); setShouldNavigateBack(true); }} ]
        );
        break;
      
      case 'report_confirm':
        Alert.alert('Report Event', 'Are you sure you want to report this event?',
          [
            { text: 'Yes', onPress: () => showModal('report_reason', data), style: 'destructive' },
            { text: 'No', style: 'cancel', onPress: hideModal },
          ]
        );
        break;
        
      case 'report_reason':
        Alert.alert('Report Event', 'Please select a reason for reporting this event:',
          [
            { text: 'Spam', onPress: () => { data.onReport('spam'); hideModal(); }},
            { text: 'Inappropriate Content', onPress: () => { data.onReport('inappropriate'); hideModal(); }},
            { text: 'Abuse', onPress: () => { data.onReport('abuse'); hideModal(); }},
            { text: 'False Information', onPress: () => { data.onReport('false_information'); hideModal(); }},
            { text: 'Other', onPress: () => showModal('report_other', data)},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'report_other':
        Alert.prompt('Additional Details', 'Please provide more information about why you are reporting this event:',
          [
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
            { text: 'Submit', onPress: (details) => { data.onReport('other', details); hideModal(); }}
          ],
          'plain-text'
        );
        break;
      
      case 'report_success':
        Alert.alert('Report Submitted', 'Thank you for your report. We will review it as soon as possible.',
          [ { text: 'OK', onPress: hideModal } ]
        );
        break;

      case 'attendee_remove_confirm':
        Alert.alert('Remove User', 'Are you sure you want to remove this user from the event?',
          [
            { text: 'Remove', onPress: () => { hideModal(); data.onConfirm(data.attendeeId); }, style: 'destructive' },
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'remove_attendee_recurring':
        Alert.alert(
          'Recurring Event',
          `Do you want to remove ${data.attendeeName} from this event only or all future events?`,
          [
            { 
              text: 'This Event Only', 
              onPress: () => { hideModal(); data.onConfirm(data.attendeeId, { modifyType: 'this_only' }); }
            },
            { 
              text: 'All Future Events', 
              onPress: () => { hideModal(); data.onConfirm(data.attendeeId, { modifyType: 'all_future' }); },
              style: 'destructive'
            },
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: hideModal 
            },
          ]
        );
        break;

      case 'invite_recurring_confirm':
        Alert.alert(
          'Recurring Event',
          'Do you want to invite these friends to this event only or all future events?',
          [
            { text: 'This Event Only', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'this_only' }); }},
            { text: 'All Future Events', onPress: () => { hideModal(); data.onConfirm({ modifyType: 'all_future' }); }},
            { text: 'Cancel', style: 'cancel', onPress: hideModal },
          ]
        );
        break;

      case 'invite_error':
        Alert.alert('Error', 'Failed to invite friends. Please try again.',
          [ { text: 'OK', onPress: hideModal } ]
        );
        break;

      case 'not_interested_success':
        Alert.alert('Not Interested', data.message,
          [ { text: 'OK', onPress: () => { hideModal(); setShouldNavigateBack(true); }} ]
        );
        break;
    }
  }, [modalState, hideModal, showModal, router]);

  return (
    <ViewEventModalContext.Provider value={{ showModal, hideModal, isModalActive: !!modalState.type }}>
      {children}
    </ViewEventModalContext.Provider>
  );
}; 