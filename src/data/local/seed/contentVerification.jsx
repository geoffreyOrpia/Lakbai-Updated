const reviewedAt = '2026-09-28';

export const destinationVerification = Object.freeze({
  samal: {
    status: 'partial',
    reviewedAt,
    summary: 'Core destination identity and tourism context were checked against the Samal City tourism portal. Transport timing, prices, facility availability, and route timing remain local planning notes and should be reconfirmed before travel.',
    sources: [
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        scope: 'Destination identity, tourism circuits, visitor directory',
      },
      {
        label: 'Island Garden City of Samal — tourism project turnover',
        url: 'https://samalcity.gov.ph/our-city/samal-news/provincial-government-igacos-formalize-tourism-project-turnover',
        scope: 'Current city/province tourism context',
      },
    ],
  },
  'hagimit-falls': {
    status: 'partial',
    reviewedAt,
    summary: 'Hagimit Falls is listed within Samal tourism material, but operational details in this prototype pack such as exact access conditions, prices, transport availability, and trail timing are not treated as verified.',
    sources: [
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        scope: 'Samal tourism directory and attraction context',
      },
    ],
  },
  'monfort-bat-sanctuary': {
    status: 'partial',
    reviewedAt,
    summary: 'The Monfort colony identity and Guinness record for Geoffrey’s rousette fruit bats were checked. Visitor schedules, fees, accessibility, and path details in this prototype remain subject to local confirmation.',
    sources: [
      {
        label: 'Guinness World Records — Monfort Bat Colony',
        url: 'https://www.guinnessworldrecords.com/world-records/largest-colony-of-geoffreys-rousette-fruit-bat-rousetteus-amplexicaudatus',
        scope: 'Species-specific colony record and Samal location',
      },
      {
        label: 'Samal Turismo — City Tourism Office',
        url: 'https://turismo.samalcity.gov.ph/',
        scope: 'Local tourism directory context',
      },
    ],
  },
  tagum: {
    status: 'partial',
    reviewedAt,
    summary: 'Tagum City tourism-office information and Christ the King Cathedral references were checked against the city government website. Route timing, transport notes, market details, and facility availability remain prototype planning notes.',
    sources: [
      {
        label: 'Tagum City Official Website — City Tourism and Cultural Office directory',
        url: 'https://tagumcity.gov.ph/?page_id=633',
        scope: 'Official tourism office reference',
      },
      {
        label: 'Tagum City Official Website — 28th Araw ng Tagum',
        url: 'https://tagumcity.gov.ph/?p=6091',
        scope: 'Christ the King Cathedral and current city cultural context',
      },
    ],
  },
  panabo: {
    status: 'partial',
    reviewedAt,
    summary: 'The J.P. Laurel mangrove boardwalk and its location were checked against the Panabo City government website. Current opening conditions, local-guide availability, donations, transport, and route timing should still be reconfirmed locally.',
    sources: [
      {
        label: 'City Government of Panabo — J.P. Laurel Mangrove Reforestation Area',
        url: 'https://panabocity.gov.ph/j-p-laurel-mangrove-reforestation-area/',
        scope: 'Mangrove boardwalk identity and Barangay J.P. Laurel location',
      },
      {
        label: 'City Government of Panabo — Tourist Spots',
        url: 'https://panabocity.gov.ph/category/touristspots/page/2/',
        scope: 'Boardwalk and mangrove tourism context',
      },
    ],
  },
  kapalong: {
    status: 'prototype',
    reviewedAt,
    summary: 'Coming-soon content is still a prototype and is not presented as verified visitor guidance.',
    sources: [],
  },
  'san-isidro': {
    status: 'prototype',
    reviewedAt,
    summary: 'Coming-soon trail content is still a prototype and is not presented as verified visitor guidance.',
    sources: [],
  },
});

export const verificationForDestination = destinationId => (
  destinationVerification[destinationId] ?? {
    status: 'prototype',
    reviewedAt,
    summary: 'This content has not yet completed source review.',
    sources: [],
  }
);
