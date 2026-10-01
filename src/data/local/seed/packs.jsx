// Full destination content bundled with the application.
// Trail geometry uses GeoJSON [lng, lat] positions.

const NATIONAL_EMERGENCY_CONTACT = {
  label: 'National Emergency Hotline',
  phone: '911',
  note: 'Use 911 for emergencies. Local agency numbers are withheld until they are reverified.',
  verified: true,
  verifiedAt: '2026-09-27',
  sourceLabel: 'Department of the Interior and Local Government · Unified 911'
};

export const packs = [{
  id: 'samal',
  version: 8,
  updatedAt: '2026-09-29T00:00:00.000Z',
  trails: [{
    id: 'samal-kaputian-coastal',
    name: 'Kaputian Coastal Trail',
    difficulty: 'easy',
    distanceKm: 2.4,
    durationMin: 55,
    elevationGainM: 40,
    description: 'Suggested shoreline walk near Kaputian. This path is not verified for turn-by-turn navigation; follow local signs and current access conditions on site.',
    start: {
      name: 'Kaputian Wharf',
      lat: 6.9888,
      lng: 125.7162
    },
    geometry: {
      type: 'LineString',
      coordinates: [[125.7162, 6.9888], [125.7178, 6.9881], [125.7196, 6.9876], [125.7213, 6.987], [125.7228, 6.9863], [125.7243, 6.9855], [125.7258, 6.9849], [125.7271, 6.9842]]
    },
    waypoints: [{
      id: 'wp-kap-wharf',
      name: 'Kaputian Wharf',
      type: 'start',
      lat: 6.9888,
      lng: 125.7162,
      note: 'Boats to Talikud Island and pumpboat rentals are arranged here.'
    }, {
      id: 'wp-kap-beach',
      name: 'Kaputian Public Beach',
      type: 'poi',
      lat: 6.987,
      lng: 125.7213,
      note: 'Cottages for rent; buy water and snacks at the small stores before continuing.'
    }, {
      id: 'wp-kap-sunset',
      name: 'Sunset Point',
      type: 'end',
      lat: 6.9842,
      lng: 125.7271,
      note: 'Open west-facing shore. Head back before dusk; the return has no lighting.'
    }]
  }],
  spots: [{
    id: 'spot-samal-ferry',
    name: 'Port of Babak',
    aliases: ['Babak Port', 'Babak Ferry Port'],
    category: 'transport',
    lat: 7.1336203,
    lng: 125.6847488,
    description: 'Samal-side ferry gateway in Babak for passengers and vehicles arriving from Davao City.',
    tip: 'Confirm the current return schedule at the port before continuing around the island.'
  }, {
    id: 'spot-samal-kaputian',
    name: 'Kaputian Beach Park',
    category: 'beach',
    lat: 6.987,
    lng: 125.7213,
    description: 'Public beach destination listed within Samal tourism context.',
    tip: 'Confirm current entrance, cottage, payment, and operating arrangements locally before visiting.'
  }, {
    id: 'spot-samal-vanishing',
    name: 'Vanishing Island Sandbar',
    category: 'island',
    lat: 7.0936,
    lng: 125.6803,
    description: 'A tidal sandbar attraction associated with the channel between Samal and the mainland.',
    tip: 'Tide, boat access, weather, and return arrangements can change; confirm them with a current local operator.'
  }, {
    id: 'spot-samal-talikud',
    name: 'Talikud Island (Santiago Bay)',
    category: 'island',
    lat: 6.9667,
    lng: 125.65,
    description: 'Island destination across from the Kaputian area with coastal recreation associated with local tourism.',
    tip: 'Confirm current boat departure points, weather limits, and visitor arrangements before leaving.'
  }, {
    id: 'spot-samal-plaza',
    name: 'Peñaplata Public Plaza and Market',
    category: 'town',
    lat: 7.1072,
    lng: 125.6903,
    description: 'The island\'s commercial center with the public market, pharmacies, and transport hub.',
    tip: 'Stock up on supplies here before heading to beaches or trailheads.'
  }, {
    id: 'spot-samal-chipps',
    name: 'Samal-Cagos Island Jump-off',
    category: 'transport',
    lat: 7.1216,
    lng: 125.6849,
    description: 'Road junction near Babak used as an orientation point for local connections.',
    tip: 'Confirm current transport availability and fares at the time of travel.'
  }, {
    id: 'spot-samal-resort',
    name: 'Isla Reta Beach Area',
    category: 'beach',
    lat: 6.9561,
    lng: 125.6753,
    description: 'Beach area on Talikud Island associated with coastal recreation and overnight stays.',
    tip: 'Confirm current access, accommodation, fees, and overnight policies directly with the operator.'
  }, {
    id: 'spot-samal-viewdeck',
    name: 'Babak Coastal Viewdeck',
    category: 'viewpoint',
    lat: 7.1203,
    lng: 125.6699,
    description: 'Coastal viewpoint near Babak suited to a short scenic stop.',
    tip: 'Treat roadside access and stopping safety as conditions to confirm on site.'
  }],
  transport: {
    gettingThere: ['Samal is reached from the Davao side through ferry/boat connections serving the island.', 'Vehicle and passenger arrangements, terminal use, fares, and schedules can change; confirm the current crossing at the port before travel.', 'Local road transport options vary by area and time of day.'],
    gettingAround: ['Use the local road network and confirm current public-transport or hired-vehicle availability for the part of the island you plan to visit.', 'Allow extra time for weather, ferry queues, road works, and local access conditions.'],
    localTips: ['Confirm return-crossing arrangements before traveling far from your arrival port.']
  },
  safety: {
    reminders: ['Confirm current return-crossing arrangements before traveling far from your arrival port.', 'Use sun protection and footwear suitable for the conditions you actually encounter.', 'Share your day plan with someone you trust when visiting less-connected areas.', 'Follow current marine-weather and boat-operator safety guidance.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: []
  }
}, {
  id: 'hagimit-falls',
  version: 6,
  updatedAt: '2026-09-29T00:00:00.000Z',
  trails: [{
    id: 'hagimit-nature-trail',
    name: 'Hagimit Falls Nature Trail',
    difficulty: 'easy',
    distanceKm: 1.4,
    durationMin: 40,
    elevationGainM: 60,
    description: 'Suggested walking loop around the Hagimit Falls area. The path is not verified for turn-by-turn navigation; follow current site paths, barriers, and staff guidance.',
    start: {
      name: 'Trailhead Entrance',
      lat: 7.1172,
      lng: 125.6965
    },
    geometry: {
      type: 'LineString',
      coordinates: [[125.6965, 7.1172], [125.6972, 7.1168], [125.6979, 7.1166], [125.6987, 7.1164], [125.6994, 7.1166], [125.7001, 7.1169], [125.7006, 7.1174], [125.7004, 7.1181], [125.6997, 7.1184], [125.6989, 7.1183], [125.6981, 7.118], [125.6974, 7.1177], [125.6965, 7.1172]]
    },
    waypoints: [{
      id: 'wp-hag-entrance',
      name: 'Trailhead Entrance',
      type: 'start',
      lat: 7.1172,
      lng: 125.6965,
      note: 'Approximate starting point. Confirm the current visitor entrance and registration procedure on arrival.'
    }, {
      id: 'wp-hag-first',
      name: 'First Falls Pool',
      type: 'poi',
      lat: 7.1164,
      lng: 125.6987,
      note: 'Check current water depth, current, and posted swimming guidance before entering the pool.'
    }, {
      id: 'wp-hag-second',
      name: 'Second Falls',
      type: 'poi',
      lat: 7.1181,
      lng: 125.7004,
      note: 'Follow current barriers, staff instructions, and posted water-safety guidance.'
    }, {
      id: 'wp-hag-deck',
      name: 'Upper View Deck',
      type: 'end',
      lat: 7.1184,
      lng: 125.6997,
      note: 'Best angle over the cascades; loop back down to the entrance from here.'
    }]
  }],
  spots: [{
    id: 'spot-hag-entrance',
    name: 'Hagimit Entrance Gate',
    category: 'facility',
    lat: 7.1172,
    lng: 125.6965,
    description: 'Approximate visitor entrance for Hagimit Falls Nature Park.',
    tip: 'Confirm current ticketing, hours, fees, cottage availability, and entrance procedure locally.'
  }, {
    id: 'spot-hag-store',
    name: 'Falls Road Sari-sari Cluster',
    category: 'town',
    lat: 7.1201,
    lng: 125.6921,
    description: 'Roadside cluster near the approach to Hagimit Falls.',
    tip: 'Vendors, supplies, rentals, and opening times can change; confirm what is available on arrival.'
  }, {
    id: 'spot-hag-habal',
    name: 'Habal-habal Waiting Shed',
    category: 'transport',
    lat: 7.1152,
    lng: 125.7008,
    description: 'Roadside waiting-shed location near the Hagimit Falls area.',
    tip: 'Do not rely on transport being available here; arrange and confirm current pickup options separately.'
  }],
  transport: {
    gettingThere: ['Reach Samal using the current ferry or boat arrangement, then confirm the local road connection and visitor entrance for Hagimit Falls.', 'Fares, schedules, road conditions, and final access procedures can change.'],
    gettingAround: ['Follow posted site paths, barriers, and staff instructions.'],
    localTips: ['Check weather and local access conditions before the visit.', 'Protect phones and valuables from water and humidity around the falls.']
  },
  safety: {
    reminders: ['Avoid entering the water when weather, current, visibility, or site guidance indicates unsafe conditions.', 'Keep children closely supervised around moving water and follow current site barriers.', 'Plan enough daylight for the visit unless the attraction explicitly provides and permits after-dark access.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: []
  }
}, {
  id: 'monfort-bat-sanctuary',
  version: 5,
  updatedAt: '2026-09-29T00:00:00.000Z',
  trails: [{
    id: 'monfort-sanctuary-path',
    name: 'Sanctuary Wildlife Path',
    difficulty: 'easy',
    distanceKm: 0.8,
    durationMin: 25,
    elevationGainM: 15,
    description: 'Suggested walking path around the sanctuary area. It is not verified for turn-by-turn navigation; follow sanctuary staff, barriers, and current visitor procedures.',
    start: {
      name: 'Visitor Center',
      lat: 7.1259,
      lng: 125.6776
    },
    geometry: {
      type: 'LineString',
      coordinates: [[125.6776, 7.1259], [125.6782, 7.1264], [125.6788, 7.1269], [125.6793, 7.1274], [125.6796, 7.1281], [125.6792, 7.1287], [125.6785, 7.1289], [125.6779, 7.1285], [125.6775, 7.1279], [125.6772, 7.1272], [125.6776, 7.1259]]
    },
    waypoints: [{
      id: 'wp-mon-center',
      name: 'Visitor Center',
      type: 'start',
      lat: 7.1259,
      lng: 125.6776,
      note: 'Approximate starting point. Confirm registration, fees, briefing, and visitor procedures with sanctuary staff.'
    }, {
      id: 'wp-mon-deck',
      name: 'Main Cave Viewdeck',
      type: 'poi',
      lat: 7.1281,
      lng: 125.6796,
      note: 'Keep voices low; the colony is sensitive to noise near the cave mouth.'
    }, {
      id: 'wp-mon-guide',
      name: 'Guide Station',
      type: 'end',
      lat: 7.1272,
      lng: 125.6772,
      note: 'Return point for the closing questions with your guide.'
    }]
  }],
  spots: [{
    id: 'spot-mon-center',
    name: 'Sanctuary Visitor Center',
    category: 'facility',
    lat: 7.1259,
    lng: 125.6776,
    description: 'Visitor-center area used for arrival, registration, and orientation at the sanctuary.',
    tip: 'Confirm current registration, viewing rules, fees, schedules, and group procedures directly with sanctuary staff.'
  }, {
    id: 'spot-mon-cave',
    name: 'Monfort Cave Complex',
    category: 'attraction',
    lat: 7.1281,
    lng: 125.6796,
    description: 'Protected cave network hosting millions of Geoffrey\'s rousette fruit bats.',
    tip: 'Follow the sanctuary’s current posted wildlife, photography, noise, and access rules.'
  }, {
    id: 'spot-mon-entrance',
    name: 'Sanctuary Gate Road Junction',
    category: 'transport',
    lat: 7.1236,
    lng: 125.6752,
    description: 'Road junction near the sanctuary entrance.',
    tip: 'Confirm current transport availability and pickup arrangements before relying on this point.'
  }],
  transport: {
    gettingThere: ['Use the Samal road network from your arrival area and confirm the current route, drop-off, and local transport arrangement to the sanctuary.', 'Transport fares, visitor schedules, and same-day access can change.'],
    gettingAround: ['Follow sanctuary staff, signs, barriers, and current visitor rules.'],
    localTips: ['Keep wildlife disturbance low and follow current sanctuary instructions.', 'Bring suitable sun/rain protection for outdoor portions of the visit.']
  },
  safety: {
    reminders: ['Follow current sanctuary staff instructions, barriers, and wildlife-distance rules.', 'Do not handle wildlife or enter restricted cave areas.', 'Use normal hand hygiene after contact with outdoor wildlife environments.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: []
  }
}, {
  id: 'tagum',
  version: 6,
  updatedAt: '2026-09-29T00:00:00.000Z',
  trails: [{
    id: 'tagum-heritage-walk',
    name: 'Tagum Heritage Walk',
    difficulty: 'easy',
    distanceKm: 2.1,
    durationMin: 50,
    elevationGainM: 10,
    description: 'Suggested city-center walk connecting major Tagum landmarks. The full pedestrian path, crossings, temporary closures, accessibility, and walking time are not verified for turn-by-turn navigation.',
    start: {
      name: 'Christ the King Cathedral',
      lat: 7.4477,
      lng: 125.8071
    },
    geometry: {
      type: 'LineString',
      coordinates: [[125.805, 7.4452], [125.8058, 7.446], [125.8066, 7.4468], [125.8071, 7.4477], [125.8073, 7.4487], [125.8072, 7.4496], [125.8065, 7.4503], [125.8056, 7.4507], [125.8048, 7.4505], [125.8044, 7.4496], [125.8045, 7.4486], [125.8047, 7.4476], [125.8049, 7.4464]]
    },
    waypoints: [{
      id: 'wp-tag-cathedral',
      name: 'Christ the King Cathedral',
      type: 'start',
      lat: 7.4477,
      lng: 125.8071,
      note: 'The golden-spired cathedral anchors the walk; visit outside mass hours for interiors.'
    }, {
      id: 'wp-tag-freedom',
      name: 'Freedom Park',
      type: 'poi',
      lat: 7.4496,
      lng: 125.8072,
      note: 'City plaza with evening food stalls and event stages.'
    }, {
      id: 'wp-tag-trade',
      name: 'Tagum Trade Center',
      type: 'poi',
      lat: 7.4505,
      lng: 125.8056,
      note: 'Market complex for pasalubong and local produce.'
    }, {
      id: 'wp-tag-hall',
      name: 'New City Hall Grounds',
      type: 'end',
      lat: 7.4452,
      lng: 125.805,
      note: 'Landscaped government grounds; loop closes back toward the cathedral.'
    }]
  }],
  spots: [{
    id: 'spot-tag-cathedral',
    name: 'Christ the King Cathedral',
    aliases: ['Tagum Cathedral', 'Christ the King Cathedral Tagum'],
    category: 'landmark',
    lat: 7.4477,
    lng: 125.8071,
    description: 'Tagum\'s landmark cathedral with a golden dome and spire visible across the city.',
    tip: 'Evening light gives the best photos from the plaza side.'
  }, {
    id: 'spot-tag-freedom',
    name: 'Freedom Park',
    category: 'park',
    lat: 7.4496,
    lng: 125.8072,
    description: 'Central plaza hosting city events, the Musikahan festival stage, and night markets.',
    tip: 'Event use and vendor activity change; check the current city schedule when planning around the park.'
  }, {
    id: 'spot-tag-trade',
    name: 'Tagum Trade Center',
    category: 'market',
    lat: 7.4505,
    lng: 125.8056,
    description: 'Public market and trade complex covering wet goods, textiles, and delicacies.',
    tip: 'Market operating patterns can change; confirm current opening and activity locally.'
  }, {
    id: 'spot-tag-hall',
    name: 'New City Hall Grounds',
    category: 'landmark',
    lat: 7.4452,
    lng: 125.805,
    description: 'Modern government center with landscaped grounds and wide walkways.',
    tip: 'Public access can change around government activity and events; follow current site rules.'
  }, {
    id: 'spot-tag-terminal',
    name: 'Tagum Overseas Transport Terminal',
    category: 'transport',
    lat: 7.4436,
    lng: 125.8038,
    description: 'Regional transport terminal serving trips to and from Tagum.',
    tip: 'Routes, operators, loading areas, and departure times can change; verify them at the terminal.'
  }, {
    id: 'spot-tag-museum',
    name: 'Museyo Sukwahi',
    category: 'museum',
    lat: 7.4489,
    lng: 125.8045,
    description: 'Compact city museum covering Tagum history and festival memorabilia.',
    tip: 'Confirm current opening hours before visiting.'
  }],
  transport: {
    gettingThere: ['Tagum is served by regional road transport from Davao del Norte and neighboring areas.', 'Confirm the current operator, terminal, route, fare, and departure arrangement before travel.'],
    gettingAround: ['Use current local transport information and pedestrian conditions for the city area you plan to visit.', 'Temporary traffic management and event closures can affect routes around major city venues.'],
    localTips: ['Check current city advisories when traveling during major civic or cultural events.']
  },
  safety: {
    reminders: ['Keep personal belongings secure in crowded public areas.', 'Use marked pedestrian crossings and follow current traffic controls.', 'Confirm your return transport directly with the current operator or terminal before relying on a departure.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: []
  }
}, {
  id: 'panabo',
  version: 7,
  updatedAt: '2026-09-29T00:00:00.000Z',
  trails: [{
    id: 'panabo-mangrove-boardwalk',
    name: 'Panabo Mangrove Boardwalk — mapped segment',
    difficulty: 'easy',
    distanceKm: 0.214,
    durationMin: 12,
    elevationGainM: null,
    routeVerified: true,
    description: 'An approximately 214-meter mapped pedestrian segment inside Panabo Mangrove Park. It does not represent the full current boardwalk, whose published historical lengths differ.',
    start: {
      name: 'Mapped boardwalk segment start',
      lat: 7.2723324,
      lng: 125.6808807
    },
    verification: {
      label: 'Mapped Panabo Mangrove Park segment',
      verifiedAt: '2026-09-28',
      geometrySource: 'OpenStreetMap way 641690678 v2',
      geometryUrl: 'https://www.openstreetmap.org/way/641690678',
      officialSource: 'https://panabocity.gov.ph/panabo-mangrove-park-ecotourism-project-inaugurated/',
      license: 'OpenStreetMap data © OpenStreetMap contributors, ODbL 1.0',
      summary: 'This approximately 214-meter mapped segment matches the mangrove attraction in Panabo City sources and OpenStreetMap. It does not represent the full current boardwalk.'
    },
    geometry: {
      type: 'LineString',
      coordinates: [[125.6808807, 7.2723324], [125.681503, 7.2719787], [125.6816693, 7.2717925], [125.6810269, 7.2710674]]
    },
    waypoints: [{
      id: 'wp-pan-mapped-start',
      name: 'Mapped segment start',
      type: 'start',
      lat: 7.2723324,
      lng: 125.6808807,
      note: 'Begin only when you are physically at the park and local access is open.'
    }, {
      id: 'wp-pan-mapped-end',
      name: 'Mapped segment end',
      type: 'end',
      lat: 7.2710674,
      lng: 125.6810269,
      note: 'Mapped navigation ends here. Follow current local signs if you continue beyond this segment.'
    }]
  }],
  spots: [{
    id: 'spot-pan-entrance',
    name: 'Panabo Mangrove Park',
    aliases: ['J.P. Laurel Mangrove Reforestation Area', 'Panabo Mangrove Boardwalk'],
    category: 'park',
    lat: 7.272383,
    lng: 125.680829,
    description: 'Mangrove park in Barangay J.P. Laurel with a boardwalk area through the coastal mangrove environment.',
    tip: 'The trail navigator covers only the mapped 214-meter segment; follow local signs for the rest of the facility.'
  }, {
    id: 'spot-pan-park',
    name: 'Panabo City Park',
    category: 'park',
    lat: 7.3058,
    lng: 125.6809,
    description: 'Public park in central Panabo used as a city landmark and meeting point.',
    tip: 'Confirm current public-transport loading points and availability locally.'
  }, {
    id: 'spot-pan-market',
    name: 'Panabo Public Market',
    category: 'market',
    lat: 7.3048,
    lng: 125.6789,
    description: 'Panabo public market for local produce, goods, and everyday city activity.',
    tip: 'Vendor hours, supplies, and coastal-facility availability can change; confirm current conditions locally.'
  }],
  transport: {
    gettingThere: ['Panabo is served by the provincial road network; confirm the current local connection from the city area to Barangay J.P. Laurel before travel.', 'Transport operators, fares, schedules, and final approach conditions can change.'],
    gettingAround: ['At the mangrove attraction, follow current signs, barriers, caretaker instructions, and locally open sections of the boardwalk.', 'The mapped route covers only part of the facility; use local signs for areas beyond it.'],
    localTips: ['Tide, weather, maintenance, and temporary access conditions can change the experience.', 'Check current local conditions before traveling to the coastal site.']
  },
  safety: {
    reminders: ['Stay on locally open boardwalk sections and do not enter mangrove mudflats unless explicitly permitted and safe.', 'Use suitable sun and insect protection for coastal conditions.', 'If you encounter damaged or closed infrastructure, do not proceed and report the hazard locally.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: []
  }
}];
