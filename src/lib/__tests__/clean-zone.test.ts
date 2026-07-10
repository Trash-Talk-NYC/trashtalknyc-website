import { describe, expect, it } from 'vitest';
import { cleanZones, totalBedCount, zoneCircle, type CleanZone } from '../clean-zone';

function zoneWith(beds: CleanZone['beds']): CleanZone {
  return {
    id: 'test-zone',
    nameEn: 'Test Zone',
    nameEs: 'Zona de Prueba',
    neighborhood: 'Washington Heights',
    borough: 'Manhattan',
    dateEn: '2026',
    dateEs: '2026',
    descriptionEn: 'desc',
    descriptionEs: 'desc',
    beds,
  };
}

describe('zoneCircle', () => {
  it('returns null for a zone with no beds', () => {
    expect(zoneCircle(zoneWith([]))).toBeNull();
  });

  it('centers a single-bed zone on the bed with the block-scale minimum radius', () => {
    const circle = zoneCircle(
      zoneWith([{ id: 'a', address: '708 W 171st St', lat: 40.84416, lng: -73.942081 }]),
    );
    expect(circle).not.toBeNull();
    expect(circle!.lat).toBeCloseTo(40.84416, 6);
    expect(circle!.lng).toBeCloseTo(-73.942081, 6);
    expect(circle!.radiusMeters).toBe(90);
  });

  it('covers every bed of a multi-bed zone inside the radius', () => {
    // Two beds ~250m apart along W 171st St
    const beds = [
      { id: 'a', address: 'west end', lat: 40.84416, lng: -73.942081 },
      { id: 'b', address: 'east end', lat: 40.8434, lng: -73.9394 },
    ];
    const circle = zoneCircle(zoneWith(beds));
    expect(circle).not.toBeNull();
    // Centroid sits between the beds…
    expect(circle!.lat).toBeCloseTo((beds[0].lat + beds[1].lat) / 2, 6);
    expect(circle!.lng).toBeCloseTo((beds[0].lng + beds[1].lng) / 2, 6);
    // …and the radius exceeds the centroid→farthest-bed distance (~120m),
    // so no bed lands outside the shading.
    expect(circle!.radiusMeters).toBeGreaterThan(120);
    expect(circle!.radiusMeters).toBeLessThan(300);
  });
});

describe('cleanZones data', () => {
  it('has globally unique zone and bed ids', () => {
    const zoneIds = cleanZones.map((z) => z.id);
    expect(new Set(zoneIds).size).toBe(zoneIds.length);

    const bedIds = cleanZones.flatMap((z) => z.beds.map((b) => b.id));
    expect(new Set(bedIds).size).toBe(bedIds.length);
  });

  it('every zone has at least one bed with NYC-plausible coordinates', () => {
    expect(cleanZones.length).toBeGreaterThan(0);
    for (const zone of cleanZones) {
      expect(zone.beds.length).toBeGreaterThan(0);
      for (const bed of zone.beds) {
        expect(bed.lat).toBeGreaterThan(40.4);
        expect(bed.lat).toBeLessThan(41.0);
        expect(bed.lng).toBeGreaterThan(-74.3);
        expect(bed.lng).toBeLessThan(-73.6);
      }
    }
  });

  it('counts beds across zones', () => {
    expect(totalBedCount(cleanZones)).toBe(
      cleanZones.reduce((sum, z) => sum + z.beds.length, 0),
    );
  });
});
