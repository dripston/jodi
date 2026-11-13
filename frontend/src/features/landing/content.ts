/**
 * Every editable string on the public landing page lives here.
 * Claims must match what the working product does today; no invented partners or certifications.
 */

/** Entry point of the existing working application. */
export const APP_PATH = '/app';

export const BRAND = {
  name: 'Jodi',
  tagline: 'Care that stays with her, every step of the first 42 days.',
};

export const NAV_LINKS = [
  { href: '#why', label: 'Why Jodi' },
  { href: '#how', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#teams', label: 'For Healthcare Teams' },
] as const;

export const HERO = {
  eyebrow: 'Postpartum care • First 42 days',
  title: 'The care a mother deserves doesn’t end at discharge.',
  description:
    'Jodi keeps mothers and newborns connected to essential postpartum care through a simple voice companion, timely follow-ups and coordinated healthcare support.',
  primary: 'Explore Jodi',
  secondary: 'See How It Works',
  facts: [
    { value: '42', label: 'days of follow-up after delivery' },
    { value: '2', label: 'lives tracked as one pair' },
    { value: '3', label: 'languages: Kannada, Hindi, English' },
  ],
};

export const JOURNEY = {
  badge: 'The first 42 days',
  title: 'One journey. Two lives. Continuous care.',
  lead: 'Mothers usually go home within a day or two of delivery. The weeks that follow are when support matters most, and when it is easiest to lose touch.',
  note: 'An overview of the support journey. It is not a clinical protocol and does not replace medical advice.',
  stages: [
    {
      days: 'Days 1–7',
      title: 'Early recovery',
      points: [
        'Support after discharge',
        'Newborn and maternal follow-up',
        'Important warning signs and timely escalation',
      ],
    },
    {
      days: 'Days 8–21',
      title: 'Continued monitoring',
      points: [
        'Ongoing check-ins',
        'Feeding, recovery and newborn wellbeing',
        'ASHA follow-up coordination',
      ],
    },
    {
      days: 'Days 22–42',
      title: 'Staying connected',
      points: [
        'Continued care and guidance',
        'Follow-up completion',
        'Support beyond the immediate post-delivery period',
      ],
    },
  ],
};

export const HOW = {
  badge: 'How it works',
  title: 'Simple for mothers. Actionable for healthcare teams.',
  lead: 'A phone call is the whole interface for the family. Everything else happens behind it, for the people who look after her.',
  steps: [
    {
      title: 'A voice companion for mothers',
      body: 'Mothers can communicate naturally using supported languages and accessible voice interactions, on any phone.',
    },
    {
      title: 'Intelligent information capture',
      body: 'Conversations can help structure relevant information, follow-up needs and reported concerns.',
    },
    {
      title: 'Connected healthcare support',
      body: 'ASHA workers and district teams can access the information and workflows relevant to their roles.',
    },
  ],
};

export const BENTO = {
  badge: 'Platform features',
  title: 'Everything connected around mother and baby.',
  cards: [
    {
      title: 'Voice-first care',
      body: 'Check-in calls in Kannada, Hindi or English. Simple, spoken and accessible, with no app to install.',
    },
    {
      title: 'Mother and newborn tracking',
      body: 'One record for the pair: mother and baby status, source-labelled entries and follow-up progress.',
    },
    {
      title: 'ASHA worker workspace',
      body: 'Assigned families in priority order, open alerts, one-tap calling and “Mark reached”.',
    },
    {
      title: 'District-level visibility',
      body: 'Open alerts, call completion and ASHA follow-up across the whole programme.',
    },
  ],
};

export const AUDIENCE = {
  badge: 'Built for the people who care',
  title: 'Different responsibilities. One connected system.',
  panels: [
    {
      title: 'For ASHA workers',
      points: [
        'A clear view of assigned mothers',
        'Follow-up coordination',
        'Access to relevant reported concerns',
        'A focused workspace for frontline care',
      ],
    },
    {
      title: 'For district health teams',
      points: [
        'Programme-level overview',
        'Visibility into follow-up progress',
        'Operational monitoring',
        'A consolidated view of care activities',
      ],
    },
  ],
};

export const TRUST = {
  badge: 'Trust and responsibility',
  title: 'Technology that supports care. Not replaces it.',
  lead: 'AI understands what was said. Fixed, reviewable rules decide the status. People confirm and act.',
  points: [
    {
      title: 'A support and coordination tool',
      body: 'Jodi helps families and health workers stay in touch. It is not a clinical service.',
    },
    {
      title: 'Not a diagnosis',
      body: 'AI-generated information should never be treated as a medical diagnosis.',
    },
    {
      title: 'People make clinical decisions',
      body: 'Clinical decisions and escalation stay with qualified healthcare professionals.',
    },
    {
      title: 'Reported is not measured',
      body: 'Every entry shows its source, so what a family reported looks different from a verified measurement.',
    },
    {
      title: 'Sensitive data handled with care',
      body: 'Health information is personal. Access follows role, and every record change is logged.',
    },
  ],
};

export const TABS = {
  badge: 'Inside Jodi',
  title: 'Take a closer look at the working platform.',
  cta: 'Open the Jodi Dashboard',
  items: [
    {
      id: 'overview',
      label: 'Overview',
      caption: 'The district view: who needs help now, and how follow-up is going.',
    },
    {
      id: 'mothers',
      label: 'Mothers',
      caption: 'Every enrolled mother and baby, with status, day and next call.',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      caption: 'Each alert stays open until a person confirms the family was reached.',
    },
    {
      id: 'asha',
      label: 'ASHA Workspace',
      caption: 'A phone-first list of today’s families, most urgent first.',
    },
    {
      id: 'live',
      label: 'Live Voice Experience',
      caption: 'A check-in call becoming structured, source-labelled entries.',
    },
  ],
} as const;

export type PreviewTabId = (typeof TABS.items)[number]['id'];

export const FAQ = {
  badge: 'Questions',
  title: 'Frequently asked questions',
  lead: 'Short answers about what Jodi is and how to explore it.',
  items: [
    {
      q: 'What is Jodi?',
      a: 'Jodi is a postpartum care companion designed to support mothers and newborns during the first 42 days after childbirth.',
    },
    {
      q: 'Who is Jodi designed for?',
      a: 'Jodi is designed around mothers, newborns, ASHA workers and district healthcare teams.',
    },
    {
      q: 'How can mothers interact with Jodi?',
      a: 'Jodi is designed for accessible voice-based interaction using its supported languages: Kannada, Hindi and English.',
    },
    {
      q: 'Does Jodi replace doctors or healthcare workers?',
      a: 'No. Jodi supports communication, follow-up and coordination. It does not replace qualified healthcare professionals or clinical judgement.',
    },
    {
      q: 'Can I explore the working application?',
      a: 'Yes. Use the Launch Jodi button to open the live project demonstration.',
    },
  ],
};

export const FINAL_CTA = {
  title: 'The first 42 days matter. Let’s make every connection count.',
  body: 'Explore how Jodi brings mothers, newborns and healthcare teams closer through connected postpartum care.',
  button: 'Explore the Jodi Platform',
};

export const FOOTER_LINKS = [
  { href: '#why', label: 'Why Jodi' },
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How It Works' },
  { href: '#teams', label: 'Healthcare Teams' },
] as const;
