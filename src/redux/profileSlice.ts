import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  icon: string;
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
}

const initialState: ProfileState = {
  name: 'Allen Benny',
  title: 'Software Engineer & Developer',
  tagline: 'Building innovative solutions with modern technologies',
  bio: [
    'I am a passionate software engineer with expertise in Web, Android, and Server technologies. With a strong foundation in full-stack development and a keen interest in AI, I specialize in creating scalable and efficient applications.',
    'My experience spans across multiple programming languages and frameworks, allowing me to adapt quickly to new challenges and deliver high-quality solutions.',
  ],
  technologies: [
    { name: 'React', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'TypeScript', category: 'Language' },
    { name: 'Python', category: 'Language' },
    { name: 'Java', category: 'Language' },
    { name: 'C++', category: 'Language' },
    { name: 'Flutter', category: 'Mobile' },
    { name: 'Kotlin', category: 'Mobile' },
    { name: 'Express', category: 'Backend' },
    { name: 'PHP', category: 'Backend' },
    { name: 'AI/ML', category: 'Specialization' },
    { name: 'Dart', category: 'Language' },
  ],
  experience: [
    {
      company: 'Newfold Digital',
      role: 'Software Engineer',
      duration: '3 Years',
      description: 'Developed and maintained scalable web applications, contributing to multiple high-impact projects.',
    },
  ],
  education: [
    {
      institution: 'Karlsruhe Institute of Technology',
      degree: 'MSc. in Computer Science',
      duration: 'Current',
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
      url: 'https://linkedin.com/in/allenbenny',
      icon: 'linkedin',
    },
  ],
  githubUrl: 'https://github.com/officiallygod',
  isLoading: false,
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
