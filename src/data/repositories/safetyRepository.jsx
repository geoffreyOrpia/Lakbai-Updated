export const SAFETY_CHECKLIST = [{
  key: 'download-pack',
  label: 'Save your destination pack to the local library',
  icon: 'bookmark-outline'
}, {
  key: 'charge-phone',
  label: 'Charge your phone and bring a power bank',
  icon: 'battery-charging-outline'
}, {
  key: 'check-weather',
  label: 'Check the weather before leaving',
  icon: 'partly-sunny-outline'
}, {
  key: 'share-route',
  label: 'Tell someone your planned route',
  icon: 'people-outline'
}, {
  key: 'save-emergency',
  label: 'Keep local emergency details saved',
  icon: 'document-text-outline'
}, {
  key: 'first-aid',
  label: 'Pack water, snacks, and a basic first-aid kit',
  icon: 'medkit-outline'
}];
export class LocalSafetyRepository {
  constructor(dao) {
    this.dao = dao;
  }
  listChecklist = async () => {
    return SAFETY_CHECKLIST;
  };
  listCompletedKeys = async () => {
    return this.dao.listCompletedKeys();
  };
  setCompleted = async (key, completed) => {
    await this.dao.setCompleted(key, completed);
  };
  resetChecklist = async () => {
    await this.dao.reset();
  };
}
