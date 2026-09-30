export const NATIONAL_EMERGENCY_HOTLINE = Object.freeze({
  label: 'National Emergency Hotline',
  phone: '911',
  verified: true,
});

const digitsOnly = value => String(value ?? '').replace(/\D/g, '');

export const isNationalEmergencyHotline = contact => (
  digitsOnly(contact?.phone) === NATIONAL_EMERGENCY_HOTLINE.phone
);

export const callVerifiedEmergencyContact = async (deps, contact) => {
  if (!contact?.verified) {
    throw new Error('This contact has not been verified for direct calling.');
  }
  return deps.phoneService.call(contact.phone);
};

export const callNationalEmergencyHotline = deps => (
  callVerifiedEmergencyContact(deps, NATIONAL_EMERGENCY_HOTLINE)
);
