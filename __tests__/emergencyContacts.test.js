import {
  callNationalEmergencyHotline,
  callVerifiedEmergencyContact,
  isNationalEmergencyHotline,
  NATIONAL_EMERGENCY_HOTLINE,
} from '../src/domain/usecases/emergencyContacts.jsx';

describe('verified emergency contact calling', () => {
  test('exposes the verified national 911 hotline as a permanent one-tap emergency action', async () => {
    const phoneService = {
      call: jest.fn().mockResolvedValue(undefined),
    };

    await callNationalEmergencyHotline({ phoneService });

    expect(NATIONAL_EMERGENCY_HOTLINE).toEqual(expect.objectContaining({
      label: 'National Emergency Hotline',
      phone: '911',
      verified: true,
    }));
    expect(phoneService.call).toHaveBeenCalledWith('911');
  });

  test('calls through the platform service only for verified contacts', async () => {
    const phoneService = {
      call: jest.fn().mockResolvedValue(undefined),
    };
    const contact = {
      label: 'National Emergency Hotline',
      phone: '911',
      verified: true,
    };

    await callVerifiedEmergencyContact({ phoneService }, contact);

    expect(phoneService.call).toHaveBeenCalledWith('911');
  });

  test('rejects direct calling for unverified contacts', async () => {
    const phoneService = {
      call: jest.fn(),
    };

    await expect(callVerifiedEmergencyContact({ phoneService }, {
      label: 'Unverified local contact',
      phone: '123',
      verified: false,
    })).rejects.toThrow('not been verified');
    expect(phoneService.call).not.toHaveBeenCalled();
  });

  test('recognizes 911 contacts regardless of display formatting', () => {
    expect(isNationalEmergencyHotline({ phone: '911' })).toBe(true);
    expect(isNationalEmergencyHotline({ phone: '9-1-1' })).toBe(true);
    expect(isNationalEmergencyHotline({ phone: '0911' })).toBe(false);
  });
});
