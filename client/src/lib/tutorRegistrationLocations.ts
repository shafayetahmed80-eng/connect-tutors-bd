export type TutorRegistrationLocation = {
  id: string;
  label: string;
  type: string;
  country: string;
  parentId: string | null;
};

export const TUTOR_REGISTRATION_CITY_IDS = [
  "dhaka-city",
  "chattogram-city",
  "sylhet-city",
  "rajshahi-city",
  "khulna-city",
  "barishal-city",
  "rangpur-city",
  "mymensingh-city",
  "tangail-city",
  "sirajganj-city",
] as const;

export function getTutorRegistrationCities(locations: TutorRegistrationLocation[]) {
  const locationsById = new Map(locations.map(location => [location.id, location]));
  return TUTOR_REGISTRATION_CITY_IDS.map(id => locationsById.get(id)).filter(Boolean) as TutorRegistrationLocation[];
}

export function getTutorRegistrationAreas(locations: TutorRegistrationLocation[], cityId: string) {
  return locations.filter(location => location.country === "Bangladesh" && location.parentId === cityId && (location.type === "area" || location.type === "district"));
}
