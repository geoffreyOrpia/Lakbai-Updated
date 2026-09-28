export const FERRY_CONNECTIONS = Object.freeze([{
  id: 'davsam-panacan-babak',
  name: 'DAVSAM Panacan ↔ Babak ferry',
  operator: 'DAVSAM Link Corporation',
  modes: ['walk', 'drive'],
  verificationStatus: 'source-reviewed-device-pending',
  scheduleModeled: false,
  crossingDurationMin: 30,
  durationSource: 'MARINA Road Roll-On/Roll-Off Terminal System Matrix · March 2026',
  durationReferenceYear: 2026,
  queueTimeModeled: false,
  terminals: {
    mainland: {
      id: 'davsam-panacan',
      name: 'DAVSAM Ferry Terminal · Panacan',
      region: 'mainland',
      coordinateStatus: 'pcg-corridor-endpoint-device-pending',
      lat: 7.1461111111,
      lng: 125.6633333333,
    },
    samal: {
      id: 'port-of-babak',
      name: 'Port of Babak',
      region: 'samal',
      coordinateStatus: 'pcg-corridor-endpoint-device-pending',
      lat: 7.1336111111,
      lng: 125.6838888889,
    },
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [125.6633333333, 7.1461111111],
      [125.6838888889, 7.1336111111],
    ],
  },
  sources: [{
    label: 'Philippine Coast Guard District Southeastern Mindanao MC 02-23',
    note: 'Defines the DAVSAM Ferry Terminal to Port of Babak route along Pakiputan Strait and its endpoint coordinates.',
    url: 'https://www.maritimesafetypcg8.com/Safety-Policies/Memorandum-Circulars/MC%2002-23%20Heavy%20Weather.pdf',
  }, {
    label: 'MARINA Road Roll-On/Roll-Off Terminal System Matrix · March 2026',
    note: 'Lists Km. 13 Panacan to Babak as a served DAVSAM Link route, 1.51 NM, with a published 30-minute travel time.',
    url: 'https://marina.gov.ph/wp-content/uploads/2026/04/Philippine-Nautical-Highway-Matrix-MAR-2026.pdf',
  }, {
    label: 'MARINA Regional Office XI · Ligtas Byaheng Dagat 2026',
    note: 'Records March 2026 vessel safety inspections at DavSam Port in Davao City; this is current service evidence, not a timetable.',
    url: 'https://marina.gov.ph/2026/04/01/ligtas-byaheng-dagat-2/',
  }, {
    label: 'Davao del Norte Provincial Government ferry transport record',
    note: 'Documents DAVSAM Link ferry operations between IGaCoS and Davao City.',
  }],
}]);

export const ferryConnectionForRegions = (originRegion, targetRegion, mode) => (
  FERRY_CONNECTIONS.find(connection => (
    connection.modes.includes(mode)
    && connection.terminals[originRegion]
    && connection.terminals[targetRegion]
  )) ?? null
);
