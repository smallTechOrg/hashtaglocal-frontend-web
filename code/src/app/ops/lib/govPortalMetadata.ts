import govPortalData from './govPortalMetadata.json';

export interface GovPortalLocalityMetadata {
  portals: string[];
  categories: string[];
  subcategories: Record<string, string[]>;
}

export const GOV_PORTAL_METADATA: Record<string, GovPortalLocalityMetadata> = govPortalData;

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getLocalityKeyFromHashtags(
  hashtags?: string[],
): string | undefined {
  if (!hashtags || hashtags.length === 0) {
    return undefined;
  }

  const knownKeys = Object.keys(GOV_PORTAL_METADATA);
  for (const rawTag of hashtags) {
    const tag = normalizeToken(rawTag);
    for (const key of knownKeys) {
      if (tag.includes(normalizeToken(key))) {
        return key;
      }
    }
  }
}

export function getGovPortalMetadataForHashtags(hashtags?: string[]) {
  const localityKey = getLocalityKeyFromHashtags(hashtags);
  if (!localityKey) {
    return {
      localityKey: undefined,
      metadata: undefined,
    };
  }

  return {
    localityKey,
    metadata: GOV_PORTAL_METADATA[localityKey],
  };
}
