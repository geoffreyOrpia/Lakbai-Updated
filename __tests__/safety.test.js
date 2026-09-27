import { dedupeEmergencyContacts } from '../src/domain/usecases/safety.jsx';

describe('Safety contact preparation', () => {
  test('deduplicates the same emergency contact across saved packs', () => {
    const contacts = [
      {
        label: 'National Emergency Hotline',
        phone: '911',
        packName: 'Samal Island',
      },
      {
        label: 'National Emergency Hotline',
        phone: '911',
        packName: 'Tagum City',
      },
      {
        label: 'Different verified contact',
        phone: '1234',
        packName: 'Tagum City',
      },
    ];

    expect(dedupeEmergencyContacts(contacts)).toEqual([
      contacts[0],
      contacts[2],
    ]);
  });
});
