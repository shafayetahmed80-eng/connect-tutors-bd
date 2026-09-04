import {
  date,
  foreignKey,
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const userRoleValues = ["guardian", "tutor", "admin", "user"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const accountStatusValues = ["active", "suspended", "closed"] as const;
export type AccountStatus = (typeof accountStatusValues)[number];

export const tutorProfileStatusValues = [
  "draft",
  "pending",
  "changes_requested",
  "approved",
  "suspended",
] as const;
export type TutorProfileStatus = (typeof tutorProfileStatusValues)[number];

export const guardianContactAccessContextValues = ["guardian_request"] as const;
export type GuardianContactAccessContext = (typeof guardianContactAccessContextValues)[number];

export const tutorRequestPublicationStateValues = [
  "submitted",
  "reviewing",
  "changes_requested",
  "approved",
  "unpublished",
  "published",
  "closed",
] as const;
export type TutorRequestPublicationState = (typeof tutorRequestPublicationStateValues)[number];

export const tutorRequestPublicationActionValues = [
  "verify",
  "edit",
  "guardian_confirmed",
  "guardian_reconfirmed",
  "request_changes",
  "approve",
  "publish",
  "extend_expiry",
  "unpublish",
  "close",
] as const;
export type TutorRequestPublicationAction = (typeof tutorRequestPublicationActionValues)[number];

export const tutorRequestOperationActionValues = [
  "guardian_updated",
  "admin_confirmed",
  "admin_cancelled",
  "guardian_cancelled",
] as const;
export type TutorRequestOperationAction = (typeof tutorRequestOperationActionValues)[number];

export const guardianRequestNotificationTypeValues = [
  "lifecycle",
  "follow_up",
  "confirmation_letter_issued",
] as const;
export type GuardianRequestNotificationType = (typeof guardianRequestNotificationTypeValues)[number];

export const guardianRequestFollowUpKindValues = [
  "availability_confirmation",
  "information_required",
  "meeting_update",
] as const;
export type GuardianRequestFollowUpKind = (typeof guardianRequestFollowUpKindValues)[number];

export const tutorRequestAssignmentNoteCategoryValues = [
  "matching",
  "guardian_contact",
  "tutor_follow_up",
  "internal_risk",
] as const;
export type TutorRequestAssignmentNoteCategory = (typeof tutorRequestAssignmentNoteCategoryValues)[number];

export const confirmationLetterStatusValues = ["draft", "issued", "superseded"] as const;
export type ConfirmationLetterStatus = (typeof confirmationLetterStatusValues)[number];

export const tutorJobPublicationStatusValues = ["published", "unpublished", "closed"] as const;
export type TutorJobPublicationStatus = (typeof tutorJobPublicationStatusValues)[number];

export const guardianProfilePhotoStatusValues = [
  "pending_review",
  "approved",
  "rejected",
] as const;
export type GuardianProfilePhotoStatus = (typeof guardianProfilePhotoStatusValues)[number];

export const guardianProfilePhotoRejectionReasonValues = [
  "not_clear_guardian_portrait",
  "contains_child_or_sensitive_personal_data",
  "contains_contact_or_promotional_content",
  "inappropriate_or_unsafe_content",
  "low_quality_or_unrelated_image",
] as const;
export type GuardianProfilePhotoRejectionReason =
  (typeof guardianProfilePhotoRejectionReasonValues)[number];

export const guardianProfilePhotoEventActionValues = [
  "submitted",
  "replaced",
  "removed",
  "approved",
  "rejected",
] as const;
export type GuardianProfilePhotoEventAction =
  (typeof guardianProfilePhotoEventActionValues)[number];

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    /** Private canonical Bangladesh mobile identifier, never exposed publicly. */
    loginPhone: varchar("loginPhone", { length: 16 }),
    passwordHash: text("passwordHash"),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", userRoleValues).default("guardian").notNull(),
    accountStatus: mysqlEnum("accountStatus", accountStatusValues)
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => [uniqueIndex("users_role_login_phone_unique").on(table.role, table.loginPhone)]
);

/**
 * Dedicated, normalized Admin sign-in identifiers. These identifiers are never
 * included in browser auth DTOs or public user projections. Password hashes
 * remain in `users.passwordHash` so the existing password-hardening contract is
 * shared across account types.
 */
export const adminCredentials = mysqlTable(
  "admin_credentials",
  {
    userId: int("userId")
      .primaryKey()
      .references(() => users.id),
    loginId: varchar("loginId", { length: 64 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

/**
 * Per-tab Tutor portal access proofs. Raw browser proofs are never persisted;
 * this table keeps only their one-way digests and short-lived lifecycle state.
 */
export const tutorPortalSessions = mysqlTable(
  "tutor_portal_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("tutor_portal_sessions_token_hash_unique").on(table.tokenHash),
    index("tutor_portal_sessions_user_state_idx").on(table.userId, table.revokedAt, table.expiresAt),
  ]
);

export const adminInvitationStatusValues = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export type AdminInvitationStatus = (typeof adminInvitationStatusValues)[number];

/**
 * Owner-created, email-bound Admin invitations. Only the SHA-256 token digest
 * is persisted; the one-time invitation link token is returned once to the Owner.
 */
export const adminInvitations = mysqlTable(
  "admin_invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", adminInvitationStatusValues)
      .default("pending")
      .notNull(),
    createdByUserId: int("createdByUserId")
      .notNull()
      .references(() => users.id),
    acceptedByUserId: int("acceptedByUserId").references(() => users.id),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("admin_invitations_token_hash_unique").on(table.tokenHash),
    index("admin_invitations_email_status_idx").on(table.email, table.status),
    index("admin_invitations_status_expiry_idx").on(table.status, table.expiresAt),
  ]
);

export const adminAuditEventValues = [
  "login_success",
  "login_failure",
  "two_factor_required",
  "two_factor_success",
  "two_factor_failure",
  "recovery_code_used",
  "invitation_created",
  "invitation_accepted",
  "invitation_revoked",
  "two_factor_reset",
  "credential_provisioned",
  "credential_reset",
] as const;
export type AdminAuditEvent = (typeof adminAuditEventValues)[number];

/**
 * Immutable Owner-readable security history. It deliberately does not persist
 * session cookies, raw passwords, raw TOTP values, recovery codes, or invite tokens.
 */
export const adminLoginAuditLogs = mysqlTable(
  "admin_login_audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id),
    email: varchar("email", { length: 320 }),
    event: mysqlEnum("event", adminAuditEventValues).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("admin_login_audit_logs_user_created_idx").on(table.userId, table.createdAt),
    index("admin_login_audit_logs_event_created_idx").on(table.event, table.createdAt),
  ]
);

/**
 * Kept in sync with `AuthAuditEvent` in `server/auth-audit.ts` — same string set,
 * duplicated here because `drizzle/` cannot import from `server/`.
 */
export const authEventTypeValues = [
  "login_success",
  "login_failure",
  "login_blocked",
  "login_account_suspended",
  "login_account_closed",
  "registration_success",
  "registration_rejected",
  "registration_blocked",
  "phone_intake",
  "phone_intake_blocked",
] as const;
export type AuthEventType = (typeof authEventTypeValues)[number];

/**
 * Durable, queryable history of public (non-Admin) authentication events. No
 * credential material and no raw identifier — `identifierMasked` mirrors the
 * masked value written to the stdout audit line.
 */
export const authEvents = mysqlTable(
  "auth_events",
  {
    id: int("id").autoincrement().primaryKey(),
    event: mysqlEnum("event", authEventTypeValues).notNull(),
    role: mysqlEnum("role", ["tutor", "guardian", "admin"]),
    ip: varchar("ip", { length: 64 }),
    identifierMasked: varchar("identifierMasked", { length: 128 }),
    reason: varchar("reason", { length: 120 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("auth_events_event_created_idx").on(table.event, table.createdAt),
    index("auth_events_ip_created_idx").on(table.ip, table.createdAt),
  ]
);
export type AuthEvent = typeof authEvents.$inferSelect;

/** Encrypted TOTP seed and enrollment metadata for one Admin account. */
export const adminTwoFactorSettings = mysqlTable("admin_two_factor_settings", {
  userId: int("userId").primaryKey().references(() => users.id),
  secretCiphertext: varchar("secretCiphertext", { length: 512 }).notNull(),
  enabledAt: timestamp("enabledAt").notNull(),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Each recovery code is stored only as a digest and can be consumed once. */
export const adminTwoFactorRecoveryCodes = mysqlTable(
  "admin_two_factor_recovery_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("admin_2fa_recovery_codes_hash_unique").on(table.codeHash),
    index("admin_2fa_recovery_codes_user_used_idx").on(table.userId, table.usedAt),
  ]
);

/**
 * Created when a person completes Tutor-role registration. New public Tutor
 * IDs use the lowest unused numeric value from 777; historic IDs stay unchanged.
 */
export const tutorRegistrations = mysqlTable("tutor_registrations", {
  id: int("id").autoincrement().primaryKey(),
  tutorNumber: int("tutorNumber").unique(),
  userId: int("userId").notNull().unique(),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  /** Null for anyone who registered before the answer was recorded. */
  termsVersion: varchar("termsVersion", { length: 64 }),
});

export const guardianPhoneIntakeStatusValues = [
  "pending",
  "completed",
  "expired",
] as const;
export type GuardianPhoneIntakeStatus =
  (typeof guardianPhoneIntakeStatusValues)[number];

/**
 * Private pre-registration lifecycle for a Guardian phone number. The raw row
 * ID and handoff token are never returned to browsers, URLs, or public APIs.
 */
export const guardianPhoneIntakes = mysqlTable(
  "guardian_phone_intakes",
  {
    id: int("id").autoincrement().primaryKey(),
    phone: varchar("phone", { length: 16 }).notNull(),
    status: mysqlEnum("status", guardianPhoneIntakeStatusValues)
      .default("pending")
      .notNull(),
    handoffTokenHash: varchar("handoffTokenHash", { length: 128 }).notNull(),
    handoffExpiresAt: timestamp("handoffExpiresAt").notNull(),
    phoneVerifiedAt: timestamp("phoneVerifiedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("guardian_phone_intakes_phone_unique").on(table.phone),
    index("guardian_phone_intakes_status_expiry_idx").on(
      table.status,
      table.handoffExpiresAt
    ),
  ]
);

export const guardianProfiles = mysqlTable(
  "guardian_profiles",
  {
    userId: int("userId").primaryKey().references(() => users.id),
    /** Opaque support-facing ID; intentionally distinct from any database primary key. */
    guardianId: varchar("guardianId", { length: 12 }).notNull(),
    phone: varchar("phone", { length: 16 }).notNull(),
    gender: mysqlEnum("gender", ["male", "female"]).notNull(),
    cityLocationId: varchar("cityLocationId", { length: 80 }).notNull().references(() => locations.id),
    locationId: varchar("locationId", { length: 80 }).notNull().references(() => locations.id),
    termsVersion: varchar("termsVersion", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("guardian_profiles_guardian_id_unique").on(table.guardianId),
    uniqueIndex("guardian_profiles_phone_unique").on(table.phone),
    index("guardian_profiles_location_idx").on(table.cityLocationId, table.locationId),
  ],
);

/**
 * Minimal, append-only evidence that a Guardian updated their own profile.
 * The event deliberately stores no prior/current values, contact data, or
 * locations, so auditability does not become another source of PII exposure.
 */
export const guardianProfileUpdateEvents = mysqlTable(
  "guardian_profile_update_events",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianUserId: int("guardianUserId")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("guardian_profile_update_events_guardian_created_idx").on(table.guardianUserId, table.createdAt)],
);

/**
 * Current Guardian-owned profile photo reference. The object key is private
 * infrastructure metadata and must never leave authorized server contracts.
 */
export const guardianProfilePhotos = mysqlTable(
  "guardian_profile_photos",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianUserId: int("guardianUserId")
      .notNull()
      .references(() => users.id),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    status: mysqlEnum("status", guardianProfilePhotoStatusValues)
      .default("pending_review")
      .notNull(),
    rejectionReason: mysqlEnum(
      "rejectionReason",
      guardianProfilePhotoRejectionReasonValues,
    ),
    moderationNote: varchar("moderationNote", { length: 280 }),
    moderatedByAdminId: int("moderatedByAdminId").references(() => users.id),
    moderatedAt: timestamp("moderatedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("guardian_profile_photos_guardian_unique").on(table.guardianUserId),
    index("guardian_profile_photos_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

/**
 * Append-only, minimal Guardian-photo operations history. It deliberately
 * excludes storage keys, image bytes, contact data, and free-text notes.
 */
export const guardianProfilePhotoEvents = mysqlTable(
  "guardian_profile_photo_events",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianUserId: int("guardianUserId")
      .notNull()
      .references(() => users.id),
    actorUserId: int("actorUserId")
      .notNull()
      .references(() => users.id),
    action: mysqlEnum("action", guardianProfilePhotoEventActionValues).notNull(),
    previousStatus: mysqlEnum("previousStatus", guardianProfilePhotoStatusValues),
    nextStatus: mysqlEnum("nextStatus", guardianProfilePhotoStatusValues),
    rejectionReason: mysqlEnum(
      "rejectionReason",
      guardianProfilePhotoRejectionReasonValues,
    ),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("guardian_photo_events_guardian_created_idx").on(
      table.guardianUserId,
      table.createdAt,
    ),
    index("guardian_photo_events_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const locations = mysqlTable(
  "locations",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    label: varchar("label", { length: 160 }).notNull(),
    type: mysqlEnum("type", [
      "country",
      "city",
      "division",
      "district",
      "thana",
      "upazila",
      "subdivision",
      "area",
    ]).notNull(),
    country: varchar("country", { length: 120 }).notNull(),
    parentId: varchar("parentId", { length: 80 }),
    enabled: int("enabled").default(1).notNull(),
    /** Same meaning as `catalogFields.origin`; the shipped rows are the product's. */
    origin: varchar("origin", { length: 10 }).default("seed").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    // One catalog option per (parent, type, label). Blocks the re-introduction
    // of the duplicate rows cleaned up in scripts/cleanup-duplicate-locations.mjs.
    // MySQL treats NULL parentId rows as distinct, so top-level entries (the
    // country root) are unaffected.
    uniqueIndex("locations_parent_type_label_unique").on(
      table.parentId,
      table.type,
      table.label,
    ),
  ],
);

export const tutors = mysqlTable("tutors", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  initials: varchar("initials", { length: 8 }),
  accent: varchar("accent", { length: 20 }),
  headline: varchar("headline", { length: 240 }),
  profilePhotoKey: varchar("profilePhotoKey", { length: 512 }),
  dateOfBirth: date("dateOfBirth"),
  nationwideAvailability: int("nationwideAvailability").default(0).notNull(),
  institution: varchar("institution", { length: 240 }),
  education: varchar("education", { length: 240 }),
  subjects: text("subjects"),
  levels: text("levels"),
  experience: int("experience"),
  teachingExperienceYears: int("teachingExperienceYears"),
  priorTeachingExperience: text("priorTeachingExperience"),
  specialExpertise: text("specialExpertise"),
  academicAchievement: text("academicAchievement"),
  fee: int("fee"),
  monthlyFeeMin: int("monthlyFeeMin"),
  monthlyFeeMax: int("monthlyFeeMax"),
  travelDistanceKm: int("travelDistanceKm"),
  gender: mysqlEnum("gender", ["male", "female"]).notNull(),
  mode: mysqlEnum("mode", ["home", "online", "both"]),
  preferredStudentGender: mysqlEnum("preferredStudentGender", [
    "male",
    "female",
    "both",
  ]),
  locationId: varchar("locationId", { length: 80 }).notNull(),
  availability: varchar("availability", { length: 160 }),
  profileStatus: mysqlEnum("profileStatus", tutorProfileStatusValues)
    .default("draft")
    .notNull(),
  verified: int("verified").default(0).notNull(),
  languages: text("languages"),
  about: text("about"),
  teachingApproach: text("teachingApproach"),
  whyChooseMe: text("whyChooseMe"),
  additionalNotes: text("additionalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const universities = mysqlTable(
  "universities",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 240 }).notNull(),
    normalizedName: varchar("normalizedName", { length: 240 }).notNull(),
    active: int("active").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    /** Same meaning as `catalogFields.origin`; the seed refreshes only its own rows. */
    origin: varchar("origin", { length: 10 }).default("seed").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("universities_normalized_name_unique").on(table.normalizedName),
    index("universities_active_sort_idx").on(table.active, table.sortOrder),
  ]
);

/**
 * Department / Subject — one flat, global Honours/Bachelor/Undergraduate
 * field-of-study vocabulary. Keeps the historical table name; there is no
 * Faculty layer and no per-institute scoping any more.
 */
export const facultyDepartments = mysqlTable(
  "faculty_departments",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 240 }).notNull(),
    normalizedName: varchar("normalizedName", { length: 240 }).notNull(),
    active: int("active").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    /** Same meaning as `catalogFields.origin`; the seed refreshes only its own rows. */
    origin: varchar("origin", { length: 10 }).default("seed").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("faculty_departments_normalized_unique").on(table.normalizedName),
    index("faculty_departments_active_sort_idx").on(table.active, table.sortOrder),
  ]
);

export const degreeMajors = mysqlTable(
  "degree_majors",
  {
    id: int("id").autoincrement().primaryKey(),
    facultyDepartmentId: int("facultyDepartmentId")
      .notNull()
      .references(() => facultyDepartments.id),
    name: varchar("name", { length: 240 }).notNull(),
    normalizedName: varchar("normalizedName", { length: 240 }).notNull(),
    active: int("active").default(1).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("degree_majors_faculty_normalized_unique").on(
      table.facultyDepartmentId,
      table.normalizedName
    ),
    index("degree_majors_parent_active_sort_idx").on(
      table.facultyDepartmentId,
      table.active,
      table.sortOrder
    ),
  ]
);

const catalogFields = {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 160 }).notNull(),
  active: int("active").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  /**
   * Who owns this row: "seed" for the defaults shipped in code, "admin" for
   * anything the Owner added or edited. The seed only overwrites its own rows,
   * so a deploy can refresh the defaults without undoing an Owner's changes.
   */
  origin: varchar("origin", { length: 10 }).default("seed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
};

const createControlledCatalog = (tableName: string) =>
  mysqlTable(tableName, catalogFields, table => [
    uniqueIndex(`${tableName}_normalized_name_unique`).on(table.normalizedName),
    index(`${tableName}_active_sort_idx`).on(table.active, table.sortOrder),
  ]);

export const subjectsCatalog = createControlledCatalog("subjects_catalog");
export const classLevels = createControlledCatalog("class_levels");
export const curricula = createControlledCatalog("curricula");
export const studentTypes = createControlledCatalog("student_types");
export const languagesCatalog = createControlledCatalog("languages_catalog");

export const tutorAcademicProfiles = mysqlTable(
  "tutor_academic_profiles",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .primaryKey()
      .references(() => tutors.id),
    /** Education Level — a curated vocabulary, see `@shared/tutor-education`. */
    highestEducation: varchar("highestEducation", { length: 160 }),
    universityId: int("universityId").references(() => universities.id),
    facultyDepartmentId: int("facultyDepartmentId"),
    degreeMajorId: int("degreeMajorId").references(() => degreeMajors.id),
    degreeExamTitle: varchar("degreeExamTitle", { length: 160 }),
    resultGpa: varchar("resultGpa", { length: 80 }),
    deptId: varchar("deptId", { length: 80 }),
    currentStudyStatus: mysqlEnum("currentStudyStatus", [
      "studying",
      "graduated",
      "professional",
    ]),
    /** Collected while studying; `graduationYear` takes over once they finish. */
    yearSemester: varchar("yearSemester", { length: 80 }),
    graduationYear: int("graduationYear"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.facultyDepartmentId],
      foreignColumns: [facultyDepartments.id],
      name: "tap_faculty_department_fk",
    }),
    index("tutor_academic_profiles_university_idx").on(table.universityId),
    index("tutor_academic_profiles_faculty_idx").on(table.facultyDepartmentId),
    index("tutor_academic_profiles_degree_idx").on(table.degreeMajorId),
  ]
);

/**
 * Tutor-only / authorised-reviewer information. NID is deliberately excluded
 * until encrypted storage, retention, and access-audit controls are approved.
 */
export const tutorPrivateProfiles = mysqlTable(
  "tutor_private_profiles",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .primaryKey()
      .references(() => tutors.id),
    additionalPhone: varchar("additionalPhone", { length: 20 }),
    presentAddress: text("presentAddress"),
    permanentAddress: text("permanentAddress"),
    nationality: varchar("nationality", { length: 80 }),
    religion: varchar("religion", { length: 80 }),
    socialProfileLinks: text("socialProfileLinks"),
    fatherName: varchar("fatherName", { length: 160 }),
    fatherPhone: varchar("fatherPhone", { length: 20 }),
    motherName: varchar("motherName", { length: 160 }),
    motherPhone: varchar("motherPhone", { length: 20 }),
    emergencyContactName: varchar("emergencyContactName", { length: 160 }),
    emergencyContactRelation: varchar("emergencyContactRelation", { length: 80 }),
    emergencyContactPhone: varchar("emergencyContactPhone", { length: 20 }),
    emergencyContactAddress: text("emergencyContactAddress"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
);

export const tutorEducationRecords = mysqlTable(
  "tutor_education_records",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    /** Education Level — a curated vocabulary, see `@shared/tutor-education`. */
    qualificationLevel: varchar("qualificationLevel", { length: 80 }).notNull(),
    instituteName: varchar("instituteName", { length: 200 }).notNull(),
    degreeExamTitle: varchar("degreeExamTitle", { length: 160 }).notNull(),
    majorGroup: varchar("majorGroup", { length: 160 }).notNull(),
    resultGpa: varchar("resultGpa", { length: 80 }),
    /** Required at submission, but nullable so legacy records still load. */
    curriculum: varchar("curriculum", { length: 80 }),
    /** Plain four-digit years; Tutors type them rather than picking a date. */
    studyStartYear: int("studyStartYear").notNull(),
    studyEndYear: int("studyEndYear"),
    currentlyStudying: int("currentlyStudying").default(0).notNull(),
    instituteIdCardNumber: varchar("instituteIdCardNumber", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("tutor_education_records_tutor_idx").on(table.tutorId)],
);

/** Private document metadata only; original image bytes remain in object storage. */
export const tutorUniversityIdDocuments = mysqlTable(
  "tutor_university_id_documents",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .primaryKey()
      .references(() => tutors.id),
    storageKey: varchar("storageKey", { length: 512 }),
    documentStatus: mysqlEnum("documentStatus", [
      "not_uploaded",
      "uploaded",
      "pending",
      "approved",
      "changes_requested",
    ]).default("not_uploaded").notNull(),
    uploadedAt: timestamp("uploadedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
);

/**
 * Optional private verification documents (NID, SSC/HSC/Hons certificates).
 * Metadata only — the image bytes stay in object storage and the key is never
 * exposed to Guardians or public DTOs. `documentType` is a plain string so the
 * catalog in `@shared/tutor-documents` can grow without a migration.
 */
export const tutorSupportingDocuments = mysqlTable(
  "tutor_supporting_documents",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    documentType: varchar("documentType", { length: 40 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.documentType] }),
    index("tutor_supporting_documents_tutor_idx").on(table.tutorId),
  ],
);

/**
 * Admin overrides for the copy declared in `@shared/site-content`.
 *
 * Only changed slots get a row, so an empty table renders the site exactly as
 * the code ships it, and deleting a row is a complete reset. `slotId` is a
 * plain string keyed to the registry rather than an enum, so adding an editable
 * slot never needs a migration.
 */
export const siteContentOverrides = mysqlTable(
  "site_content_overrides",
  {
    slotId: varchar("slotId", { length: 120 }).primaryKey(),
    page: varchar("page", { length: 60 }).notNull(),
    text: varchar("text", { length: 240 }),
    /** Absolute font size in pixels; null means the slot renders as shipped. */
    textSizePx: int("textSizePx"),
    /**
     * Vertical padding in pixels, for slots that size a row rather than its
     * text. Kept apart from `textSizePx` so a stored number never has to be
     * read against the registry to know which measurement it was.
     */
    paddingPx: int("paddingPx"),
    spacing: varchar("spacing", { length: 20 }),
    updatedByUserId: int("updatedByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("site_content_overrides_page_idx").on(table.page)],
);

/**
 * Admin-authored notice blocks, placed at anchors the pages declare in
 * `@shared/site-content`. Unlike the page sections, these are Admin-owned
 * content, so they can be created, reordered and removed freely.
 */
export const siteContentBlocks = mysqlTable(
  "site_content_blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    anchorId: varchar("anchorId", { length: 120 }).notNull(),
    page: varchar("page", { length: 60 }).notNull(),
    heading: varchar("heading", { length: 120 }),
    body: text("body"),
    tone: varchar("tone", { length: 20 }).default("info").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    active: int("active").default(1).notNull(),
    updatedByUserId: int("updatedByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("site_content_blocks_anchor_sort_idx").on(table.anchorId, table.active, table.sortOrder)],
);

/**
 * The body of a legal page, written in the Owner's Markdown subset.
 *
 * Kept apart from `site_content_overrides` because that table's `text` column
 * is `varchar(240)` - sized for a heading, not a document. `mediumtext` rather
 * than `text`: Bangla runs three bytes to the character, so a 40,000-character
 * policy would overflow `text`'s 65,535 bytes well before hitting its limit.
 */
/**
 * The numbers the Owner has moved off their shipped values.
 *
 * Only changed limits are stored, so an empty table means the site runs on
 * exactly the numbers in `shared/site-limits.ts` and "Reset" is a delete. The
 * key is a registry string rather than an enum: adding a limit is a code
 * change, not a migration.
 */
export const siteLimits = mysqlTable("site_limits", {
  limitId: varchar("limitId", { length: 60 }).primaryKey(),
  value: int("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sitePolicyDocuments = mysqlTable("site_policy_documents", {
  pageKey: varchar("pageKey", { length: 60 }).primaryKey(),
  body: mediumtext("body").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tutorTeachingAreas = mysqlTable(
  "tutor_teaching_areas",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    locationId: varchar("locationId", { length: 80 })
      .notNull()
      .references(() => locations.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.locationId] }),
    index("tutor_teaching_areas_location_idx").on(table.locationId),
  ]
);

export const tutorSubjects = mysqlTable(
  "tutor_subjects",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    subjectId: int("subjectId")
      .notNull()
      .references(() => subjectsCatalog.id),
    selectionType: mysqlEnum("selectionType", [
      "primary",
      "additional",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({
      columns: [table.tutorId, table.subjectId, table.selectionType],
    }),
    index("tutor_subjects_subject_idx").on(table.subjectId),
  ]
);

export const tutorClassLevels = mysqlTable(
  "tutor_class_levels",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    classLevelId: int("classLevelId")
      .notNull()
      .references(() => classLevels.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.classLevelId] }),
    index("tutor_class_levels_catalog_idx").on(table.classLevelId),
  ]
);

export const tutorCurricula = mysqlTable(
  "tutor_curricula",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    curriculumId: int("curriculumId")
      .notNull()
      .references(() => curricula.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.curriculumId] }),
    index("tutor_curricula_catalog_idx").on(table.curriculumId),
  ]
);

export const tutorStudentTypes = mysqlTable(
  "tutor_student_types",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    studentTypeId: int("studentTypeId")
      .notNull()
      .references(() => studentTypes.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.studentTypeId] }),
    index("tutor_student_types_catalog_idx").on(table.studentTypeId),
  ]
);

export const tutorPreferredClassSizes = mysqlTable(
  "tutor_preferred_class_sizes",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    classSize: mysqlEnum("classSize", [
      "one_to_one",
      "small_group",
      "group",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.tutorId, table.classSize] })]
);

export const tutorPreferredTeachingDays = mysqlTable(
  "tutor_preferred_teaching_days",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    dayOfWeek: mysqlEnum("dayOfWeek", [
      "saturday",
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.tutorId, table.dayOfWeek] })]
);

export const tutorPreferredTimeSlots = mysqlTable(
  "tutor_preferred_time_slots",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    timeSlot: mysqlEnum("timeSlot", [
      "morning",
      "afternoon",
      "evening",
      "flexible",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.tutorId, table.timeSlot] })]
);

export const tutorTeachingLanguages = mysqlTable(
  "tutor_teaching_languages",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    languageId: int("languageId")
      .notNull()
      .references(() => languagesCatalog.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.tutorId, table.languageId] }),
    index("tutor_teaching_languages_catalog_idx").on(table.languageId),
  ]
);

export const tutorCommunicationPreferences = mysqlTable(
  "tutor_communication_preferences",
  {
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    channel: mysqlEnum("channel", [
      "phone",
      "whatsapp",
      "platform_message",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [primaryKey({ columns: [table.tutorId, table.channel] })]
);

export const tutorRequests = mysqlTable("tutor_requests", {
  id: int("id").autoincrement().primaryKey(),
  guardianUserId: int("guardianUserId").notNull(),
  tutorId: varchar("tutorId", { length: 32 }),
  tuitionType: mysqlEnum("tuitionType", ["home", "online", "both", "group", "package"]).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  curriculumType: varchar("curriculumType", { length: 32 }),
  classCourse: varchar("classCourse", { length: 120 }).notNull(),
  subjects: text("subjects").notNull(),
  /** Group-only maximum student capacity; null for every other request type and legacy rows. */
  groupCapacity: int("groupCapacity"),
  /** Package-only duration in months; null for every other request type and legacy rows. */
  packageDurationMonths: int("packageDurationMonths"),
  /** Required for Home, Online, and Package requests; Group uses groupCapacity instead. */
  studentCount: int("studentCount"),
  daysPerWeek: int("daysPerWeek").notNull(),
  preferredGender: mysqlEnum("preferredGender", ["male", "female", "any"])
    .default("any")
    .notNull(),
  studentFirstName: varchar("studentFirstName", { length: 80 }),
  /** Optional Student Gender, publishable only through the explicit approved-job projection. */
  studentGender: mysqlEnum("studentGender", ["male", "female"]),
  /** Private landmark or access note for the Guardian, Admin, and assigned Tutor only. */
  addressDetails: varchar("addressDetails", { length: 160 }),
  tuitionCityLocationId: varchar("tuitionCityLocationId", { length: 80 })
    .references(() => locations.id),
  tuitionLocationId: varchar("tuitionLocationId", { length: 80 })
    .references(() => locations.id),
  tuitionLocationLabel: varchar("tuitionLocationLabel", { length: 240 }),
  /**
   * The monthly salary offered, as one number. Nullable only because the two
   * requests made before the range and "Discuss with coordinator" options were
   * removed carry no figure; every new request must name one.
   */
  budgetAmount: int("budgetAmount"),
  /** Free text, not a pick from `academic_institutes`; optional, so blank stays null. */
  instituteName: varchar("instituteName", { length: 120 }),
  /** How the Guardian found us. Ours to count - never projected to the Job Board. */
  heardAboutUs: mysqlEnum("heardAboutUs", ["friends_family", "facebook", "websites", "others"]),
  notes: text("notes"),
  contactConsent: mysqlEnum("contactConsent", [
    "not_required",
    "pending",
    "approved",
    "declined",
  ])
    .default("not_required")
    .notNull(),
  monthlyBudget: int("monthlyBudget"),
  locationText: varchar("locationText", { length: 240 }).notNull(),
  status: mysqlEnum("status", ["new", "reviewing", "matched", "closed"])
    .default("new")
    .notNull(),
  publicationState: mysqlEnum("publicationState", tutorRequestPublicationStateValues)
    .default("submitted")
    .notNull(),
  guardianConfirmedAt: timestamp("guardianConfirmedAt"),
  /** One-time proof for an Admin expiry extension after a new Guardian call. */
  guardianReconfirmedAt: timestamp("guardianReconfirmedAt"),
  /** Recorded only when an Admin finalizes the Guardian and assigned Tutor appointment. */
  appointmentConfirmedAt: timestamp("appointmentConfirmedAt"),
  /** Private operational reason recorded by an Admin when closing a request. */
  cancellationReason: varchar("cancellationReason", { length: 280 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Updated by authorised matching and Guardian-edit workflow events for Admin queue follow-up. */
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
}, table => [
  index("tutor_requests_guardian_created_idx").on(table.guardianUserId, table.createdAt),
  index("tutor_requests_status_consent_idx").on(table.status, table.contactConsent),
  index("tutor_requests_publication_state_idx").on(table.publicationState, table.createdAt),
  index("tutor_requests_last_activity_idx").on(table.lastActivityAt),
]);

/**
 * Public Job Board projection. This intentionally stores only job-facing
 * attributes: raw Guardian contacts, student names, notes, and exact addresses
 * never enter this table and cannot reach public/Tutor reads from it.
 */
export const tutorJobs = mysqlTable("tutor_jobs", {
  id: int("id").autoincrement().primaryKey(),
  tutorRequestId: int("tutorRequestId")
    .notNull()
    .references(() => tutorRequests.id)
    .unique(),
  publicJobId: varchar("publicJobId", { length: 32 }).notNull().unique(),
  publicationStatus: mysqlEnum("publicationStatus", tutorJobPublicationStatusValues)
    .default("published")
    .notNull(),
  tuitionType: mysqlEnum("tuitionType", ["home", "online", "both", "group", "package"]).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  classCourse: varchar("classCourse", { length: 120 }).notNull(),
  subjects: text("subjects").notNull(),
  studentCount: int("studentCount").default(1).notNull(),
  studentGender: mysqlEnum("studentGender", ["male", "female", "any"]),
  preferredTutorGender: mysqlEnum("preferredTutorGender", ["male", "female", "any"])
    .default("any")
    .notNull(),
  daysPerWeek: int("daysPerWeek").notNull(),
  /**
   * The monthly salary offered, as one number. Nullable only because the two
   * requests made before the range and "Discuss with coordinator" options were
   * removed carry no figure; every new request must name one.
   */
  budgetAmount: int("budgetAmount"),
  /** The Guardian's note, carried onto the board after an Admin approves the request. */
  notes: text("notes"),
  country: varchar("country", { length: 120 }).default("Bangladesh").notNull(),
  cityLocationId: varchar("cityLocationId", { length: 80 }),
  locationId: varchar("locationId", { length: 80 }),
  locationLabel: varchar("locationLabel", { length: 240 }),
  /** Area/sub-area text only. Never store a street address or map coordinates. */
  directionLabel: varchar("directionLabel", { length: 240 }),
  publishedAt: timestamp("publishedAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  deactivatedAt: timestamp("deactivatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("tutor_jobs_publication_expiry_idx").on(table.publicationStatus, table.expiresAt),
  index("tutor_jobs_city_expiry_idx").on(table.cityLocationId, table.expiresAt),
  index("tutor_jobs_location_expiry_idx").on(table.locationId, table.expiresAt),
]);

/**
 * Private Tutor signal for an available public job. Guardian contacts, notes,
 * and addresses are deliberately not copied here; Admin review remains the
 * only path from interest to matching.
 */
export const tutorJobInterests = mysqlTable("tutor_job_interests", {
  id: int("id").autoincrement().primaryKey(),
  tutorJobId: int("tutorJobId")
    .notNull()
    .references(() => tutorJobs.id),
  tutorId: varchar("tutorId", { length: 32 })
    .notNull()
    .references(() => tutors.id),
  status: mysqlEnum("status", [
    "interested",
    "shortlisted",
    "declined",
    "matched",
    "withdrawn",
  ])
    .default("interested")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("tutor_job_interests_job_tutor_unique").on(table.tutorJobId, table.tutorId),
  index("tutor_job_interests_job_status_idx").on(table.tutorJobId, table.status),
  index("tutor_job_interests_tutor_status_idx").on(table.tutorId, table.status),
]);

/**
 * Append-only operational history for approved Tutor profile moderation.
 * It records only the decision context, never Tutor contact or credential data.
 */
export const tutorProfileModerationEvents = mysqlTable(
  "tutor_profile_moderation_events",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorId: varchar("tutorId", { length: 32 })
      .notNull()
      .references(() => tutors.id),
    adminUserId: int("adminUserId")
      .notNull()
      .references(() => users.id),
    previousStatus: mysqlEnum("previousStatus", tutorProfileStatusValues).notNull(),
    nextStatus: mysqlEnum("nextStatus", tutorProfileStatusValues).notNull(),
    reason: text("reason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("tutor_profile_moderation_events_tutor_created_idx").on(table.tutorId, table.createdAt),
    index("tutor_profile_moderation_events_admin_created_idx").on(table.adminUserId, table.createdAt),
  ]
);

/**
 * Append-only disclosure history for the Owner-approved Guardian contact view.
 * The related request provides the narrow operational context for every access.
 */
export const guardianContactAccessEvents = mysqlTable(
  "guardian_contact_access_events",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianUserId: int("guardianUserId")
      .notNull()
      .references(() => users.id),
    adminUserId: int("adminUserId")
      .notNull()
      .references(() => users.id),
    tutorRequestId: int("tutorRequestId")
      .notNull()
      .references(() => tutorRequests.id),
    context: mysqlEnum("context", guardianContactAccessContextValues).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("guardian_contact_access_events_guardian_created_idx").on(table.guardianUserId, table.createdAt),
    index("guardian_contact_access_events_admin_created_idx").on(table.adminUserId, table.createdAt),
    index("guardian_contact_access_events_request_created_idx").on(table.tutorRequestId, table.createdAt),
  ]
);

/**
 * Immutable operational history for Admin publication handling. Snapshots are
 * restricted to safe job-facing fields; Guardian contacts, student identity,
 * notes, and exact addresses are deliberately excluded.
 */
export const tutorRequestPublicationEvents = mysqlTable(
  "tutor_request_publication_events",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorRequestId: int("tutorRequestId")
      .notNull()
      .references(() => tutorRequests.id),
    adminUserId: int("adminUserId")
      .notNull()
      .references(() => users.id),
    action: mysqlEnum("action", tutorRequestPublicationActionValues).notNull(),
    previousState: mysqlEnum("previousState", tutorRequestPublicationStateValues).notNull(),
    nextState: mysqlEnum("nextState", tutorRequestPublicationStateValues).notNull(),
    reason: varchar("reason", { length: 1000 }),
    beforeSnapshot: text("beforeSnapshot"),
    afterSnapshot: text("afterSnapshot"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("tutor_request_publication_events_request_created_idx").on(table.tutorRequestId, table.createdAt),
    index("tutor_request_publication_events_admin_created_idx").on(table.adminUserId, table.createdAt),
  ]
);

/**
 * Private operational history for Guardian corrections and final Admin actions.
 * It records field names rather than duplicating private names, addresses,
 * notes, or budgets in historical snapshots.
 */
export const tutorRequestOperationEvents = mysqlTable(
  "tutor_request_operation_events",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorRequestId: int("tutorRequestId").notNull(),
    guardianUserId: int("guardianUserId").notNull(),
    actorUserId: int("actorUserId").notNull(),
    action: mysqlEnum("action", tutorRequestOperationActionValues).notNull(),
    changedFields: text("changedFields"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.tutorRequestId],
      foreignColumns: [tutorRequests.id],
      name: "tr_op_event_request_fk",
    }),
    foreignKey({
      columns: [table.guardianUserId],
      foreignColumns: [users.id],
      name: "tr_op_event_guardian_fk",
    }),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.id],
      name: "tr_op_event_actor_fk",
    }),
    index("tutor_request_operation_events_request_created_idx").on(table.tutorRequestId, table.createdAt),
    index("tutor_request_operation_events_guardian_created_idx").on(table.guardianUserId, table.createdAt),
  ]
);

/**
 * Guardian-only inbox events for authoritative request lifecycle changes and
 * deliberate Admin follow-ups. Messages never duplicate private request values.
 */
export const guardianRequestNotifications = mysqlTable(
  "guardian_request_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    guardianUserId: int("guardianUserId").notNull(),
    tutorRequestId: int("tutorRequestId").notNull(),
    type: mysqlEnum("type", guardianRequestNotificationTypeValues).notNull(),
    followUpKind: mysqlEnum("followUpKind", guardianRequestFollowUpKindValues),
    title: varchar("title", { length: 120 }).notNull(),
    message: varchar("message", { length: 360 }).notNull(),
    actionPath: varchar("actionPath", { length: 240 }).notNull(),
    deduplicationKey: varchar("deduplicationKey", { length: 160 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.guardianUserId], foreignColumns: [users.id], name: "grn_guardian_fk" }),
    foreignKey({ columns: [table.tutorRequestId], foreignColumns: [tutorRequests.id], name: "grn_request_fk" }),
    uniqueIndex("guardian_request_notifications_dedup_unique").on(table.deduplicationKey),
    index("guardian_request_notifications_guardian_created_idx").on(table.guardianUserId, table.createdAt),
    index("guardian_request_notifications_guardian_read_idx").on(table.guardianUserId, table.readAt),
  ]
);

/** Append-only Admin-only matching context. Corrections are recorded as a new note. */
export const tutorRequestAssignmentNotes = mysqlTable(
  "tutor_request_assignment_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorRequestId: int("tutorRequestId").notNull(),
    adminUserId: int("adminUserId").notNull(),
    category: mysqlEnum("category", tutorRequestAssignmentNoteCategoryValues).notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.tutorRequestId], foreignColumns: [tutorRequests.id], name: "tran_request_fk" }),
    foreignKey({ columns: [table.adminUserId], foreignColumns: [users.id], name: "tran_admin_fk" }),
    index("tutor_request_assignment_notes_request_created_idx").on(table.tutorRequestId, table.createdAt),
    index("tutor_request_assignment_notes_admin_created_idx").on(table.adminUserId, table.createdAt),
  ]
);

/**
 * Private, personal Admin Matching filter presets. This record deliberately
 * stores only a validated filter configuration; it never stores matched
 * request, Guardian, Tutor, contact, address, or note data.
 */
export const adminMatchingSavedViews = mysqlTable(
  "admin_matching_saved_views",
  {
    id: int("id").autoincrement().primaryKey(),
    adminUserId: int("adminUserId").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    filters: text("filters").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.adminUserId], foreignColumns: [users.id], name: "amsv_admin_fk" }),
    uniqueIndex("admin_matching_saved_views_owner_name_unique").on(table.adminUserId, table.name),
    index("admin_matching_saved_views_owner_updated_idx").on(table.adminUserId, table.updatedAt),
  ]
);

/**
 * Private per-Admin pointer to one Saved View. This relationship stores only
 * ownership metadata and never saves request, Guardian, Tutor, contact,
 * address, note, or matching-result data.
 */
export const adminMatchingDefaultSavedViews = mysqlTable(
  "admin_matching_default_saved_views",
  {
    adminUserId: int("adminUserId").primaryKey(),
    savedViewId: int("savedViewId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.adminUserId], foreignColumns: [users.id], name: "amdsv_admin_fk" }),
    foreignKey({ columns: [table.savedViewId], foreignColumns: [adminMatchingSavedViews.id], name: "amdsv_view_fk" }),
    uniqueIndex("amdsv_saved_view_unique").on(table.savedViewId),
  ]
);

/**
 * Private, versioned confirmation-letter history. `contentSnapshot` contains
 * only approved operational fields, never contacts, student identity, address
 * details, or Admin notes.
 */
export const confirmationLetters = mysqlTable(
  "confirmation_letters",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorRequestId: int("tutorRequestId").notNull(),
    guardianUserId: int("guardianUserId").notNull(),
    tutorId: varchar("tutorId", { length: 32 }).notNull(),
    createdByAdminUserId: int("createdByAdminUserId").notNull(),
    issuedByAdminUserId: int("issuedByAdminUserId"),
    status: mysqlEnum("status", confirmationLetterStatusValues).default("draft").notNull(),
    letterNumber: varchar("letterNumber", { length: 48 }).notNull(),
    version: int("version").notNull(),
    agreedStartDate: date("agreedStartDate"),
    agreedFeeMinimum: int("agreedFeeMinimum"),
    agreedFeeMaximum: int("agreedFeeMaximum"),
    contentSnapshot: text("contentSnapshot").notNull(),
    revisionReason: varchar("revisionReason", { length: 280 }),
    pdfStorageKey: varchar("pdfStorageKey", { length: 500 }),
    reviewedAt: timestamp("reviewedAt"),
    issuedAt: timestamp("issuedAt"),
    supersededAt: timestamp("supersededAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.tutorRequestId], foreignColumns: [tutorRequests.id], name: "cl_request_fk" }),
    foreignKey({ columns: [table.guardianUserId], foreignColumns: [users.id], name: "cl_guardian_fk" }),
    foreignKey({ columns: [table.tutorId], foreignColumns: [tutors.id], name: "cl_tutor_fk" }),
    foreignKey({ columns: [table.createdByAdminUserId], foreignColumns: [users.id], name: "cl_created_admin_fk" }),
    foreignKey({ columns: [table.issuedByAdminUserId], foreignColumns: [users.id], name: "cl_issued_admin_fk" }),
    uniqueIndex("confirmation_letters_number_unique").on(table.letterNumber),
    uniqueIndex("confirmation_letters_request_version_unique").on(table.tutorRequestId, table.version),
    index("confirmation_letters_guardian_issued_idx").on(table.guardianUserId, table.issuedAt),
    index("confirmation_letters_tutor_issued_idx").on(table.tutorId, table.issuedAt),
  ]
);

/** Private issued-letter alerts for the assigned Tutor; no general Tutor request notifications are created here. */
export const tutorConfirmationLetterNotifications = mysqlTable(
  "tutor_confirmation_letter_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    tutorId: varchar("tutorId", { length: 32 }).notNull(),
    confirmationLetterId: int("confirmationLetterId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    actionPath: varchar("actionPath", { length: 500 }).notNull(),
    deduplicationKey: varchar("deduplicationKey", { length: 180 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    foreignKey({ columns: [table.tutorId], foreignColumns: [tutors.id], name: "tcln_tutor_fk" }),
    foreignKey({ columns: [table.confirmationLetterId], foreignColumns: [confirmationLetters.id], name: "tcln_letter_fk" }),
    uniqueIndex("tutor_cl_notice_dedupe_unique").on(table.deduplicationKey),
    index("tutor_cl_notice_tutor_created_idx").on(table.tutorId, table.createdAt),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  tutorProfile: one(tutors, {
    fields: [users.id],
    references: [tutors.userId],
  }),
  tutorRegistration: one(tutorRegistrations, {
    fields: [users.id],
    references: [tutorRegistrations.userId],
  }),
  tutorRequests: many(tutorRequests),
}));

export const tutorRegistrationsRelations = relations(
  tutorRegistrations,
  ({ one }) => ({
    user: one(users, {
      fields: [tutorRegistrations.userId],
      references: [users.id],
    }),
  })
);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
  }),
  children: many(locations),
  tutors: many(tutors),
}));

export const tutorsRelations = relations(tutors, ({ one, many }) => ({
  user: one(users, { fields: [tutors.userId], references: [users.id] }),
  location: one(locations, {
    fields: [tutors.locationId],
    references: [locations.id],
  }),
  requests: many(tutorRequests),
  academicProfile: one(tutorAcademicProfiles),
  teachingAreas: many(tutorTeachingAreas),
  subjectSelections: many(tutorSubjects),
  classLevelSelections: many(tutorClassLevels),
  curriculumSelections: many(tutorCurricula),
  studentTypeSelections: many(tutorStudentTypes),
  preferredClassSizes: many(tutorPreferredClassSizes),
  preferredTeachingDays: many(tutorPreferredTeachingDays),
  preferredTimeSlots: many(tutorPreferredTimeSlots),
  teachingLanguageSelections: many(tutorTeachingLanguages),
  communicationPreferences: many(tutorCommunicationPreferences),
}));

export const universitiesRelations = relations(universities, ({ many }) => ({
  academicProfiles: many(tutorAcademicProfiles),
}));

export const facultyDepartmentsRelations = relations(
  facultyDepartments,
  ({ many }) => ({
    degreeMajors: many(degreeMajors),
    academicProfiles: many(tutorAcademicProfiles),
  })
);

export const degreeMajorsRelations = relations(
  degreeMajors,
  ({ one, many }) => ({
    facultyDepartment: one(facultyDepartments, {
      fields: [degreeMajors.facultyDepartmentId],
      references: [facultyDepartments.id],
    }),
    academicProfiles: many(tutorAcademicProfiles),
  })
);

export const tutorAcademicProfilesRelations = relations(
  tutorAcademicProfiles,
  ({ one }) => ({
    tutor: one(tutors, {
      fields: [tutorAcademicProfiles.tutorId],
      references: [tutors.id],
    }),
    university: one(universities, {
      fields: [tutorAcademicProfiles.universityId],
      references: [universities.id],
    }),
    facultyDepartment: one(facultyDepartments, {
      fields: [tutorAcademicProfiles.facultyDepartmentId],
      references: [facultyDepartments.id],
    }),
    degreeMajor: one(degreeMajors, {
      fields: [tutorAcademicProfiles.degreeMajorId],
      references: [degreeMajors.id],
    }),
  })
);

export const tutorTeachingAreasRelations = relations(
  tutorTeachingAreas,
  ({ one }) => ({
    tutor: one(tutors, {
      fields: [tutorTeachingAreas.tutorId],
      references: [tutors.id],
    }),
    location: one(locations, {
      fields: [tutorTeachingAreas.locationId],
      references: [locations.id],
    }),
  })
);

export const tutorSubjectsRelations = relations(tutorSubjects, ({ one }) => ({
  tutor: one(tutors, {
    fields: [tutorSubjects.tutorId],
    references: [tutors.id],
  }),
  subject: one(subjectsCatalog, {
    fields: [tutorSubjects.subjectId],
    references: [subjectsCatalog.id],
  }),
}));

export const tutorClassLevelsRelations = relations(
  tutorClassLevels,
  ({ one }) => ({
    tutor: one(tutors, {
      fields: [tutorClassLevels.tutorId],
      references: [tutors.id],
    }),
    classLevel: one(classLevels, {
      fields: [tutorClassLevels.classLevelId],
      references: [classLevels.id],
    }),
  })
);

export const tutorCurriculaRelations = relations(tutorCurricula, ({ one }) => ({
  tutor: one(tutors, {
    fields: [tutorCurricula.tutorId],
    references: [tutors.id],
  }),
  curriculum: one(curricula, {
    fields: [tutorCurricula.curriculumId],
    references: [curricula.id],
  }),
}));

export const tutorStudentTypesRelations = relations(
  tutorStudentTypes,
  ({ one }) => ({
    tutor: one(tutors, {
      fields: [tutorStudentTypes.tutorId],
      references: [tutors.id],
    }),
    studentType: one(studentTypes, {
      fields: [tutorStudentTypes.studentTypeId],
      references: [studentTypes.id],
    }),
  })
);

export const tutorTeachingLanguagesRelations = relations(
  tutorTeachingLanguages,
  ({ one }) => ({
    tutor: one(tutors, {
      fields: [tutorTeachingLanguages.tutorId],
      references: [tutors.id],
    }),
    language: one(languagesCatalog, {
      fields: [tutorTeachingLanguages.languageId],
      references: [languagesCatalog.id],
    }),
  })
);

export const tutorRequestsRelations = relations(tutorRequests, ({ one }) => ({
  guardian: one(users, {
    fields: [tutorRequests.guardianUserId],
    references: [users.id],
  }),
  tutor: one(tutors, {
    fields: [tutorRequests.tutorId],
    references: [tutors.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TutorRegistration = typeof tutorRegistrations.$inferSelect;
export type InsertTutorRegistration = typeof tutorRegistrations.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type Tutor = typeof tutors.$inferSelect;
export type InsertTutor = typeof tutors.$inferInsert;
export type TutorRequest = typeof tutorRequests.$inferSelect;
export type InsertTutorRequest = typeof tutorRequests.$inferInsert;
export type University = typeof universities.$inferSelect;
export type FacultyDepartment = typeof facultyDepartments.$inferSelect;
export type DegreeMajor = typeof degreeMajors.$inferSelect;
export type TutorAcademicProfile = typeof tutorAcademicProfiles.$inferSelect;
