export type DestinationCategory = 'island' | 'city' | 'nature' | 'adventure';

export type DestinationPack = {
  id: string;
  name: string;
  area: string;
  municipality: string;
  summary: string;
  category: DestinationCategory;
  status: 'available' | 'coming-soon';
  sizeLabel: string;
  spots: number;
  trails: number;
  featured?: boolean;
  downloaded?: boolean;
};

export const destinationPacks: DestinationPack[] = [
  {
    id: 'samal',
    name: 'Samal Island Pack',
    area: 'Island Garden City of Samal',
    municipality: 'Samal',
    summary: 'Beaches, nature stops, local trails, and essential offline travel notes.',
    category: 'island',
    status: 'available',
    sizeLabel: '42 MB',
    spots: 12,
    trails: 4,
    featured: true,
    downloaded: true,
  },
  {
    id: 'tagum',
    name: 'Tagum City Pack',
    area: 'Tagum City',
    municipality: 'Tagum',
    summary: 'City attractions, parks, visitor stops, and local orientation information.',
    category: 'city',
    status: 'available',
    sizeLabel: '28 MB',
    spots: 9,
    trails: 2,
    featured: true,
  },
  {
    id: 'kapalong',
    name: 'Kapalong Nature Pack',
    area: 'Kapalong',
    municipality: 'Kapalong',
    summary: 'Selected outdoor destinations and preparation notes for nature trips.',
    category: 'nature',
    status: 'coming-soon',
    sizeLabel: '—',
    spots: 6,
    trails: 3,
    featured: true,
  },
  {
    id: 'san-isidro',
    name: 'San Isidro Trail Pack',
    area: 'San Isidro',
    municipality: 'San Isidro',
    summary: 'Compact trail references and offline-ready local destination information.',
    category: 'adventure',
    status: 'coming-soon',
    sizeLabel: '—',
    spots: 5,
    trails: 3,
  },
];

export const destinationCategories: Array<{ key: 'all' | DestinationCategory; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'island', label: 'Island' },
  { key: 'city', label: 'City' },
  { key: 'nature', label: 'Nature' },
  { key: 'adventure', label: 'Adventure' },
];
