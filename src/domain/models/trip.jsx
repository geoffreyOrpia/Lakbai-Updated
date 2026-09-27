export const LOCAL_DEVICE_OWNER = 'local-device';

export const createItineraryStop = ({
  id,
  destinationId,
  title,
  notes = '',
  order = 0,
}) => ({
  id,
  destinationId,
  title,
  notes,
  order,
});
