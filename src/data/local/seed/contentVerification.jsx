const reviewedAt = '2026-09-29';

const SOURCE_REVIEW = Object.freeze({
  reviewMethod: 'online-source-review',
  fieldVerified: false,
  operationalNote: 'LakBai reviewed public online sources. This is not a field inspection. Reconfirm time-sensitive hours, fees, transport, access conditions, and closures before travel.',
});

const reviewed = entry => ({
  ...SOURCE_REVIEW,
  ...entry,
  reviewedAt,
});

export const destinationVerification = Object.freeze({
  samal: reviewed({
    status: 'partial',
    summary: 'Destination identity and tourism context were checked against official Samal tourism and city-government sources. LakBai does not treat ferry schedules, fares, opening hours, road condition, or facility availability as verified by this review.',
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
    summary: 'Hagimit Falls is represented in official Samal tourism material. Exact visitor procedures, prices, opening conditions, transport availability, walking conditions, and suggested route timing remain unverified operational details.',
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
    summary: 'The Monfort colony identity, Samal location, and Guinness record for Geoffrey’s rousette fruit bats were source-reviewed. Current visitor procedures, schedules, fees, accessibility, and path conditions still require local confirmation.',
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
    summary: 'Tagum tourism-office information and current city/cultural references were checked against the city-government website. LakBai does not treat transport schedules, market operating details, attraction hours, or facility availability as verified.',
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
    summary: 'Panabo City sources confirm the J.P. Laurel mangrove attraction, while historical official pages report differing boardwalk lengths. LakBai therefore navigates only the independently source-matched OpenStreetMap segment and does not infer current total boardwalk length, opening hours, fees, or access conditions.',
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
    summary: 'Coming-soon content is still a prototype and is not presented as source-reviewed visitor guidance.',
    sources: [],
  }),
  'san-isidro': reviewed({
    status: 'prototype',
    summary: 'Coming-soon content is still a prototype and is not presented as source-reviewed visitor guidance.',
    sources: [],
  }),
});

export const verificationForDestination = destinationId => (
  destinationVerification[destinationId] ?? reviewed({
    status: 'prototype',
    summary: 'This content has not yet completed source review.',
    sources: [],
  })
);
