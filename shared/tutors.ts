export type TuitionMode = "home" | "online" | "both";
export type LocationType = "country" | "city" | "division" | "district" | "thana" | "upazila" | "subdivision" | "area";
export type ManagedLocation = { id: string; label: string; type: LocationType; country: string; parentId?: string; enabled: boolean };
export type Tutor = { id: string; name: string; initials: string; accent: string; headline: string; institution: string; education: string; subjects: string[]; levels: string[]; experience: number; fee: number; gender: "male" | "female"; mode: TuitionMode; locationId: string; locationLabel: string; country: string; city: string; division?: string; district?: string; availability: string; verified: boolean; languages: string[]; about: string };

export const managedLocations: ManagedLocation[] = [
  { id: "bd", label: "Bangladesh", type: "country", country: "Bangladesh", enabled: true },
  { id: "dhaka", label: "Dhaka", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "dhaka-city", label: "Dhaka City", type: "city", country: "Bangladesh", parentId: "dhaka", enabled: true },
  { id: "mirpur", label: "Mirpur", type: "area", country: "Bangladesh", parentId: "dhaka-city", enabled: true },
  { id: "uttara", label: "Uttara", type: "area", country: "Bangladesh", parentId: "dhaka-city", enabled: true },
  { id: "chattogram", label: "Chattogram", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "chattogram-city", label: "Chattogram City", type: "city", country: "Bangladesh", parentId: "chattogram", enabled: true },
  { id: "sylhet", label: "Sylhet", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "sylhet-city", label: "Sylhet City", type: "city", country: "Bangladesh", parentId: "sylhet", enabled: true },
  { id: "rajshahi", label: "Rajshahi", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "rajshahi-city", label: "Rajshahi City", type: "city", country: "Bangladesh", parentId: "rajshahi", enabled: true },
  { id: "khulna", label: "Khulna", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "khulna-city", label: "Khulna City", type: "city", country: "Bangladesh", parentId: "khulna", enabled: true },
  { id: "barishal", label: "Barishal", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "barishal-city", label: "Barishal City", type: "city", country: "Bangladesh", parentId: "barishal", enabled: true },
  { id: "rangpur", label: "Rangpur", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "rangpur-city", label: "Rangpur City", type: "city", country: "Bangladesh", parentId: "rangpur", enabled: true },
  { id: "mymensingh", label: "Mymensingh", type: "division", country: "Bangladesh", parentId: "bd", enabled: true },
  { id: "mymensingh-city", label: "Mymensingh City", type: "city", country: "Bangladesh", parentId: "mymensingh", enabled: true },
  { id: "comilla", label: "Cumilla", type: "district", country: "Bangladesh", parentId: "chattogram", enabled: true },
  { id: "jessore", label: "Jashore", type: "district", country: "Bangladesh", parentId: "khulna", enabled: true },
  { id: "usa", label: "United States", type: "country", country: "United States", enabled: true },
  { id: "new-york", label: "New York", type: "city", country: "United States", parentId: "usa", enabled: true },
  { id: "new-jersey", label: "New Jersey", type: "city", country: "United States", parentId: "usa", enabled: true },
  { id: "uk", label: "United Kingdom", type: "country", country: "United Kingdom", enabled: true },
  { id: "london", label: "London", type: "city", country: "United Kingdom", parentId: "uk", enabled: true },
  { id: "manchester", label: "Manchester", type: "city", country: "United Kingdom", parentId: "uk", enabled: true },
  { id: "uae", label: "United Arab Emirates", type: "country", country: "United Arab Emirates", enabled: true },
  { id: "dubai", label: "Dubai", type: "city", country: "United Arab Emirates", parentId: "uae", enabled: true },
  { id: "abudhabi", label: "Abu Dhabi", type: "city", country: "United Arab Emirates", parentId: "uae", enabled: true },
  { id: "saudi", label: "Saudi Arabia", type: "country", country: "Saudi Arabia", enabled: true },
  { id: "riyadh", label: "Riyadh", type: "city", country: "Saudi Arabia", parentId: "saudi", enabled: true },
  { id: "qatar", label: "Qatar", type: "country", country: "Qatar", enabled: true },
  { id: "doha", label: "Doha", type: "city", country: "Qatar", parentId: "qatar", enabled: true },
];

export const tutors: Tutor[] = [
  { id: "t-001", name: "Ayesha Rahman", initials: "AR", accent: "#d7f1ff", headline: "Patient Mathematics tutor for school learners", institution: "University of Dhaka", education: "BSc in Mathematics", subjects: ["Mathematics", "Physics"], levels: ["Class 6–10", "SSC"], experience: 5, fee: 6000, gender: "female", mode: "both", locationId: "mirpur", locationLabel: "Mirpur, Dhaka", country: "Bangladesh", city: "Dhaka", division: "Dhaka", district: "Dhaka", availability: "Evenings · 4 days/week", verified: true, languages: ["English", "Bangla"], about: "I help learners build calm, confident foundations in mathematics through clear explanations and regular practice plans." },
  { id: "t-002", name: "Tanvir Hasan", initials: "TH", accent: "#e9ddff", headline: "English and IELTS mentor for ambitious students", institution: "North South University", education: "BA in English", subjects: ["English", "IELTS"], levels: ["Class 8–12", "University"], experience: 7, fee: 8000, gender: "male", mode: "online", locationId: "london", locationLabel: "London, United Kingdom", country: "United Kingdom", city: "London", availability: "Flexible · GMT evenings", verified: true, languages: ["English", "Bangla"], about: "My sessions combine practical language drills, structured feedback, and exam-focused preparation for real progress." },
  { id: "t-003", name: "Nusrat Jahan", initials: "NJ", accent: "#ffe6cd", headline: "Friendly primary and Bangla tutor", institution: "Jahangirnagar University", education: "BEd in Education", subjects: ["Bangla", "General Science"], levels: ["Primary", "Class 1–5"], experience: 4, fee: 4500, gender: "female", mode: "home", locationId: "uttara", locationLabel: "Uttara, Dhaka", country: "Bangladesh", city: "Dhaka", division: "Dhaka", district: "Dhaka", availability: "Afternoons · 5 days/week", verified: true, languages: ["Bangla", "English"], about: "I make early learning warm and structured with visual activities, short goals, and thoughtful guardian updates." },
  { id: "t-004", name: "Mahmudul Karim", initials: "MK", accent: "#dff5e7", headline: "Computer Science mentor for university students", institution: "BUET", education: "BSc in CSE", subjects: ["Programming", "ICT", "Mathematics"], levels: ["Class 9–12", "University"], experience: 6, fee: 10000, gender: "male", mode: "online", locationId: "new-york", locationLabel: "New York, United States", country: "United States", city: "New York", availability: "Weekends · EST mornings", verified: true, languages: ["English", "Bangla"], about: "I mentor learners with project-based lessons that connect fundamentals to the way software is built in practice." },
  { id: "t-005", name: "Sadia Ahmed", initials: "SA", accent: "#fff0bf", headline: "Biology and Chemistry tutor for science learners", institution: "Chittagong Medical College", education: "MBBS", subjects: ["Biology", "Chemistry"], levels: ["SSC", "HSC", "Admission"], experience: 8, fee: 9000, gender: "female", mode: "both", locationId: "chattogram-city", locationLabel: "Chattogram City", country: "Bangladesh", city: "Chattogram", division: "Chattogram", district: "Chattogram", availability: "Evenings · 3 days/week", verified: true, languages: ["English", "Bangla"], about: "I use diagrams, active recall, and exam planning to help science learners understand rather than memorise." },
  { id: "t-006", name: "Rafiq Islam", initials: "RI", accent: "#dce8ff", headline: "Accounting and business studies tutor", institution: "University of Rajshahi", education: "BBA in Accounting", subjects: ["Accounting", "Business Studies"], levels: ["HSC", "University"], experience: 5, fee: 5500, gender: "male", mode: "home", locationId: "rajshahi-city", locationLabel: "Rajshahi City", country: "Bangladesh", city: "Rajshahi", division: "Rajshahi", district: "Rajshahi", availability: "Morning · 4 days/week", verified: true, languages: ["English", "Bangla"], about: "I simplify accounting concepts with worked examples and a practical weekly study system." },
];

export const activeLocations = managedLocations.filter((location) => location.enabled);
export function modeLabel(mode: TuitionMode) { return mode === "home" ? "Home tuition" : mode === "online" ? "Online tuition" : "Home + online"; }
