# AlbumTracker 🎵

A comprehensive web application for tracking album creation and campaign progress. Keep tabs on tasks, budgets, photos, team members, and more—all in one place!

## ✨ Features

- **Task Management**: Organize album creation into stages and tasks
- **Budget Tracking**: Track estimated, quoted, and actual costs
- **Calendar View**: Schedule and visualize deadlines
- **Photo Gallery**: Store and manage album-related photos
- **Team Management**: Keep track of vendors and collaborators
- **Expense Tracking**: Monitor miscellaneous expenses
- **Cross-Platform Sync**: Access your data from PC and mobile via Firebase
- **Dark Mode**: Switch between light and dark themes
- **Offline-First**: Works offline with local storage, syncs when online

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/jxburros/AlbumTracker.git
   cd AlbumTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📱 Cross-Platform Access

Album Tracker works seamlessly across devices:

- **Desktop**: Any modern web browser (Chrome, Firefox, Safari, Edge)
- **Mobile**: Android and iOS browsers
- **Tablet**: Fully responsive design

### Setting Up Cloud Sync

To access your data across multiple devices:

1. Follow the **[Firebase Setup Guide](FIREBASE_SETUP.md)**
2. Configure Firebase in your project
3. Connect from each device using the same Firebase config
4. Your data will sync automatically!

**No Firebase?** The app works great with local storage only!

## 🌐 Deployment

You can deploy Album Tracker to various platforms:

- **Firebase Hosting** (Recommended)
- **Netlify**
- **Vercel**
- **GitHub Pages**

📖 See the **[Deployment Guide](DEPLOYMENT.md)** for detailed instructions.

### Quick Deploy to Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 📚 Documentation

- **[Firebase Setup Guide](FIREBASE_SETUP.md)** - Set up cloud sync across devices
- **[Deployment Guide](DEPLOYMENT.md)** - Deploy to various hosting platforms

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS with custom punk/brutalist design
- **State Management**: React Context
- **Cloud Sync**: Firebase (Firestore + Authentication)
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📖 Usage Guide

### Getting Started

1. **Add Categories**: Click "+ Category" to create major sections (e.g., Recording, Marketing)
2. **Add Tasks**: Click the + icon next to any category to add tasks
3. **Edit Tasks**: Click on any task to edit details, costs, and deadlines
4. **Track Costs**: Enter estimated, quoted, and actual costs to track your budget
5. **Add Photos**: Upload reference photos, artwork, or progress shots
6. **Manage Team**: Add vendors, collaborators, and team members
7. **Set Up Stages**: Customize your workflow stages (Arrangements, Pre-Production, etc.)

### Views

- **Plan**: Hierarchical list of all tasks and categories
- **Active**: Focus on tasks currently in progress
- **Calendar**: Visualize deadlines and events
- **Photos**: Browse your photo gallery
- **Team**: Manage vendors and collaborators
- **Expenses**: Track miscellaneous costs
- **Trash**: Review archived items
- **Settings**: Configure app preferences and cloud sync

## 🎨 Customization

- **Theme Mode**: Switch between light and dark modes
- **Accent Colors**: Choose from multiple color schemes (Pink, Blue, Green, Yellow, Orange, Purple, Red)
- **Artist Info**: Set your artist name and album title

## 🔒 Privacy & Security

- **Local-First**: All data is stored locally by default
- **Optional Cloud**: You control if/when to enable cloud sync
- **Anonymous Auth**: No personal information required
- **Secure**: Firebase security rules protect your data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Firebase Setup Guide](FIREBASE_SETUP.md) and [Deployment Guide](DEPLOYMENT.md)
2. Review existing GitHub Issues
3. Open a new issue with details

## 🎵 Made for Musicians

Whether you're tracking an EP, LP, or full album campaign, Album Tracker helps you stay organized and on budget. Focus on making great music while we help you track the details!

---

**Happy tracking!** 🎸🎹🎤
