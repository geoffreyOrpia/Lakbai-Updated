const mockOpenURL = jest.fn();
const mockCanOpenURL = jest.fn();

jest.mock('react-native', () => ({
  Linking: {
    openURL: (...args) => mockOpenURL(...args),
    canOpenURL: (...args) => mockCanOpenURL(...args),
  },
}));

import { createPhoneService } from '../src/data/services/phoneService.jsx';

describe('phone service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenURL.mockResolvedValue(undefined);
    mockCanOpenURL.mockResolvedValue(false);
  });

  test('opens the system dialer directly for 911 without relying on canOpenURL', async () => {
    const service = createPhoneService();

    await service.call('911');

    expect(mockOpenURL).toHaveBeenCalledWith('tel:911');
    expect(mockCanOpenURL).not.toHaveBeenCalled();
  });

  test('sanitizes formatted phone numbers before opening the dialer', async () => {
    const service = createPhoneService();

    await service.call('+63 (82) 123-4567');

    expect(mockOpenURL).toHaveBeenCalledWith('tel:+63821234567');
  });

  test('returns a clear failure when the operating system cannot open the dialer', async () => {
    mockOpenURL.mockRejectedValue(new Error('No activity found'));
    const service = createPhoneService();

    await expect(service.call('911')).rejects.toThrow('phone dialer could not be opened');
  });
});
