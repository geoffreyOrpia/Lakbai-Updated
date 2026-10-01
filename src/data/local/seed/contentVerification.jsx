const reviewedAt = '2026-09-29';

const SOURCE_REVIEW = Object.freeze({
  reviewMethod: 'online-source-review',
  fieldVerified: false,
  operationalNote: 'Sources were reviewed online, not checked on site. Confirm current hours, fees, transport, access conditions, and closures before travel.',
});

const reviewed = entry => ({
  ...SOURCE_REVIEW,
  ...entry,
  reviewedAt,
});

export const destinationVerification = Object.freeze({
  samal: reviewed({
    status: 'partial',
    summary: 'Official Samal tourism and city-government sources confirm the destination and tourism context. Ferry schedules, fares, opening hours, road conditions, and facility availability can change and are not confirmed by this review.',
    sources: [
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        type: 'official-tourism',
        scope: 'Destination identity, tourism circuits, visitor directory',
      },
      {
        label: 'Island Garden City of Samal — tourism project turnover',
        url: 'https://samalcity.gov.ph/our-city/samal-news/provincial-government-igacos-formalize-tourism-project-turnover',
        type: 'official-government',
        scope: 'Current city/province tourism-development context',
      },
    ],
  }),
  'hagimit-falls': reviewed({
    status: 'partial',
    summary: 'Official Samal tourism material identifies Hagimit Falls as a local attraction. Current visitor procedures, prices, opening conditions, transport availability, walking conditions, and route timing still require local confirmation.',
    sources: [
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        type: 'official-tourism',
        scope: 'Samal tourism directory and attraction context',
      },
    ],
  }),
  'monfort-bat-sanctuary': reviewed({
    status: 'partial',
    summary: 'Guinness World Records and Samal tourism sources confirm the colony identity, Samal location, and record for Geoffrey’s rousette fruit bats. Current visitor procedures, schedules, fees, accessibility, and path conditions still require local confirmation.',
    sources: [
      {
        label: 'Guinness World Records — Monfort Bat Colony',
        url: 'https://www.guinnessworldrecords.com/world-records/largest-colony-of-geoffreys-rousette-fruit-bat-rousetteus-amplexicaudatus',
        type: 'authoritative-record',
        scope: 'Species-specific colony record and Samal location',
      },
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        type: 'official-tourism',
        scope: 'Local tourism directory context',
      },
    ],
  }),
  tagum: reviewed({
    status: 'partial',
    summary: 'Tagum tourism-office and city cultural information were checked against the city-government website. Transport schedules, market operating details, attraction hours, and facility availability can change and are not confirmed by this review.',
    sources: [
      {
        label: 'Tagum City Official Website — City Tourism and Cultural Office directory',
        url: 'https://tagumcity.gov.ph/?page_id=633',
        type: 'official-government',
        scope: 'Official tourism-office reference',
      },
      {
        label: 'Tagum City Official Website — 28th Araw ng Tagum',
        url: 'https://tagumcity.gov.ph/?p=6091',
        type: 'official-government',
        scope: 'Christ the King Cathedral and current city cultural context',
      },
    ],
  }),
  panabo: reviewed({
    status: 'partial',
    summary: 'Panabo City sources confirm the J.P. Laurel mangrove attraction, while historical official pages report different boardwalk lengths. Navigation therefore covers only the mapped OpenStreetMap segment; the current total boardwalk length, hours, fees, and access conditions are not confirmed.',
    sources: [
      {
        label: 'City Government of Panabo — J.P. Laurel Mangrove Reforestation Area',
        url: 'https://panabocity.gov.ph/j-p-laurel-mangrove-reforestation-area/',
        type: 'official-government',
        scope: 'Mangrove attraction identity and Barangay J.P. Laurel location; historical visitor information',
      },
      {
        label: 'City Government of Panabo — Mangrove Park Ecotourism Project Inaugurated',
        url: 'https://panabocity.gov.ph/panabo-mangrove-park-ecotourism-project-inaugurated/',
        type: 'official-government',
        scope: 'Historical project description and boardwalk development',
      },
      {
        label: 'OpenStreetMap — way 641690678',
        url: 'https://www.openstreetmap.org/way/641690678',
        type: 'open-geodata',
        scope: 'Mapped geometry used for the navigable boardwalk segment',
      },
    ],
  }),
  kapalong: reviewed({
    status: 'prototype',
    summary: 'Visitor information is still under review and is not yet available as a destination guide.',
    sources: [],
  }),
  'san-isidro': reviewed({
    status: 'prototype',
    summary: 'Visitor information is still under review and is not yet available as a destination guide.',
    sources: [],
  }),
});

export const verificationForDestination = destinationId => (
  destinationVerification[destinationId] ?? reviewed({
    status: 'prototype',
    summary: 'Visitor information for this destination is still under review.',
    sources: [],
  })
);
