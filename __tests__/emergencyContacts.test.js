import { callVerifiedEmergencyContact } from '../src/domain/usecases/emergencyContacts.jsx';

describe('verified emergency contact calling', () => {
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
});
