export const callVerifiedEmergencyContact = async (deps, contact) => {
  if (!contact?.verified) {
    throw new Error('This contact has not been verified for direct calling.');
  }
  return deps.phoneService.call(contact.phone);
};
