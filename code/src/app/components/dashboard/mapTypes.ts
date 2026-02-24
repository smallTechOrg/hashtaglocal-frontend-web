export interface LocationPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  image: string;
  imageThumbnail?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  address?: string;
  colloquialName?: string;
}
