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
