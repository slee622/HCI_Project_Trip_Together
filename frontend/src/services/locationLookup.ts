export interface ResolvedMapLocation {
  city: string;
  state: string;
}

function pickFirst(values: Array<string | undefined | null>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ResolvedMapLocation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', latitude.toString());
    url.searchParams.set('lon', longitude.toString());
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed: ${response.status}`);
    }

    const data: any = await response.json();
    const address = data?.address || {};

    const city = pickFirst([
      address.city,
      address.town,
      address.village,
      address.hamlet,
      address.municipality,
      address.county,
    ]);

    const state = pickFirst([
      address.state_code,
      address.state,
    ]) || '';

    if (!city) {
      return null;
    }

    return { city, state };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
