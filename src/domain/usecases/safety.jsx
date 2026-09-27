export const listChecklist = async deps => {
  return deps.safetyRepository.listChecklist();
};
export const listCompletedKeys = async deps => {
  return deps.safetyRepository.listCompletedKeys();
};
export const setChecklistItemCompleted = async (deps, key, completed) => {
  return deps.safetyRepository.setCompleted(key, completed);
};
export const resetChecklist = async deps => {
  return deps.safetyRepository.resetChecklist();
};

export const dedupeEmergencyContacts = contacts => {
  const unique = new Map();
  for (const contact of contacts) {
    const key = contact.label + '|' + contact.phone;
    if (!unique.has(key)) {
      unique.set(key, contact);
    }
  }
  return [...unique.values()];
};
