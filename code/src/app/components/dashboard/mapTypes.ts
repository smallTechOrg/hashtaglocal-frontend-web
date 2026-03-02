export interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image: string;
  imageThumbnail?: string;
  /** All available media images for this issue (url + optional thumbnail) */
  images?: Array<{ url: string; thumbnail?: string }>;
  type?: string;
  status?: string;
  createdAt?: string;
  address?: string;
  colloquialName?: string;
}
