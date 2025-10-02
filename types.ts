
export const roomTypes = [
  "Bedroom",
  "Bathroom",
  "Living room",
  "Dining room",
  "Kitchen",
  "Living room, Dining room, Kitchen combo",
  "Living room/Kitchen combo",
  "Outside space",
  "Other - describe",
] as const;

export const styleTypes = [
  "Modern",
  "Contemporary",
  "Minimalist",
  "Industrial",
  "Mid-century Modern",
  "Scandinavian",
  "Bohemian",
  "Farmhouse",
  "Coastal",
  "Warm and Rustic",
] as const;

export type RoomType = typeof roomTypes[number];
export type StyleType = typeof styleTypes[number];

export type FlooringType = 'carpet' | 'wood' | 'tile' | 'laminate';

export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  roomType: RoomType;
  customRoomType?: string;
  status: ProcessingStatus;
  restagedUrl: string | null;
  error: string | null;
  // New properties for restyling options
  changePaint: boolean;
  paintColor: string;
  changeFlooring: boolean;
  flooringType: FlooringType;
  additionalInstructions: string;
}
