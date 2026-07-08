/**
 * The Clean Zone — curated log of the tree beds our tree guard initiative
 * has renovated ("guarded"). This is Trash Talk NYC's own list, not a city
 * dataset: append an entry here whenever a new block is finished and the
 * map + field log pick it up automatically.
 *
 * Getting coordinates: geocode the address with NYC Planning's GeoSearch
 * API (free, no key), e.g.
 *   curl 'https://geosearch.planninglabs.nyc/v2/search?text=708 West 171st Street, Manhattan'
 * and copy lat/lng from the top result's geometry.
 *
 * `nycTreeIds` cross-references NYC Parks' live Forestry Tree Points
 * dataset (https://data.cityofnewyork.us/resource/hn5i-inap.json, the data
 * behind tree-map.nycgovparks.org). It is optional, display-only detail —
 * never block adding a site on it.
 */

export interface GuardedSite {
  /** Stable slug used to wire list cards to their map marker. */
  id: string;
  /** Street address label shown on cards and popups (same in EN/ES). */
  address: string;
  neighborhood: string;
  borough: string;
  lat: number;
  lng: number;
  /** Display date for when the block was guarded. */
  dateEn: string;
  dateEs: string;
  descriptionEn: string;
  descriptionEs: string;
  /** Optional NYC Parks Forestry tree-point objectids on this block. */
  nycTreeIds?: string[];
}

export const guardedSites: GuardedSite[] = [
  {
    id: 'w-171st-708',
    address: '708 W 171st St',
    neighborhood: 'Washington Heights',
    borough: 'Manhattan',
    lat: 40.84416,
    lng: -73.942081,
    dateEn: '2026',
    dateEs: '2026',
    descriptionEn:
      'The first block in the Clean Zone. The tree beds on the block of 708 W 171st St got the full treatment — cleaned out, soil turned, and new guards installed to keep trash out and let the street trees breathe.',
    descriptionEs:
      'La primera cuadra de la Zona Limpia. Los alcorques de la cuadra del 708 W 171st St recibieron el tratamiento completo: limpieza a fondo, tierra renovada y protectores nuevos que mantienen fuera la basura y dejan respirar a los árboles.',
  },
];
