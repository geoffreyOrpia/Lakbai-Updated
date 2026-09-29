export const NATIONAL_EMERGENCY_HOTLINE = Object.freeze({
  label: 'National Emergency Hotline',
  phone: '911',
  verified: true,
});

export const callVerifiedEmergencyContact = async (deps, contact) => {
  if (!contact?.verified) {
    throw new Error('This contact has not been verified for direct calling.');
  }
  return deps.phoneService.call(contact.phone);
};

export const callNationalEmergencyHotline = deps => (
  callVerifiedEmergencyContact(deps, NATIONAL_EMERGENCY_HOTLINE)
);
