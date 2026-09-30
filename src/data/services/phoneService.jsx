import { Linking } from 'react-native';

const sanitizePhone = phone => String(phone ?? '').replace(/[^+\d]/g, '');

export const createPhoneService = () => ({
  call: async phone => {
    const sanitized = sanitizePhone(phone);
    if (!sanitized) {
      throw new Error('The contact does not have a valid phone number.');
    }
    const url = `tel:${sanitized}`;
    try {
      await Linking.openURL(url);
    } catch {
      throw new Error('The phone dialer could not be opened on this device.');
    }
  }
});
