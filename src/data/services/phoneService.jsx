import { Linking } from 'react-native';

const sanitizePhone = phone => String(phone ?? '').replace(/[^+\d]/g, '');

export const createPhoneService = () => ({
  call: async phone => {
    const sanitized = sanitizePhone(phone);
    if (!sanitized) {
      throw new Error('The contact does not have a valid phone number.');
    }
    const url = `tel:${sanitized}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error('Calling is not available on this device.');
    }
    await Linking.openURL(url);
  }
});
