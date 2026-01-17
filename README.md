# allenbenny.me

Personal portfolio website built with React, Redux, and Framer Motion.

## Features

- ⚛️ Built with React and TypeScript
- 🔄 State management with Redux Toolkit
- ✨ Smooth animations using Framer Motion
- 🎨 Beautiful pastel color scheme with glassmorphism design
- 📱 Fully responsive design
- 🚀 Optimized production build with Webpack

## Tech Stack

- **React 19** - UI library
- **Redux Toolkit** - State management
- **TypeScript** - Type safety
- **Framer Motion** - Animation library
- **Webpack** - Module bundler
- **CSS3** - Styling with pastel colors and animations

## Project Structure

```
src/
├── components/        # React components
│   ├── Header.tsx    # Header with name and title
│   ├── About.tsx     # About section
│   └── Technologies.tsx  # Technologies tags
├── redux/            # Redux state management
│   ├── store.ts      # Redux store configuration
│   ├── profileSlice.ts  # Profile state slice
│   └── hooks.ts      # Typed Redux hooks
├── styles/           # CSS stylesheets
│   ├── global.css    # Global styles
│   ├── App.css       # App container styles
│   ├── Header.css    # Header component styles
│   ├── About.css     # About component styles
│   └── Technologies.css  # Technologies component styles
├── App.tsx           # Main App component
└── index.tsx         # Entry point
```

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm start
```

The app will be available at http://localhost:3000

### Build for Production

```bash
npm run build
```

The production build will be in the `build/` directory.

## Deployment

The site is automatically deployed to nginx server when changes are pushed to the `main` branch using GitHub Actions.

The workflow:
1. Checks out the repository
2. Sets up Node.js
3. Installs dependencies
4. Builds the React app
5. Deploys the `build/` folder contents to the nginx server

## Design

The website features:
- Pastel gradient background (pink, blue, purple)
- Glassmorphism cards with backdrop blur
- Smooth fade-in and slide-in animations
- Interactive hover effects on technology tags
- Responsive design for all screen sizes

## License

ISC
