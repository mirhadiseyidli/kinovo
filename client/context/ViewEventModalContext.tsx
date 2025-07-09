import { createContext, useContext } from 'react';

type ViewEventModalType = 
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