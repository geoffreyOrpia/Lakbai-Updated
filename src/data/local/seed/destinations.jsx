// Bundled Davao del Norte destination catalog.

export const destinations = [{
  id: 'samal',
  name: 'Samal Island',
  aliases: ['Island Garden City of Samal', 'IGaCoS', 'IGACOS'],
  area: 'Island Garden City of Samal',
  municipality: 'Samal',
  province: 'Davao del Norte',
  category: 'island',
  status: 'available',
  summary: 'Island attractions, coastal stops, and source-reviewed offline travel notes.',
  description: 'The Island Garden City of Samal is a major Davao del Norte tourism area reached from the Davao side by water crossing. This pack keeps selected island attractions, port orientation, planning-only route suggestions, and offline travel notes together without assuming current ferry schedules, fares, or access conditions.',
  highlights: ['Selected island and coastal attractions', 'Ferry-crossing orientation with current details left for port confirmation', 'Planning-only coastal route suggestions', 'Source-reviewed notes stored for offline use'],
  navigation: {
    label: 'Port of Babak — Samal gateway',
    query: 'Port of Babak, Samal, Davao del Norte, Philippines',
    note: 'The route leads to the Babak ferry gateway. Choose a specific island spot below for its own directions.'
  },
  photos: [{
    key: 'samal-island',
    alt: 'Beach cottages on Samal Island',
    credit: 'Ismael Cacharro · CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Samal_Island_in_Davao.jpg'
  }],
  coverTheme: {
    from: '#0E7A5F',
    to: '#16A34A',
    icon: 'water'
  },
  featured: true
}, {
  id: 'hagimit-falls',
  name: 'Hagimit Falls',
  aliases: ['Hagimit Falls Nature Park'],
  area: 'Peñaplata, Samal',
  municipality: 'Samal',
  province: 'Davao del Norte',
  category: 'nature',
  status: 'available',
  summary: 'A Samal waterfall attraction with offline orientation and source-aware planning notes.',
  description: 'Hagimit Falls is represented in Samal tourism material as a waterfall destination in the Peñaplata area. This pack keeps mapped orientation points and planning notes offline while leaving current swimming conditions, facilities, fees, hours, and path conditions for local confirmation.',
  highlights: ['Waterfall destination in the Samal tourism area', 'Offline entrance and orientation references', 'Planning-only route sequence with no released trail geometry', 'Clear reminders to reconfirm current visitor conditions'],
  navigation: {
    label: 'Hagimit Falls Nature Park',
    query: 'Hagimit Falls, Samal, Davao del Norte, Philippines',
    note: 'Live directions use the mapped waterfall entrance in Samal District.'
  },
  photos: [{
    key: 'hagimit-falls',
    alt: 'Freshwater cascades and pools at Hagimit Falls',
    credit: 'RoyKabanlit · CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hagimit_Falls_001.jpg'
  }],
  coverTheme: {
    from: '#0B6B4F',
    to: '#22A06B',
    icon: 'leaf'
  },
  featured: true
}, {
  id: 'monfort-bat-sanctuary',
  name: 'Monfort Bat Sanctuary',
  aliases: ['Monfort Bat Cave', 'Monfort Cave'],
  area: 'Babak, Samal',
  municipality: 'Samal',
  province: 'Davao del Norte',
  category: 'nature',
  status: 'available',
  summary: 'A Guinness-recognized Geoffrey\'s rousette bat colony on Samal Island.',
  description: 'The Monfort Bat Sanctuary is associated with the Guinness-recognized colony of Geoffrey\'s rousette fruit bats on Samal Island. This pack stores source-reviewed identity context, wildlife-etiquette reminders, mapped orientation points, and a planning-only path suggestion without assuming current visitor schedules, fees, accessibility, or guide procedure.',
  highlights: ['Guinness-recognized Geoffrey\'s rousette colony', 'Wildlife-etiquette and conservation reminders', 'Mapped sanctuary orientation points', 'Planning-only path sequence with current procedures left to staff confirmation'],
  navigation: {
    label: 'Monfort Bat Sanctuary',
    query: 'Monfort Bat Sanctuary, Samal, Davao del Norte, Philippines',
    note: 'Live directions use the mapped sanctuary in Tambo, Babak District.'
  },
  photos: [{
    key: 'monfort-bats',
    alt: 'Fruit bat colony inside Monfort Bat Sanctuary',
    credit: 'Ranieljosecastaneda · CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fruit_Bat_of_Samal_Island.jpg'
  }],
  coverTheme: {
    from: '#14532D',
    to: '#1F7A43',
    icon: 'paw'
  },
  featured: false
}, {
  id: 'tagum',
  name: 'Tagum City',
  aliases: ['City of Tagum', 'Tagum'],
  area: 'Tagum City',
  municipality: 'Tagum',
  province: 'Davao del Norte',
  category: 'city',
  status: 'available',
  summary: 'City landmarks, public spaces, markets, and an offline planning route.',
  description: 'Tagum is the provincial capital of Davao del Norte and the pack centers on selected city landmarks including Christ the King Cathedral, public spaces, market orientation, and regional transport points. The suggested city route is planning-only and current operating or transport details remain subject to confirmation.',
  highlights: ['Christ the King Cathedral and selected city landmarks', 'Planning-only city-center route sequence', 'Market and terminal orientation points', 'Offline notes with time-sensitive details clearly qualified'],
  navigation: {
    label: 'Christ the King Cathedral, Tagum',
    query: 'Christ the King Cathedral, Tagum, Davao del Norte, Philippines',
    note: 'The cathedral is a practical starting point for the Tagum city guide.'
  },
  photos: [{
    key: 'tagum-cathedral',
    alt: 'Christ the King Cathedral in Tagum City',
    credit: 'S5switch · CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Christ_The_King_Cathedral_Tagum.jpg'
  }],
  coverTheme: {
    from: '#0F4C46',
    to: '#14866D',
    icon: 'business'
  },
  featured: true
}, {
  id: 'panabo',
  name: 'Panabo City',
  aliases: ['City of Panabo', 'Panabo'],
  area: 'Panabo City',
  municipality: 'Panabo',
  province: 'Davao del Norte',
  category: 'nature',
  status: 'available',
  summary: 'J.P. Laurel mangrove attraction with source-matched offline boardwalk navigation.',
  description: 'Panabo City sources document a mangrove attraction in Barangay J.P. Laurel. Historical official pages describe the boardwalk differently, so LakBai limits navigation to an independently source-matched OpenStreetMap segment and leaves current facility extent, hours, fees, and access conditions unclaimed.',
  highlights: ['J.P. Laurel mangrove attraction', 'In-app GPS navigation on a source-matched mapped segment', 'Offline MapLibre basemap and route progress', 'Transparent online-source provenance and current-condition caveats'],
  navigation: {
    label: 'J.P. Laurel Mangrove Reforestation Area',
    query: 'J.P. Laurel Mangrove Reforestation Area, Panabo City, Davao del Norte, Philippines',
    note: 'LakBai supports offline walking and driving on mapped mainland roads. External Maps remains optional for road-arrival comparison.'
  },
  offlineNavigation: {
    graphId: 'panabo-routing-pilot',
    mode: 'walk',
    coverage: 'Central/coastal Panabo pilot',
    previewStart: {
      lat: 7.2999,
      lng: 125.6807
    },
    target: {
      label: 'Panabo Mangrove Park',
      lat: 7.272383,
      lng: 125.680829
    }
  },
  photos: [{
    key: 'panabo-city',
    alt: 'A main road through Panabo City',
    credit: 'Choy4311 · CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Panabo_City_pic_1.jpg'
  }],
  coverTheme: {
    from: '#0D5C3F',
    to: '#2E9E68',
    icon: 'leaf'
  },
  featured: false
}, {
  id: 'kapalong',
  name: 'Kapalong Nature Pack',
  area: 'Kapalong',
  municipality: 'Kapalong',
  province: 'Davao del Norte',
  category: 'nature',
  status: 'coming-soon',
  summary: 'Highland outdoor destinations and preparation notes for nature trips.',
  description: 'The Kapalong highlands are being prepared as a curated nature pack covering outdoor destinations and travel preparation notes. Check back once the pack is published.',
  highlights: [],
  coverTheme: {
    from: '#1E4D3B',
    to: '#33705B',
    icon: 'trail-sign'
  },
  featured: false
}, {
  id: 'san-isidro',
  name: 'San Isidro Trail Pack',
  area: 'San Isidro',
  municipality: 'San Isidro',
  province: 'Davao del Norte',
  category: 'adventure',
  status: 'coming-soon',
  summary: 'Compact trail references and offline-ready local destination information.',
  description: 'The San Isidro trail pack is still being curated. It will remain coming-soon until trail references and visitor information complete LakBai’s source-review process.',
  highlights: [],
  coverTheme: {
    from: '#173F2B',
    to: '#2C6E49',
    icon: 'trail-sign'
  },
  featured: false
}];
