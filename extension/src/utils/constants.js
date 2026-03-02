// constants.js
// Shared constants used across extension modules

const CONSTANTS = {
  API_BASE_URL: "http://localhost:5000",

  CSS_CLASSES: {
    FILLED: "saf-filled",
    MISSING: "saf-missing",
    BADGE: "saf-badge",
    OVERLAY: "saf-overlay",
    AI_DRAFT: "saf-ai-draft",
  },

  // (use ProfileStorage module — not directly)
  STORAGE_KEYS: {
    PROFILE: "smart_autofill_profile",
    SETTINGS: "smart_autofill_settings",
    USAGE: "smart_autofill_usage",
  },

  // Rule-based field patterns
  // Keys match profile field names
  FIELD_PATTERNS: {
    full_name: {
      labels: ["full name", "name", "your name", "applicant name", "complete name"],
      attrs: ["name", "full_name", "fullname", "full-name", "applicant-name"],
      placeholders: ["full name", "enter your name", "your name"],
    },
    first_name: {
      labels: ["first name", "given name", "firstname"],
      attrs: ["firstname", "first_name", "first-name", "given_name", "fname"],
      placeholders: ["first name", "given name"],
    },
    last_name: {
      labels: ["last name", "surname", "family name", "lastname"],
      attrs: ["lastname", "last_name", "last-name", "surname", "lname"],
      placeholders: ["last name", "surname"],
    },
    email: {
      labels: ["email", "email address", "e-mail", "work email"],
      attrs: ["email", "email_address", "emailaddress", "user_email"],
      placeholders: ["email", "your email", "email address"],
      inputType: ["email"],
    },
    phone: {
      labels: ["phone", "phone number", "mobile", "contact number", "telephone"],
      attrs: ["phone", "phone_number", "phonenumber", "mobile", "tel", "telephone", "contact"],
      placeholders: ["phone", "mobile number", "phone number"],
      inputType: ["tel"],
    },
    linkedin: {
      labels: ["linkedin", "linkedin url", "linkedin profile", "linkedin link"],
      attrs: ["linkedin", "linkedin_url", "linkedinprofile", "linkedin_profile"],
      placeholders: ["linkedin", "linkedin.com/in/", "linkedin url"],
    },
    github: {
      labels: ["github", "github url", "github profile", "portfolio"],
      attrs: ["github", "github_url", "githubprofile", "portfolio_url", "portfolio"],
      placeholders: ["github", "github.com/", "portfolio url"],
    },
    website: {
      labels: ["website", "personal website", "portfolio website", "personal site"],
      attrs: ["website", "personal_website", "portfolio", "personal_site", "site_url"],
      placeholders: ["https://", "website", "portfolio"],
    },
    city: {
      labels: ["city", "city / town", "town"],
      attrs: ["city", "town", "city_name"],
      placeholders: ["city", "your city"],
    },
    state: {
      labels: ["state", "province", "region"],
      attrs: ["state", "province", "region"],
      placeholders: ["state", "province"],
    },
    country: {
      labels: ["country", "nationality", "country of residence"],
      attrs: ["country", "nationality", "country_of_residence"],
      placeholders: ["country", "select country"],
    },
    zip_code: {
      labels: ["zip", "postal code", "zip code", "pin code", "pincode"],
      attrs: ["zip", "zipcode", "zip_code", "postal_code", "postalcode", "pincode"],
      placeholders: ["zip code", "postal code"],
    },
    address: {
      labels: ["address", "street address", "current address", "residential address"],
      attrs: ["address", "street_address", "current_address", "residential_address"],
      placeholders: ["address", "street address"],
    },
    university: {
      labels: ["university", "college", "institution", "school", "alma mater"],
      attrs: ["university", "college", "institution", "school", "alma_mater"],
      placeholders: ["university", "college name"],
    },
    degree: {
      labels: ["degree", "qualification", "education level", "highest degree"],
      attrs: ["degree", "qualification", "education_level", "highest_degree"],
      placeholders: ["degree", "e.g. B.Tech"],
    },
    graduation_year: {
      labels: ["graduation year", "expected graduation", "pass out year", "batch"],
      attrs: ["graduation_year", "expected_graduation", "passout_year", "batch", "grad_year"],
      placeholders: ["graduation year", "2024", "2025"],
    },
    current_company: {
      labels: ["current company", "employer", "current employer", "company name", "organization"],
      attrs: ["current_company", "employer", "company_name", "organization", "current_employer"],
      placeholders: ["company", "employer name"],
    },
    current_title: {
      labels: ["job title", "current role", "designation", "position", "role"],
      attrs: ["job_title", "current_role", "designation", "position", "role", "title"],
      placeholders: ["job title", "your role"],
    },
    years_experience: {
      labels: ["years of experience", "experience", "total experience", "work experience"],
      attrs: ["years_experience", "experience", "total_experience", "work_experience", "yoe"],
      placeholders: ["years of experience", "e.g. 2"],
    },
  },

  // Open-ended question trigger keywords (used in Phase 3)
  OPEN_ENDED_KEYWORDS: [
    "why do you",
    "why should we",
    "tell us about",
    "describe yourself",
    "describe your",
    "what motivates",
    "cover letter",
    "additional information",
    "about yourself",
    "strengths",
    "weaknesses",
    "long term goal",
    "where do you see",
    "passion",
    "what makes you",
  ],
};

window.CONSTANTS = CONSTANTS;
