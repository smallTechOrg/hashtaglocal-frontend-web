const MAPS_API_KEY = "AIzaSyCzJVwEPi_lq4CeiuafySI8-QKGEnDK3-o";

export interface LocationMetadata {
  city: string | null;
  name: string | null;
  region: string | null;
  street: string | null;
  country: string | null;
  district: string | null;
  timezone: null;
  sub_region: string | null;
  postal_code: string | null;
  neighborhood: string | null;
  premise_name: string | null;
  street_number: string | null;
  google_maps_data: {
    types: string[];
    location: { lat: number; lng: number };
    place_id: string;
    all_components: Record<string, string>;
    formatted_address: string;
  } | null;
  iso_country_code: string | null;
  formatted_address: string | null;
  point_of_interest: null;
  address_components: Record<string, string> | null;
  establishment_type: null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationMetadata | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    const result = data.results[0];
    const longNames: Record<string, string> = {};
    const shortNames: Record<string, string> = {};

    for (const comp of result.address_components as { long_name: string; short_name: string; types: string[] }[]) {
      for (const type of comp.types) {
        longNames[type] = comp.long_name;
        shortNames[type] = comp.short_name;
      }
    }

    const country = longNames["country"] ?? null;
    const isoCountryCode = shortNames["country"] ?? null;
    const region = longNames["administrative_area_level_1"] ?? null;
    const subRegion = longNames["administrative_area_level_2"] ?? null;
    const city = longNames["locality"] ?? null;
    const district = longNames["sublocality_level_1"] ?? longNames["sublocality"] ?? null;
    const neighborhood = longNames["neighborhood"] ?? null;
    const street = longNames["route"] ?? null;
    const streetNumber = longNames["street_number"] ?? null;
    const postalCode = longNames["postal_code"] ?? null;
    const premiseName = longNames["premise"] ?? null;

    const nameParts = [premiseName, district ?? city].filter(Boolean) as string[];
    const name = nameParts.length > 0 ? nameParts.join(" - ") : null;

    // Build all_components without plus_code (not useful for address display)
    const allComponents: Record<string, string> = {};
    for (const [key, val] of Object.entries(longNames)) {
      if (key !== "plus_code") allComponents[key] = val;
    }
    if (isoCountryCode) allComponents["country_code"] = isoCountryCode;

    const adm3 = longNames["administrative_area_level_3"] ?? null;

    // Build formatted_address from components (no country — the backend has no filter for it
    // and it makes the result vague). Region + postal code go at the end so the backend
    // strips them, leaving the meaningful intermediate parts.
    const addrParts: string[] = [];
    if (premiseName) addrParts.push(premiseName);
    if (streetNumber && street) addrParts.push(`${streetNumber} ${street}`);
    else if (street) addrParts.push(street);
    if (neighborhood) addrParts.push(neighborhood);
    if (district) addrParts.push(district);
    if (city && city !== district) addrParts.push(city);
    if (adm3 && adm3 !== city) addrParts.push(adm3);
    if (subRegion) addrParts.push(subRegion);
    if (region && postalCode) addrParts.push(`${region} ${postalCode}`);
    else if (region) addrParts.push(region);
    const formattedAddress = addrParts.join(", ");

    return {
      city,
      name,
      region,
      street,
      country,
      district,
      timezone: null,
      sub_region: subRegion,
      postal_code: postalCode,
      neighborhood,
      premise_name: premiseName,
      street_number: streetNumber,
      google_maps_data: {
        types: result.types ?? [],
        location: { lat, lng },
        place_id: result.place_id,
        all_components: allComponents,
        formatted_address: result.formatted_address,
      },
      iso_country_code: isoCountryCode,
      formatted_address: formattedAddress,
      point_of_interest: null,
      address_components: allComponents,
      establishment_type: null,
    };
  } catch {
    return null;
  }
}
