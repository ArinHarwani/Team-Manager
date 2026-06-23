import { create } from 'zustand';

interface UIState {
  isAddCustomerOpen: boolean;
  setAddCustomerOpen: (isOpen: boolean) => void;
  
  selectedCustomerId: string | null;
  setSelectedCustomer: (id: string | null) => void;
  
  isHelpAlertsOpen: boolean;
  setHelpAlertsOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddCustomerOpen: false,
  setAddCustomerOpen: (isOpen) => set({ isAddCustomerOpen: isOpen }),
  
  selectedCustomerId: null,
  setSelectedCustomer: (id) => set({ selectedCustomerId: id }),
  
  isHelpAlertsOpen: false,
  setHelpAlertsOpen: (isOpen) => set({ isHelpAlertsOpen: isOpen }),
}));
