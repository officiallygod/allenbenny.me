import { Language } from '../types/language';

export const translations: Record<
  Language,
  {
    loading: string;
    hero: {
      ctaPrimary: string;
      ctaSecondary: string;
      ctaResume: string;
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
      intro: 'Seeking Werkstudent opportunities (15-20h/week) in Karlsruhe and surrounding areas.',
      introEmphasis: "Let's discuss how I can contribute to your team!",
      viewPortfolio: 'View Portfolio',
      personalSite: 'Personal Site',
      githubHighlight: 'One of the top contributors at Newfold Digital • Check out my open-source work',
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
      intro: 'Suche nach Werkstudentenstellen (15–20 Std./Woche) in Karlsruhe und Umgebung.',
      introEmphasis: 'Lass uns besprechen, wie ich dein Team unterstützen kann!',
      viewPortfolio: 'Portfolio ansehen',
      personalSite: 'Persönliche Seite',
      githubHighlight: 'Einer der Top-Mitwirkenden bei Newfold Digital • Sieh dir meine Open-Source-Arbeit an',
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
