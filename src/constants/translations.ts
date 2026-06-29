import { Language } from '../types/language';

export const translations: Record<
  Language,
  {
    loading: string;
    hero: {
      ctaPrimary: string;
      ctaSecondary: string;
      ctaResume: string;
      availability: string;
      chip1: string;
      chip2: string;
      chip3: string;
      statExperience: string;
      statExperienceValue: string;
      statProjects: string;
      statProjectsValue: string;
      statFocus: string;
      statFocusValue: string;
    };
    sections: {
      about: string;
      technologies: string;
      technologiesPlaceholder: string;
      experience: string;
      education: string;
      professionalExperience: string;
      projects: string;
      certifications: string;
      contributions: string;
      contact: string;
      resume: string;
    };
    projects: {
      viewProject: string;
    };
    contributions: {
      subtitle: string;
      totalLabel: string;
      viewProfile: string;
      loading: string;
      unable: string;
      visitProfile: string;
      tooltipLabel: string;
      chartLabel: string;
      monthLocale: string;
    };
    contact: {
      intro: string;
      introEmphasis: string;
      viewPortfolio: string;
      personalSite: string;
      githubHighlight: string;
      githubHighlightPrefix: string;
      githubHighlightLink: string;
      visitGithub: string;
    };
    resume: {
      viewResume: string;
      modalTitle: string;
      download: string;
      close: string;
    };
    languageToggle: {
      label: string;
      english: string;
      german: string;
    };
  }
> = {
  en: {
    loading: 'Loading...',
    hero: {
      ctaPrimary: 'Get In Touch',
      ctaSecondary: 'View Projects',
      ctaResume: 'View Resume',
      availability: 'Student Assistant at SCC · KIT Karlsruhe',
      chip1: 'Full Stack Dev',
      chip2: 'MSc CS @ KIT',
      chip3: 'HiWi @ SCC',
      statExperience: 'Experience',
      statExperienceValue: 'Professional',
      statProjects: 'Projects',
      statProjectsValue: 'Multiple',
      statFocus: 'Focus',
      statFocusValue: 'Innovation',
    },
    sections: {
      about: 'About Me',
      technologies: 'Tech Stack',
      technologiesPlaceholder: 'Select a category to view technologies',
      experience: 'Education & Experience',
      education: 'Education',
      professionalExperience: 'Professional Experience',
      projects: 'Professional Projects',
      certifications: 'Certifications',
      contributions: 'GitHub Contributions',
      contact: "Let's Connect",
      resume: 'Resume',
    },
    projects: {
      viewProject: 'View Project →',
    },
    contributions: {
      subtitle: 'Live contribution activity over the last 3 years',
      totalLabel: 'total contributions',
      viewProfile: 'View full profile',
      loading: 'Loading contributions...',
      unable: 'Unable to load contributions data.',
      visitProfile: 'Visit GitHub profile',
      tooltipLabel: 'contributions',
      chartLabel: 'Contributions',
      monthLocale: 'en-US',
    },
    contact: {
      intro: "I'm currently working as a Student Assistant at the Scientific Computing Center (SCC), KIT, focusing on JavaScript-based integration with DSL languages - combining web technologies with scientific computing.",
      introEmphasis: "With 3+ years of practical experience, I'd love to connect and discuss technology, collaboration, or new ideas!",
      viewPortfolio: 'View Portfolio',
      personalSite: 'Personal Site',
      githubHighlight: 'One of the top contributors at Newfold Digital • Check out my open-source work',
      githubHighlightPrefix: 'One of the top contributors at Newfold Digital',
      githubHighlightLink: 'Check out my open-source work',
      visitGithub: 'Visit GitHub Profile',
    },
    resume: {
      viewResume: 'View My Resume',
      modalTitle: 'Resume',
      download: 'Download',
      close: 'Close',
    },
    languageToggle: {
      label: 'Language',
      english: 'English',
      german: 'Deutsch',
    },
  },
  de: {
    loading: 'Lädt...',
    hero: {
      ctaPrimary: 'Kontakt aufnehmen',
      ctaSecondary: 'Projekte ansehen',
      ctaResume: 'Lebenslauf ansehen',
      availability: 'Studentische Hilfskraft am SCC · KIT Karlsruhe',
      chip1: 'Full-Stack-Entwickler',
      chip2: 'MSc CS @ KIT',
      chip3: 'HiWi @ SCC',
      statExperience: 'Erfahrung',
      statExperienceValue: 'Beruflich',
      statProjects: 'Projekte',
      statProjectsValue: 'Mehrere',
      statFocus: 'Fokus',
      statFocusValue: 'Innovation',
    },
    sections: {
      about: 'Über mich',
      technologies: 'Tech-Stack',
      technologiesPlaceholder: 'Wählen Sie eine Kategorie, um Technologien anzuzeigen',
      experience: 'Ausbildung & Erfahrung',
      education: 'Ausbildung',
      professionalExperience: 'Berufserfahrung',
      projects: 'Professionelle Projekte',
      certifications: 'Zertifizierungen',
      contributions: 'GitHub-Beiträge',
      contact: 'Kontakt',
      resume: 'Lebenslauf',
    },
    projects: {
      viewProject: 'Projekt ansehen →',
    },
    contributions: {
      subtitle: 'Live-Beitragsaktivität der letzten 3 Jahre',
      totalLabel: 'Beiträge insgesamt',
      viewProfile: 'Vollständiges Profil ansehen',
      loading: 'Beiträge werden geladen...',
      unable: 'Beitragsdaten konnten nicht geladen werden.',
      visitProfile: 'GitHub-Profil besuchen',
      tooltipLabel: 'Beiträge',
      chartLabel: 'Beiträge',
      monthLocale: 'de-DE',
    },
    contact: {
      intro: 'Ich arbeite derzeit als studentische Hilfskraft am Scientific Computing Center (SCC), KIT, mit Schwerpunkt auf JavaScript-basierter Integration mit DSL-Sprachen - eine Verbindung von Webtechnologien mit wissenschaftlichem Computing.',
      introEmphasis: 'Mit rund 3 Jahren Praxiserfahrung freue ich mich über Austausch zu Technologie, Zusammenarbeit oder neuen Ideen!',
      viewPortfolio: 'Portfolio ansehen',
      personalSite: 'Persönliche Seite',
      githubHighlight: 'Einer der Top-Mitwirkenden bei Newfold Digital • Sieh dir meine Open-Source-Arbeit an',
      githubHighlightPrefix: 'Einer der Top-Mitwirkenden bei Newfold Digital',
      githubHighlightLink: 'Sieh dir meine Open-Source-Arbeit an',
      visitGithub: 'GitHub-Profil besuchen',
    },
    resume: {
      viewResume: 'Meinen Lebenslauf ansehen',
      modalTitle: 'Lebenslauf',
      download: 'Herunterladen',
      close: 'Schließen',
    },
    languageToggle: {
      label: 'Sprache',
      english: 'English',
      german: 'Deutsch',
    },
  },
};
