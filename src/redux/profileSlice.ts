import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SocialIconType } from '../types/social';

interface Technology {
  name: string;
  category?: string;
}

interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  duration: string;
}

interface SocialLink {
  name: string;
  url: string;
  icon: SocialIconType;
}

interface Project {
  title: string;
  description: string;
  link?: string;
  date: string;
}

interface Certification {
  title: string;
  issuer: string;
  date: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  location: string;
}

interface Skill {
  category: string;
  items: string[];
}

interface ProfileState {
  name: string;
  title: string;
  tagline: string;
  bio: string[];
  technologies: Technology[];
  experience: Experience[];
  education: Education[];
  socialLinks: SocialLink[];
  githubUrl: string;
  isLoading: boolean;
  projects: Project[];
  certifications: Certification[];
  contact: ContactInfo;
  skills: Skill[];
  portfolioUrl: string;
  personalSiteUrl: string;
}

const initialState: ProfileState = {
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
      duration: 'Jan 2022 – Apr 2025',
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
  isLoading: false,
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
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    updateName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    updateTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload;
    },
    addTechnology: (state, action: PayloadAction<Technology>) => {
      state.technologies.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { updateName, updateTitle, addTechnology, setLoading } = profileSlice.actions;
export default profileSlice.reducer;
