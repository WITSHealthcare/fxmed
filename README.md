# FXMed Website - Next.js Conversion

A modern functional medicine clinic website built with Next.js 14, TypeScript, and Tailwind CSS. This website showcases FXMed's mobile healthcare services, programs, and interactive health assessment tools.

## Features

- **Responsive Design**: Fully responsive layout that works on all devices
- **Modern Stack**: Built with Next.js 14, TypeScript, and Tailwind CSS
- **Interactive Components**: 
  - Health assessment quiz with personalized recommendations
  - AI-powered chat widget for customer support
  - Smooth animations and micro-interactions
- **Custom Styling**: Tailwind CSS with custom color scheme matching the FXMed brand
- **Component Architecture**: Modular, reusable React components

## Project Structure

```
fxmed-website/
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx          # Root layout component
│   └── page.tsx            # Homepage
├── components/
│   ├── Navigation.tsx       # Fixed navigation header
│   ├── Hero.tsx            # Hero section with background
│   ├── WhyFXMed.tsx        # Why FXMed section with benefits
│   ├── MobileCare.tsx       # Mobile care banner
│   ├── Programs.tsx         # Programs and services sections
│   └── AIChat.tsx          # AI chat widget
├── public/                 # Static assets
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Key Components

### Navigation
- Fixed header with smooth scroll behavior
- Responsive design with mobile-friendly menu
- Brand colors and hover effects

### Hero Section
- Full-screen hero with background image
- Animated content with fade-in effects
- Call-to-action buttons and statistics

### Health Quiz
- Multi-step interactive questionnaire
- Personalized health recommendations
- Progress tracking and smooth transitions

### AI Chat Widget
- Floating chat button
- Message history and typing indicators
- Quick reply suggestions

### Programs & Services
- Grid layout for program cards
- Hover effects and animations
- Service showcase with icons

## Styling

The project uses Tailwind CSS with a custom color scheme:

- **Primary Colors**: Green-deep (#1a3d2e), Green-mid (#2d6a4f), Green-light (#52b788)
- **Accent Colors**: Gold (#c9a84c), Gold-light (#e8cc7a)
- **Neutral Colors**: Cream (#f8f3ea), Text-dark (#1c2b22)

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Hooks**: State management and side effects

## Deployment

This project can be deployed to any platform that supports Next.js applications:

- Vercel (recommended)
- Netlify
- AWS Amplify
- DigitalOcean

## Customization

### Adding New Sections
1. Create a new component in the `components/` directory
2. Import and add it to `app/page.tsx`
3. Follow the existing styling patterns

### Modifying Colors
Update the color scheme in `tailwind.config.js` under the `theme.extend.colors` section.

### Adding Images
Place images in the `public/` directory and reference them using absolute paths.

## Performance Optimizations

- Image optimization with Next.js Image component
- Lazy loading for heavy components
- CSS-in-JS with Tailwind for minimal bundle size
- Component-level code splitting

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Android Chrome)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary to FXMed Clinic.

---

**FXMed Clinic** - Functional Medicine That Comes to You
📍 Serving Lagos & Abuja
📞 Contact: [Phone Number]
🌐 [Website URL]
