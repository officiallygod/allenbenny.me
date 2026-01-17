import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Technology {
  name: string;
  category?: string;
}

interface ProfileState {
  name: string;
  title: string;
  bio: string[];
  technologies: Technology[];
  isLoading: boolean;
}

const initialState: ProfileState = {
  name: 'Allen Benny',
  title: 'Software Engineer & Developer',
  bio: [
    'I am a developer who is passionate about Web, Android, and Servers. A few techs that I enjoy working in are PHP, React, JS, AI, Java, C++, Dart, Node, Express, Python, Flutter, Kotlin, OpenCV, and much more.',
    'I have worked as a Software Engineer at Newfold Digital for almost three years. Currently, I am pursuing my MSc. in Computer Science from Karlsruhe Institute of Technology!',
  ],
  technologies: [
    { name: 'PHP' },
    { name: 'React' },
    { name: 'JavaScript' },
    { name: 'AI' },
    { name: 'Java' },
    { name: 'C++' },
    { name: 'Dart' },
    { name: 'Node.js' },
    { name: 'Express' },
    { name: 'Python' },
    { name: 'Flutter' },
    { name: 'Kotlin' },
  ],
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
