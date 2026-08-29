import type { Tutor, TuitionMode } from "./tutors";

export type TutorListingFilters = {
  query: string;
  country: string;
  city: string;
  division: string;
  district: string;
  mode: "all" | TuitionMode;
  subjects: string[];
  levels: string[];
  languages: string[];
  gender: "all" | Tutor["gender"];
  verifiedOnly: boolean;
  minFee?: number;
  maxFee?: number;
  page: number;
  pageSize: number;
};

export type TutorListingFacets = {
  subjects: string[];
  levels: string[];
  languages: string[];
};

export type TutorListingPage = {
  items: Tutor[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
  facets: TutorListingFacets;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

function includesAll(values: string[], selected: string[]) {
  const available = new Set(values.map(normalize));
  return selected.every((value) => available.has(normalize(value)));
}

export function getTutorListingPage(tutorList: Tutor[], filters: TutorListingFilters): TutorListingPage {
  const query = normalize(filters.query);
  const filtered = tutorList.filter((tutor) => {
    const searchable = normalize([
      tutor.name,
      tutor.headline,
      tutor.institution,
      tutor.education,
      tutor.subjects.join(" "),
      tutor.levels.join(" "),
      tutor.languages.join(" "),
      tutor.locationLabel,
      tutor.availability,
    ].join(" "));
    const modeMatches = filters.mode === "all" || tutor.mode === filters.mode || tutor.mode === "both";
    return (!query || searchable.includes(query)) &&
      (filters.country === "all" || tutor.country === filters.country) &&
      (filters.city === "all" || tutor.city === filters.city) &&
      (filters.division === "all" || tutor.division === filters.division) &&
      (filters.district === "all" || tutor.district === filters.district) &&
      modeMatches &&
      includesAll(tutor.subjects, filters.subjects) &&
      includesAll(tutor.levels, filters.levels) &&
      includesAll(tutor.languages, filters.languages) &&
      (filters.gender === "all" || tutor.gender === filters.gender) &&
      (!filters.verifiedOnly || tutor.verified) &&
      (filters.minFee === undefined || tutor.fee >= filters.minFee) &&
      (filters.maxFee === undefined || tutor.fee <= filters.maxFee);
  });

  const pageSize = Math.min(50, Math.max(1, Math.floor(filters.pageSize) || 1));
  const totalItems = filtered.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const page = totalPages === 0 ? 1 : Math.min(totalPages, Math.max(1, Math.floor(filters.page) || 1));
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    totalItems,
    totalPages,
    page,
    pageSize,
    facets: {
      subjects: Array.from(new Set(tutorList.flatMap(tutor => tutor.subjects))).sort(),
      levels: Array.from(new Set(tutorList.flatMap(tutor => tutor.levels))).sort(),
      languages: Array.from(new Set(tutorList.flatMap(tutor => tutor.languages))).sort(),
    },
  };
}
