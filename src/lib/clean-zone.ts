/**
 * The Clean Zone — curated log of the areas our tree guard initiative has
 * renovated. Locations are grouped into named zones: a cluster of nearby
 * tree beds the org has worked on reads as one shaded area on the map, so
 * the page scales as the initiative grows instead of turning into a long
 * list of individual pins.
 *
 * This is Trash Talk NYC's own list, not a city dataset. Growing it never
 * needs a code change:
 *   - new tree bed in an existing zone → append to that zone's `beds`
 *   - new area of the city           → append a new zone
 *
 * Getting coordinates: geocode the address with NYC Planning's GeoSearch
 * API (free, no key), e.g.
 *   curl 'https://geosearch.planninglabs.nyc/v2/search?text=708 West 171st Street, Manhattan'
 * and copy lat/lng from the top result's geometry.
 *
 * `nycTreeIds` cross-references NYC Parks' live Forestry Tree Points
 * dataset (https://data.cityofnewyork.us/resource/hn5i-inap.json, the data
 * behind tree-map.nycgovparks.org); look up a bed's tree points with
 *   curl '.../hn5i-inap.json?$where=within_circle(location,<lat>,<lng>,15)'
 * It is optional, display-only detail — never block adding a bed on it.
 */

export interface TreeBed {
  /** Stable slug, unique across all zones. */
  id: string;
  /** Street address label shown in zone details (same in EN/ES). */
  address: string;
  lat: number;
  lng: number;
  /** Optional NYC Parks Forestry tree-point objectids at this bed. */
  nycTreeIds?: string[];
}

export interface CleanZone {
  /** Stable slug used to wire log cards to their shaded area on the map. */
  id: string;
  nameEn: string;
  nameEs: string;
  neighborhood: string;
  borough: string;
  /** Display date for when the zone's beds were guarded. */
  dateEn: string;
  dateEs: string;
  descriptionEn: string;
  descriptionEs: string;
  /**
   * Optional hand-traced outline ([lat, lng] vertices) for zones whose
   * shape should follow specific streets. When omitted — the usual case —
   * the map shades a circle sized to the zone's beds (see zoneCircle).
   */
  outline?: [number, number][];
  beds: TreeBed[];
}

export const cleanZones: CleanZone[] = [
  {
    id: 'w-171st',
    nameEn: 'W 171st St Block',
    nameEs: 'Cuadra de W 171st St',
    neighborhood: 'Washington Heights',
    borough: 'Manhattan',
    dateEn: '2026',
    dateEs: '2026',
    descriptionEn:
      'The first zone in the Clean Zone. The tree beds on the block of 708 W 171st St got the full treatment — cleaned out, soil turned, and new guards installed to keep trash out and let the street trees breathe.',
    descriptionEs:
      'La primera zona de la Zona Limpia. Los alcorques de la cuadra del 708 W 171st St recibieron el tratamiento completo: limpieza a fondo, tierra renovada y protectores nuevos que mantienen fuera la basura y dejan respirar a los árboles.',
    beds: [
      {
        id: 'w-171st-708',
        address: '708 W 171st St',
        lat: 40.84416,
        lng: -73.942081,
      },
    ],
  },
];

/** Shaded-circle geometry for a zone without a hand-traced outline. */
export interface ZoneCircle {
  lat: number;
  lng: number;
  radiusMeters: number;
}

/* A zone with a single bed still needs to read as an area, so the circle
   never shrinks below roughly a block face; the padding keeps outer beds
   inside the shading rather than on its edge. */
const MIN_RADIUS_METERS = 90;
const EDGE_PADDING_METERS = 45;

const EARTH_RADIUS_METERS = 6371000;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Circle covering all of a zone's beds: centered on their centroid, radius
 * spanning the farthest bed plus padding, floored at a block-scale minimum.
 * Returns null for a zone with no beds (nothing to shade).
 */
export function zoneCircle(zone: CleanZone): ZoneCircle | null {
  if (zone.beds.length === 0) return null;

  const lat = zone.beds.reduce((sum, b) => sum + b.lat, 0) / zone.beds.length;
  const lng = zone.beds.reduce((sum, b) => sum + b.lng, 0) / zone.beds.length;

  const spread = Math.max(...zone.beds.map((b) => haversineMeters(lat, lng, b.lat, b.lng)));

  return { lat, lng, radiusMeters: Math.max(MIN_RADIUS_METERS, spread + EDGE_PADDING_METERS) };
}

export function totalBedCount(zones: CleanZone[]): number {
  return zones.reduce((sum, z) => sum + z.beds.length, 0);
}
