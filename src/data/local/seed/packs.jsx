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
  version: 7,
  updatedAt: '2026-09-28T08:00:00.000Z',
  trails: [{
    id: 'samal-kaputian-coastal',
    name: 'Kaputian Coastal Trail',
    difficulty: 'easy',
    distanceKm: 2.4,
    durationMin: 55,
    elevationGainM: 40,
    description: 'A relaxed shoreline walk connecting the Kaputian wharf to the quieter coves south of the barangay proper. Mostly sand and compact coral paths with views across to Talikud Island.',
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
    description: 'Public beach park with cottages, picnic huts, and a long shallow shoreline.',
    tip: 'Entrance is inexpensive; bring cash, the area has no reliable card payment.'
  }, {
    id: 'spot-samal-vanishing',
    name: 'Vanishing Island Sandbar',
    category: 'island',
    lat: 7.0936,
    lng: 125.6803,
    description: 'A tidal sandbar that appears at low tide between Samal and the mainland channel.',
    tip: 'Visit near low tide and hire a boat from Babak; check return timing with the boatman.'
  }, {
    id: 'spot-samal-talikud',
    name: 'Talikud Island (Santiago Bay)',
    category: 'island',
    lat: 6.9667,
    lng: 125.65,
    description: 'Quiet island across from Kaputian with white-sand coves and snorkeling areas.',
    tip: 'Day trips usually arrange boats through Kaputian wharf operators.'
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
    description: 'Barangay road junction where habal-habal drivers wait for falls and sanctuary trips.',
    tip: 'Agree on round-trip fare and waiting time before leaving.'
  }, {
    id: 'spot-samal-resort',
    name: 'Isla Reta Beach Area',
    category: 'beach',
    lat: 6.9561,
    lng: 125.6753,
    description: 'Long-established beach area on Talikud with open huts and camping spaces.',
    tip: 'Overnight stays should be arranged ahead of time with resort staff.'
  }, {
    id: 'spot-samal-viewdeck',
    name: 'Babak Coastal Viewdeck',
    category: 'viewpoint',
    lat: 7.1203,
    lng: 125.6699,
    description: 'Roadside viewpoint over the Davao Gulf with clear sunset angles.',
    tip: 'Quick stop on a habal-habal circuit; mind traffic on the narrow road.'
  }],
  transport: {
    gettingThere: ['From Davao City, take the Sasa ferry terminal barge or the Sta. Ana wharf fastcraft to Samal.', 'Barges carry vehicles; fastcraft are passengers only and cross more frequently.', 'Habal-habal (motorcycle taxi) stands at Peñaplata market and Babak junction cover most barangay roads.'],
    gettingAround: ['Single-cab multicabs and tricycles connect Peñaplata, Babak, and Kaputian on rough schedules.', 'For beaches and falls, hiring a habal-habal for a half-day circuit is the most practical option.', 'Roads are paved but narrow in sections; travel times grow quickly after rain.'],
    localTips: ['Signal is strong near the plaza but drops on coves and forested barangay roads.', 'Carry small bills; sari-sari stores and habal-habal drivers rarely keep change for large notes.', 'Save this pack to your library before leaving Davao City so it is easy to find during the trip.']
  },
  safety: {
    reminders: ['Confirm the last return ferry time before heading to southern coves.', 'Wear reef-safe sunscreen and footwear that handles coral rubble.', 'Tell your accommodation where your day route goes and when you expect to return.', 'Sea conditions change fast; agree on a cutoff time with boat operators.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: ['Peñaplata health center', 'Babak district hospital', 'Kaputian barangay station']
  }
}, {
  id: 'hagimit-falls',
  version: 5,
  updatedAt: '2026-09-28T08:00:00.000Z',
  trails: [{
    id: 'hagimit-nature-trail',
    name: 'Hagimit Falls Nature Trail',
    difficulty: 'easy',
    distanceKm: 1.4,
    durationMin: 40,
    elevationGainM: 60,
    description: 'A short loop linking the entrance cottages down through the falls levels and back via the upper view deck. Steps and handrails exist on the main line; side paths are root and rock.',
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
      note: 'Registration table and cottage assignments happen here.'
    }, {
      id: 'wp-hag-first',
      name: 'First Falls Pool',
      type: 'poi',
      lat: 7.1164,
      lng: 125.6987,
      note: 'Shallow family-friendly pool; depth markers are approximate after heavy rain.'
    }, {
      id: 'wp-hag-second',
      name: 'Second Falls',
      type: 'poi',
      lat: 7.1181,
      lng: 125.7004,
      note: 'Stronger current; stay behind the rope line when the water is brownish.'
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
    description: 'Ticketing, cottage rental, and basic store for the falls area.',
    tip: 'Cottages go fast on weekends; arrive before 9 AM.'
  }, {
    id: 'spot-hag-store',
    name: 'Falls Road Sari-sari Cluster',
    category: 'town',
    lat: 7.1201,
    lng: 125.6921,
    description: 'Small stores at the road junction selling water, snacks, and life-vest rentals.',
    tip: 'Rent vests here if you plan to swim with children.'
  }, {
    id: 'spot-hag-habal',
    name: 'Habal-habal Waiting Shed',
    category: 'transport',
    lat: 7.1152,
    lng: 125.7008,
    description: 'Motorcycle taxis wait near the upper road for the ride back to Peñaplata.',
    tip: 'Signal is weak in the falls hollow; agree on pickup time in advance.'
  }],
  transport: {
    gettingThere: ['Cross to Samal via the Sasa barge, then ride a habal-habal or single motorbike toward Peñaplata.', 'Ask for "Hagimit junction"; the falls are a few minutes downhill past the stores.'],
    gettingAround: ['The falls area is walkable; the trail connects the entrance, pools, and view deck.', 'Steps can be slippery; use the handrail line on the main path.'],
    localTips: ['Go on weekday mornings for the quietest pools.', 'Keep phone use to the cottages area; water and humidity claim careless devices.']
  },
  safety: {
    reminders: ['Do not swim directly after heavy rain; brown water means stronger undercurrents.', 'Watch children near the second falls; depths change quickly.', 'Leave before dusk; the trail has no lighting.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: ['Peñaplata health center', 'Falls entrance first-aid kit']
  }
}, {
  id: 'monfort-bat-sanctuary',
  version: 4,
  updatedAt: '2026-09-28T08:00:00.000Z',
  trails: [{
    id: 'monfort-sanctuary-path',
    name: 'Sanctuary Wildlife Path',
    difficulty: 'easy',
    distanceKm: 0.8,
    durationMin: 25,
    elevationGainM: 15,
    description: 'A short guided loop from the visitor center to the cave viewdecks and back. Guides lead every group; the path is shaded and mostly flat.',
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
      note: 'Pay fees, watch the intro talk, and get assigned a guide.'
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
    description: 'Registration, fees, and the conservation briefing for all visitors.',
    tip: 'Viewings run in small groups; mornings are calmest for the colony.'
  }, {
    id: 'spot-mon-cave',
    name: 'Monfort Cave Complex',
    category: 'attraction',
    lat: 7.1281,
    lng: 125.6796,
    description: 'Protected cave network hosting millions of Geoffrey\'s rousette fruit bats.',
    tip: 'No flash photography and no drones inside the sanctuary.'
  }, {
    id: 'spot-mon-entrance',
    name: 'Sanctuary Gate Road Junction',
    category: 'transport',
    lat: 7.1236,
    lng: 125.6752,
    description: 'Habal-habal drop-off point on the Babak road with the sanctuary signage.',
    tip: 'Arrange the return pickup when you arrive; waiting drivers are not always around.'
  }],
  transport: {
    gettingThere: ['From Babak proper, take a habal-habal north along the coastal road to the sanctuary junction.', 'Most island circuits combine the sanctuary with Hagimit Falls in one morning.'],
    gettingAround: ['All visits follow the guided path; independent exploration of the caves is prohibited.', 'The loop is stroller-friendly to the first viewdeck only.'],
    localTips: ['Bring a cap with a brim; the colony overhead can be messy.', 'Quiet groups see more natural behavior from the bats.']
  },
  safety: {
    reminders: ['Follow your guide\'s distance markers at all times near the caves.', 'Do not touch guano, cave walls, or fallen pups.', 'Sanitize hands after the visit; wildlife areas carry zoonotic risk.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: ['Babak district hospital', 'Sanctuary first-aid station']
  }
}, {
  id: 'tagum',
  version: 5,
  updatedAt: '2026-09-28T08:00:00.000Z',
  trails: [{
    id: 'tagum-heritage-walk',
    name: 'Tagum Heritage Walk',
    difficulty: 'easy',
    distanceKm: 2.1,
    durationMin: 50,
    elevationGainM: 10,
    description: 'A flat city-center loop connecting the golden cathedral, Freedom Park, the trade center, and the new city hall grounds. Best walked in the early morning or after 4 PM.',
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
    tip: 'Weeknights have the busiest food stall row.'
  }, {
    id: 'spot-tag-trade',
    name: 'Tagum Trade Center',
    category: 'market',
    lat: 7.4505,
    lng: 125.8056,
    description: 'Public market and trade complex covering wet goods, textiles, and delicacies.',
    tip: 'Visit mid-morning for the freshest produce selection.'
  }, {
    id: 'spot-tag-hall',
    name: 'New City Hall Grounds',
    category: 'landmark',
    lat: 7.4452,
    lng: 125.805,
    description: 'Modern government center with landscaped grounds and wide walkways.',
    tip: 'Quiet in the late afternoon; good rest stop on the loop.'
  }, {
    id: 'spot-tag-terminal',
    name: 'Tagum Overseas Transport Terminal',
    category: 'transport',
    lat: 7.4436,
    lng: 125.8038,
    description: 'Bus and van terminal for routes toward Davao City, Mati, and the Compostela Valley.',
    tip: 'Vans leave when full; buses run on fixed schedules.'
  }, {
    id: 'spot-tag-museum',
    name: 'Museyo Sukwahi',
    category: 'museum',
    lat: 7.4489,
    lng: 125.8045,
    description: 'Compact city museum covering Tagum history and festival memorabilia.',
    tip: 'Check opening days at the desk; hours change around city events.'
  }],
  transport: {
    gettingThere: ['Buses and vans run from Davao City\'s Ecoland/Overland terminals to Tagum on a fixed schedule.', 'From Panabo, multicabs and buses stop along the national highway and at the terminal.'],
    gettingAround: ['The city core is walkable; tricycles cover the wider barangays cheaply.', 'Jeepney routes radiate from the trade center area; confirm the destination sign before boarding.'],
    localTips: ['Signal is reliable citywide; offline packs still help for reading notes on the go.', 'Festival weeks ( Musikahan, Araw ng Tagum ) close several roads around Freedom Park.']
  },
  safety: {
    reminders: ['Keep bags zipped in market crowds.', 'Cross only at pedestrian lanes; traffic around the terminal is fast.', 'Save the terminal\'s last-bus time for your return leg.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: ['Tagum City Hospital', 'Davao Regional Medical Center (nearby)', 'Freedom Park police assistance desk']
  }
}, {
  id: 'panabo',
  version: 6,
  updatedAt: '2026-09-28T11:00:00.000Z',
  trails: [{
    id: 'panabo-mangrove-boardwalk',
    name: 'Panabo Mangrove Boardwalk — mapped segment',
    difficulty: 'easy',
    distanceKm: 0.214,
    durationMin: 12,
    elevationGainM: null,
    routeVerified: true,
    description: 'A verified pedestrian segment inside Panabo Mangrove Park. The City Government documents a 430-meter boardwalk at Barangay J.P. Laurel; LakBai currently navigates only the 214-meter segment mapped in OpenStreetMap and does not claim the remainder is GPS-verified.',
    start: {
      name: 'Mapped boardwalk segment start',
      lat: 7.2723324,
      lng: 125.6808807
    },
    verification: {
      label: 'Source-matched Panabo Mangrove Park segment',
      verifiedAt: '2026-09-28',
      geometrySource: 'OpenStreetMap way 641690678 v2',
      geometryUrl: 'https://www.openstreetmap.org/way/641690678',
      officialSource: 'https://panabocity.gov.ph/panabo-mangrove-park-ecotourism-project-inaugurated/',
      license: 'OpenStreetMap data © OpenStreetMap contributors, ODbL 1.0',
      summary: 'Panabo City confirms the boardwalk attraction in Barangay J.P. Laurel and reports a 430-meter boardwalk. The navigation line is limited to OpenStreetMap way 641690678, whose approximately 214-meter mapped geometry sits at the independently published Panabo Mangrove Park coordinates.'
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
      note: 'LakBai navigation stops here because the remaining boardwalk geometry has not been source-verified.'
    }]
  }],
  spots: [{
    id: 'spot-pan-entrance',
    name: 'Panabo Mangrove Park',
    aliases: ['J.P. Laurel Mangrove Reforestation Area', 'Panabo Mangrove Boardwalk'],
    category: 'park',
    lat: 7.272383,
    lng: 125.680829,
    description: 'Barangay J.P. Laurel mangrove park location cross-checked against published field research and Panabo City tourism material.',
    tip: 'The in-app trail navigator covers only the source-verified mapped segment; follow local signs for the rest of the facility.'
  }, {
    id: 'spot-pan-park',
    name: 'Panabo City Park',
    category: 'park',
    lat: 7.3058,
    lng: 125.6809,
    description: 'Central city park and common jeepney stop for coastal barangay rides.',
    tip: 'Motorcycles to the coast gather near the highway side.'
  }, {
    id: 'spot-pan-market',
    name: 'Panabo Public Market',
    category: 'market',
    lat: 7.3048,
    lng: 125.6789,
    description: 'City market for supplies before coastal trips.',
    tip: 'Buy drinking water here; stores near the boardwalk are limited.'
  }],
  transport: {
    gettingThere: ['From Davao City or Tagum, ride any Panabo-bound bus or van and alight at the city proper.', 'From the highway, hire a single motorcycle to the coastal barangay with the boardwalk.'],
    gettingAround: ['The boardwalk itself is the only path; wear shoes that tolerate mud on the approach road.', 'Habitual habal-habal drivers can wait or return for you; fix a time both ways.'],
    localTips: ['Check tide times the night before; high tide hides the mudflats that attract wading birds.', 'Mornings are cooler and the boardwalk is quietest then.']
  },
  safety: {
    reminders: ['Stay on the boardwalk; mangrove mud can trap footwear and legs.', 'Bring insect repellent, especially around dusk.', 'Mind loose planks after storms; report them to the caretaker.'],
    emergencyContacts: [NATIONAL_EMERGENCY_CONTACT],
    facilities: ['Panabo City Hospital', 'Barangay health station (coastal)']
  }
}];
