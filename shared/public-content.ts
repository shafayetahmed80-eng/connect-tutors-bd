/**
 * The copy on the pages a signed-out visitor sees: the home page and the
 * informational pages behind the header links.
 *
 * This is the single source of truth. The pages import their text from here
 * rather than holding their own copy, so a slot's shipped default and what
 * actually renders can never drift apart - unlike the sidebar registry, which
 * has to repeat its labels because navigation carries icons and click
 * behaviour that shared code cannot import.
 *
 * Headings arrive in three pieces. `<h1>Build your <span>learning
 * connection</span> with the right tutor.</h1>` colours only the middle, so a
 * single editable string would either lose the colour or hand an Owner raw
 * markup. `lead` / `accent` / `tail` keeps the design and stays plain text.
 */

export type SplitHeading = { lead: string; accent: string; tail?: string };

export const homeCopy = {
  hero: {
    kicker: "Tutor matching across Bangladesh",
    title: { lead: "Build your ", accent: "learning connection", tail: " with the right tutor." } satisfies SplitHeading,
    description: "At home or online, make the search for your next tutor easier by starting with the student’s needs.",
    primaryAction: "Request a tutor",
    secondaryAction: "Join as a tutor",
    assurance: "Start with your needs. The decision stays yours.",
    floatOne: { lead: "Matching", strong: "your way" },
    floatTwo: { lead: "Simple", strong: "next steps" },
  },
  proof: {
    introLead: "One simple connection for ",
    introStrong: "students, guardians, and tutors.",
    items: [
      { id: "save-time", title: "Save time", copy: "Start with a few details" },
      { id: "understand", title: "Understand profiles", copy: "Know more before deciding" },
      { id: "on-track", title: "Stay on track", copy: "Put your learning style first" },
    ],
  },
  tuition: {
    eyebrow: "Tuition types",
    title: { lead: "Your learning path,", accent: "your choice." } satisfies SplitHeading,
    description: "Choose the curriculum or learning goal that matters to you. We can then make the search for the right tutor more specific.",
    homeToggle: "Home tuition",
    onlineToggle: "Online tuition",
    homeNote: "Mention your preferences and schedule for learning near home.",
    onlineNote: "Mention your preferred online schedule for learning from home.",
    cards: [
      { id: "bangla-medium", title: "Bangla Medium", copy: "Find skilled tutors for the national curriculum, from primary school through college." },
      { id: "english-version", title: "English Version", copy: "Get the right teacher to understand the national curriculum in English." },
      { id: "english-medium", title: "English Medium", copy: "Match with tutors for Cambridge, Edexcel, and IB subjects." },
      { id: "religious", title: "Religious Education", copy: "Choose a tutor who understands your needs for madrasa and religious subjects." },
      { id: "skills", title: "Skill Development", copy: "Get focused support for IELTS, SAT, GRE, and other learning goals." },
    ],
  },
  belief: {
    lead: "A good teacher does more than explain a subject—they help build the ",
    accent: "confidence to learn.",
  },
  journey: {
    eyebrow: "How it works",
    title: { lead: "A simple path to ", accent: "better learning." } satisfies SplitHeading,
    description: "From sharing your need to taking the first class, we keep each step clear.",
    action: "Share your need",
    steps: [
      { id: "share", number: "01", title: "Share your need", copy: "Tell us a few details about the subject, class, schedule, and area." },
      { id: "choose", number: "02", title: "Choose a profile", copy: "Review potential tutor profiles matched to your requirements." },
      { id: "demo", number: "03", title: "Take a demo class", copy: "Try an introductory class to see whether the approach feels right." },
      { id: "confirm", number: "04", title: "Confirm your choice", copy: "Agree on the schedule, fee, and class format when you are ready." },
      { id: "start", number: "05", title: "Start learning", copy: "Move at your own pace and stay focused on your learning goals." },
    ],
  },
  stories: {
    eyebrow: "Room to learn",
    title: { lead: "At home or across a screen—", accent: "the right attention matters." } satisfies SplitHeading,
    description: "Every student’s routine, subject, comfort, and goal is different. Start a conversation with a clear request, then decide how you want to move forward.",
    bullets: [
      { id: "share-needs", text: "Share your needs briefly" },
      { id: "choose-format", text: "Choose a tutor format and preference" },
      { id: "decide", text: "Learn more and decide for yourself" },
    ],
    badgeLead: "Keep learning,",
    badgeStrong: "at your own pace.",
    action: "Get started",
  },
  faq: {
    eyebrow: "Frequently asked",
    title: { lead: "Have a question?", accent: "We are here to help." } satisfies SplitHeading,
    description: "Before searching for a tutor, it helps to understand how the process works.",
    action: "Ask another question",
    items: [
      { id: "how-to-find", question: "How do I find a tutor on Connect Tutors BD?", answer: "Share your needs through the Tutor Request form. Our team will then contact you about the next step." },
      { id: "ease-of-use", question: "Is it easy for students and guardians to use?", answer: "Yes. Start with the essentials—subject, class, location, and preferences. You can add more detail later." },
      { id: "online-or-home", question: "Can I find both online and home tutors?", answer: "Yes. You can choose home tuition or online tuition in the first step of the request form." },
      { id: "demo-purpose", question: "What is the purpose of a demo class?", answer: "A demo class helps you understand the teaching style and the student’s comfort before making a considered decision." },
      { id: "fee", question: "How is the tutor fee decided?", answer: "Subject, class, location, class duration, and experience are considered when agreeing on the fee." },
    ],
  },
  finalCta: {
    eyebrow: "Your next step",
    titleLead: "Make the right connection",
    titleTail: "for better learning.",
    action: "Request a tutor",
  },
} as const;

/** The informational pages, keyed by the route that renders them. */
export const infoPageCopy = [
  { path: "/tuition", key: "tuition", eyebrow: "Tuition types", title: "Choose the right learning path for your needs.", copy: "Start your search for the right tutor by curriculum, subject, and class format." },
  { path: "/tutors", key: "tutors", eyebrow: "For tutors", title: "Bring your teaching skills to new connections.", copy: "Share your profile, preferred subjects, and schedule to build your path with Connect Tutors BD." },
  { path: "/blogs", key: "blogs", eyebrow: "Learning notes", title: "Small, practical ideas for better learning.", copy: "Helpful habits, preparation tips, and routines for guardians, students, and tutors will be available here soon." },
  { path: "/events", key: "events", eyebrow: "Events", title: "Plans to bring learning communities together.", copy: "Workshop, information session, and education-focused event updates will be published here." },
  { path: "/contact", key: "contact", eyebrow: "Contact", title: "Start a conversation with your question.", copy: "Send us a message if you want to talk about tutor matching, profiles, or the platform." },
  { path: "/privacy-policy", key: "privacy-policy", eyebrow: "Privacy", title: "Our responsibility toward your information.", copy: "We believe request information should be used only for relevant communication and matching." },
  { path: "/terms-conditions", key: "terms-conditions", eyebrow: "Terms", title: "Clear expectations, better experiences.", copy: "Detailed terms for using the platform will be added here before the service launches." },
] as const;

/** The two calls to action an informational page can end with. */
export const infoPageActions = {
  requestTutor: "Request a tutor",
  joinTutor: "Join as a tutor",
} as const;

export function findInfoPageCopy(path: string) {
  return infoPageCopy.find(page => page.path === path);
}
