import { SocialIconType } from '../types/social';
import { Language } from '../types/language';

export interface Technology {
  name: string;
  category?: string;
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  duration: string;
}

export interface SocialLink {
  name: string;
  url: string;
  icon: SocialIconType;
}

export interface Project {
  title: string;
  description: string;
  link?: string;
  date: string;
}

export interface Certification {
  title: string;
  issuer: string;
  date: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface ProfileData {
  name: string;
  title: string;
  tagline: string;
  bio: string[];
  technologies: Technology[];
  experience: Experience[];
  education: Education[];
  socialLinks: SocialLink[];
  githubUrl: string;
  projects: Project[];
  certifications: Certification[];
  contact: ContactInfo;
  skills: Skill[];
  portfolioUrl: string;
  personalSiteUrl: string;
}

export const profileData: Record<Language, ProfileData> = {
  en: {
    name: 'Allen Benny',
    title: 'MSc Computer Science Student | Full Stack Developer | Seeking Werkstudent Role',
    tagline: '3+ years building scalable systems • AI & WordPress onboarding at Newfold Digital • Available 15-20h/week in Karlsruhe',
    bio: [
      'MSc Computer Science student at KIT (Karlsruhe Institute of Technology) with 3+ years of experience building scalable onboarding systems and AI-powered features at Newfold Digital. Specialized in PHP, React, JavaScript, Node.js, WordPress, and TypeScript.',
      'Led development of open-source WordPress onboarding serving 1000+ daily users, integrated AI features from prompts, and optimized performance with advanced React patterns (Memo, caching). Represented Bluehost at WordCamp Sylhet 2023 and awarded Edward De Bono Award for innovation.',
      'Fast learner with strong communication, teamwork, and problem-solving skills. Actively seeking Werkstudent position (15-20 hours/week) in software development—Full Stack, Backend, Frontend, Web, or App Development.',
    ],
    technologies: [
      { name: 'PHP', category: 'Language' },
      { name: 'JavaScript', category: 'Language' },
      { name: 'TypeScript', category: 'Language' },
      { name: 'Java', category: 'Language' },
      { name: 'C', category: 'Language' },
      { name: 'C++', category: 'Language' },
      { name: 'Dart', category: 'Language' },
      { name: 'Python', category: 'Language' },
      { name: 'SQL', category: 'Language' },
      { name: 'React', category: 'Framework' },
      { name: 'Node.js', category: 'Framework' },
      { name: 'Express.js', category: 'Framework' },
      { name: 'Django', category: 'Framework' },
      { name: 'Flask', category: 'Framework' },
      { name: 'Flutter', category: 'Framework' },
      { name: 'WordPress', category: 'Framework' },
      { name: 'REST APIs', category: 'Framework' },
      { name: 'Cypress', category: 'Tool' },
      { name: 'Git', category: 'Tool' },
      { name: 'GitHub', category: 'Tool' },
      { name: 'GitHub Actions', category: 'Tool' },
      { name: 'Docker', category: 'Tool' },
      { name: 'Linux/Bash', category: 'Tool' },
      { name: 'Postman', category: 'Tool' },
      { name: 'NPM', category: 'Tool' },
      { name: 'Yarn', category: 'Tool' },
      { name: 'VS Code', category: 'Tool' },
      { name: 'JIRA', category: 'Tool' },
      { name: 'Cloudflare', category: 'Cloud' },
      { name: 'CDN', category: 'Cloud' },
      { name: 'CI/CD', category: 'Cloud' },
      { name: 'OpenAI API', category: 'AI' },
    ],
    experience: [
      {
        company: 'Newfold Digital',
        role: 'Software Development Engineer (Full Stack)',
        duration: 'Jan 2022 – Present',
        description: 'Built open-source modern WordPress onboarding (PHP, React) serving 1000+ users daily. Developed AI-powered onboarding experience from prompts. Created task systems & cron jobs for plugin installation automation. Optimized performance and reliability with advanced React features (Memo, caching) for responsive onboarding. Developed WordPress template drawer. Top contributor to team codebase. Represented Bluehost at WordCamp Sylhet 2023. Awarded Edward De Bono Award for innovation.',
      },
      {
        company: 'TecideXa Services',
        role: 'Lead Developer Intern',
        duration: 'Dec 2020 – Jan 2021',
        description: 'Designed, developed, and tested Flutter client applications. Led development initiatives and ensured high-quality code delivery.',
      },
      {
        company: 'Gliitz (Freelance)',
        role: 'App Developer',
        duration: 'Aug 2020 – Nov 2020',
        description: 'Translated UI/UX designs into production-ready Flutter applications. Conducted rigorous testing and deployment to ensure high quality and reliability.',
      },
      {
        company: 'Itukaa (Freelance)',
        role: 'App Developer',
        duration: 'Apr 2021 – Jun 2021',
        description: 'Built and deployed market-ready application for construction materials company. Improved operational efficiency through custom mobile solutions.',
      },
    ],
    education: [
      {
        institution: 'Karlsruhe Institute of Technology (KIT)',
        degree: 'MSc in Computer Science',
        duration: 'Expected May 2027',
      },
      {
        institution: 'BMS Institute of Technology',
        degree: 'BE in Computer Science (CGPA: 8.94/10)',
        duration: 'Graduated Aug 2022',
      },
    ],
    socialLinks: [
      {
        name: 'GitHub',
        url: 'https://github.com/officiallygod',
        icon: 'github',
      },
      {
        name: 'LinkedIn',
        url: 'https://linkedin.com/in/allen-benny',
        icon: 'linkedin',
      },
    ],
    githubUrl: 'https://github.com/officiallygod',
    projects: [
      {
        title: 'Smart Farming IoT System',
        description: 'Published research paper on IoT-based smart farming system in IJIITEE journal. Developed intelligent agricultural monitoring solution.',
        link: 'https://www.ijitee.org/',
        date: 'Feb 2020',
      },
      {
        title: 'Automating Mouse Movements',
        description: 'Research published on ResearchGate exploring automation techniques for mouse movements and user interface interactions.',
        link: 'https://www.researchgate.net/',
        date: 'Oct 2020',
      },
      {
        title: 'CORONAI',
        description: 'AI-powered solution developed during HackAIthon for COVID-19 related challenges. Leveraged machine learning for healthcare insights.',
        date: 'Nov 2020',
      },
      {
        title: 'Flutter Loading Kit',
        description: 'Published Flutter package on Pub.dev providing reusable loading animations and components for Flutter applications.',
        link: 'https://pub.dev/',
        date: 'May 2021',
      },
    ],
    certifications: [
      {
        title: 'Android App Development Specialisation',
        issuer: 'Vanderbilt University',
        date: '2020',
      },
      {
        title: 'C++ for C Programmers',
        issuer: 'University of California',
        date: '2020',
      },
      {
        title: 'Build Your First Android App',
        issuer: 'CentraleSupélec',
        date: '2020',
      },
      {
        title: 'Advanced PHP',
        issuer: 'LinkedIn Learning',
        date: '2021',
      },
      {
        title: 'Neural Networks and Deep Learning',
        issuer: 'deeplearning.ai',
        date: '2021',
      },
      {
        title: 'Structuring Machine Learning Projects',
        issuer: 'deeplearning.ai',
        date: '2021',
      },
    ],
    contact: {
      email: 'theallenbenny@gmail.com',
      phone: '+49 155 1090 5298',
      location: 'Karlsruhe, Germany',
    },
    skills: [
      {
        category: 'Soft Skills',
        items: ['Communication', 'Teamwork', 'Analytical Thinking', 'Problem-Solving'],
      },
      {
        category: 'Languages',
        items: ['English (C1)', 'German (A2 - in progress)'],
      },
    ],
    portfolioUrl: 'https://officiallygod.github.io/material-projects/',
    personalSiteUrl: 'https://materilio-allen.firebaseapp.com/',
  },
  de: {
    name: 'Allen Benny',
    title: 'MSc-Informatikstudent | Full-Stack-Entwickler | Werkstudent gesucht',
    tagline: '3+ Jahre skalierbare Systeme • KI- & WordPress-Onboarding bei Newfold Digital • 15–20 Std./Woche in Karlsruhe verfügbar',
    bio: [
      'MSc-Informatikstudent am KIT (Karlsruher Institut für Technologie) mit über 3 Jahren Erfahrung in skalierbaren Onboarding-Systemen und KI-Features bei Newfold Digital. Spezialisiert auf PHP, React, JavaScript, Node.js, WordPress und TypeScript.',
      'Leitete die Entwicklung eines Open-Source-WordPress-Onboardings für über 1000 tägliche Nutzer, integrierte KI-Features aus Prompts und optimierte die Performance mit fortgeschrittenen React-Patterns (Memo, Caching). Repräsentierte Bluehost auf der WordCamp Sylhet 2023 und erhielt den Edward De Bono Award für Innovation.',
      'Schneller Lerner mit starken Kommunikations-, Team- und Problemlösungsfähigkeiten. Aktiv auf der Suche nach einer Werkstudentenstelle (15–20 Std./Woche) in der Softwareentwicklung – Full Stack, Backend, Frontend, Web oder App Development.',
    ],
    technologies: [
      { name: 'PHP', category: 'Language' },
      { name: 'JavaScript', category: 'Language' },
      { name: 'TypeScript', category: 'Language' },
      { name: 'Java', category: 'Language' },
      { name: 'C', category: 'Language' },
      { name: 'C++', category: 'Language' },
      { name: 'Dart', category: 'Language' },
      { name: 'Python', category: 'Language' },
      { name: 'SQL', category: 'Language' },
      { name: 'React', category: 'Framework' },
      { name: 'Node.js', category: 'Framework' },
      { name: 'Express.js', category: 'Framework' },
      { name: 'Django', category: 'Framework' },
      { name: 'Flask', category: 'Framework' },
      { name: 'Flutter', category: 'Framework' },
      { name: 'WordPress', category: 'Framework' },
      { name: 'REST APIs', category: 'Framework' },
      { name: 'Cypress', category: 'Tool' },
      { name: 'Git', category: 'Tool' },
      { name: 'GitHub', category: 'Tool' },
      { name: 'GitHub Actions', category: 'Tool' },
      { name: 'Docker', category: 'Tool' },
      { name: 'Linux/Bash', category: 'Tool' },
      { name: 'Postman', category: 'Tool' },
      { name: 'NPM', category: 'Tool' },
      { name: 'Yarn', category: 'Tool' },
      { name: 'VS Code', category: 'Tool' },
      { name: 'JIRA', category: 'Tool' },
      { name: 'Cloudflare', category: 'Cloud' },
      { name: 'CDN', category: 'Cloud' },
      { name: 'CI/CD', category: 'Cloud' },
      { name: 'OpenAI API', category: 'AI' },
    ],
    experience: [
      {
        company: 'Newfold Digital',
        role: 'Software Development Engineer (Full Stack)',
        duration: 'Jan 2022 – Heute',
        description: 'Entwickelte ein modernes Open-Source-WordPress-Onboarding (PHP, React) für über 1000 Nutzer täglich. Baute KI-gestützte Onboarding-Erlebnisse aus Prompts. Entwickelte Task-Systeme und Cron-Jobs zur Plugin-Installation. Optimierte Performance und Stabilität mit fortgeschrittenen React-Features (Memo, Caching). Entwickelte einen WordPress-Template-Drawer. Top-Beitragender im Team. Repräsentierte Bluehost auf der WordCamp Sylhet 2023. Ausgezeichnet mit dem Edward De Bono Award für Innovation.',
      },
      {
        company: 'TecideXa Services',
        role: 'Lead Developer Intern',
        duration: 'Dez 2020 – Jan 2021',
        description: 'Konzipierte, entwickelte und testete Flutter-Client-Anwendungen. Leitete Entwicklungsinitiativen und stellte hochwertige Codequalität sicher.',
      },
      {
        company: 'Gliitz (Freelance)',
        role: 'App-Entwickler',
        duration: 'Aug 2020 – Nov 2020',
        description: 'Setzte UI/UX-Designs in produktionsreife Flutter-Anwendungen um. Führte gründliche Tests und Deployments für hohe Qualität durch.',
      },
      {
        company: 'Itukaa (Freelance)',
        role: 'App-Entwickler',
        duration: 'Apr 2021 – Jun 2021',
        description: 'Baute und veröffentlichte eine marktreife App für ein Baustoffunternehmen. Steigerte die Effizienz durch maßgeschneiderte mobile Lösungen.',
      },
    ],
    education: [
      {
        institution: 'Karlsruher Institut für Technologie (KIT)',
        degree: 'MSc in Informatik',
        duration: 'Voraussichtlich Mai 2027',
      },
      {
        institution: 'BMS Institute of Technology',
        degree: 'BE in Informatik (CGPA: 8,94/10)',
        duration: 'Abschluss Aug 2022',
      },
    ],
    socialLinks: [
      {
        name: 'GitHub',
        url: 'https://github.com/officiallygod',
        icon: 'github',
      },
      {
        name: 'LinkedIn',
        url: 'https://linkedin.com/in/allen-benny',
        icon: 'linkedin',
      },
    ],
    githubUrl: 'https://github.com/officiallygod',
    projects: [
      {
        title: 'Smart Farming IoT System',
        description: 'Veröffentlichte Forschung zu IoT-basiertem Smart-Farming-System im IJIITEE-Journal. Entwickelte eine intelligente Agrarüberwachungslösung.',
        link: 'https://www.ijitee.org/',
        date: 'Feb 2020',
      },
      {
        title: 'Automating Mouse Movements',
        description: 'Forschung auf ResearchGate über Automatisierungstechniken für Mausbewegungen und UI-Interaktionen veröffentlicht.',
        link: 'https://www.researchgate.net/',
        date: 'Okt 2020',
      },
      {
        title: 'CORONAI',
        description: 'KI-basierte Lösung für COVID-19-Herausforderungen im HackAIthon. Nutzte Machine Learning für Gesundheitsanalysen.',
        date: 'Nov 2020',
      },
      {
        title: 'Flutter Loading Kit',
        description: 'Flutter-Paket auf Pub.dev veröffentlicht, das wiederverwendbare Ladeanimationen und Komponenten bietet.',
        link: 'https://pub.dev/',
        date: 'Mai 2021',
      },
    ],
    certifications: [
      {
        title: 'Android App Development Specialisation',
        issuer: 'Vanderbilt University',
        date: '2020',
      },
      {
        title: 'C++ for C Programmers',
        issuer: 'University of California',
        date: '2020',
      },
      {
        title: 'Build Your First Android App',
        issuer: 'CentraleSupélec',
        date: '2020',
      },
      {
        title: 'Advanced PHP',
        issuer: 'LinkedIn Learning',
        date: '2021',
      },
      {
        title: 'Neural Networks and Deep Learning',
        issuer: 'deeplearning.ai',
        date: '2021',
      },
      {
        title: 'Structuring Machine Learning Projects',
        issuer: 'deeplearning.ai',
        date: '2021',
      },
    ],
    contact: {
      email: 'theallenbenny@gmail.com',
      phone: '+49 155 1090 5298',
      location: 'Karlsruhe, Deutschland',
    },
    skills: [
      {
        category: 'Soft Skills',
        items: ['Kommunikation', 'Teamarbeit', 'Analytisches Denken', 'Problemlösung'],
      },
      {
        category: 'Sprachen',
        items: ['Englisch (C1)', 'Deutsch (A2 – in Arbeit)'],
      },
    ],
    portfolioUrl: 'https://officiallygod.github.io/material-projects/',
    personalSiteUrl: 'https://materilio-allen.firebaseapp.com/',
  },
};
