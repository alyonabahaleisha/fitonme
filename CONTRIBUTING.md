# Contributing to GodLovesMe AI

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/godlovesme-ai.git
   cd godlovesme-ai
   ```
3. **Install dependencies**
   ```bash
   npm install
   npm install --prefix server
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Running the Development Environment

1. **Start the backend** (Terminal 1):
   ```bash
   npm run server
   ```

2. **Start the frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

3. **Open browser**:
   ```
   http://localhost:5173
   ```

### Making Changes

1. Make your changes in the appropriate files
2. Test your changes locally
3. Ensure the build works: `npm run build`
4. Commit with clear messages
5. Push to your fork
6. Create a Pull Request

## 🎨 Code Style Guidelines

### JavaScript/React
- Use functional components with hooks
- Follow React best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

**Example:**
```javascript
// Good
const PhotoUpload = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file) => {
    // Validation logic here
  };

  return (/* JSX */);
};

// Avoid
function Component(props) {
  // Old class-based or mixed patterns
}
```

### CSS/Tailwind
- Use Tailwind utilities when possible
- Create custom classes in index.css for reusable styles
- Follow mobile-first approach
- Keep class names descriptive

**Example:**
```jsx
// Good
<div className="flex items-center justify-between p-4 bg-white rounded-xl">

// Avoid inline styles when Tailwind can be used
<div style={{ display: 'flex', padding: '16px' }}>
```

### File Organization
- Components in `/src/components/`
- Pages in `/src/pages/`
- Utilities in `/src/lib/`
- Hooks in `/src/hooks/`
- State management in `/src/store/`

## 🧪 Testing

Currently, the project doesn't have automated tests, but manual testing is required:

### Manual Testing Checklist
- [ ] Photo upload works with various image sizes
- [ ] Outfit switching is smooth and fast
- [ ] Mobile view renders correctly
- [ ] Admin panel uploads work
- [ ] Share functionality works
- [ ] Favorites persist during session
- [ ] Build completes without errors
- [ ] No console errors in browser

### Adding Tests (Future)
If you'd like to add tests:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## 🐛 Reporting Bugs

Use GitHub Issues with the following information:

**Bug Report Template:**
```markdown
### Description
Brief description of the bug

### Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Browser: [e.g., Chrome 120]
- Device: [e.g., iPhone 15, Desktop]
- OS: [e.g., macOS 14, Windows 11]

### Screenshots
If applicable
```

## 💡 Feature Requests

Use GitHub Issues with the **Feature Request** label:

**Feature Request Template:**
```markdown
### Feature Description
Clear description of the feature

### Use Case
Why is this feature needed?

### Proposed Solution
How should it work?

### Alternatives Considered
Other approaches you thought about

### Additional Context
Any other information
```

## 🔧 Common Development Tasks

### Adding a New Component

1. Create file in `/src/components/`:
   ```javascript
   // NewComponent.jsx
   const NewComponent = ({ prop1, prop2 }) => {
     return (
       <div className="...">
         {/* Component content */}
       </div>
     );
   };

   export default NewComponent;
   ```

2. Import and use in parent component
3. Add to documentation if needed

### Adding a New Page

1. Create file in `/src/pages/`:
   ```javascript
   // NewPage.jsx
   const NewPage = () => {
     return (
       <div>
         {/* Page content */}
       </div>
     );
   };

   export default NewPage;
   ```

2. Add route in `App.jsx`:
   ```javascript
   <Route path="/new-page" element={<NewPage />} />
   ```

### Adding a New API Endpoint

1. Edit `server/index.js`:
   ```javascript
   app.get('/api/new-endpoint', (req, res) => {
     // Handler logic
     res.json({ data: 'response' });
   });
   ```

2. Update API documentation in README.md

### Adding New State

1. Edit `src/store/useAppStore.js`:
   ```javascript
   newState: initialValue,
   setNewState: (value) => set({ newState: value }),
   ```

2. Use in components:
   ```javascript
   const { newState, setNewState } = useAppStore();
   ```

## 📦 Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tested locally
- [ ] Build passes (`npm run build`)
- [ ] No console errors
- [ ] Updated documentation if needed
- [ ] Commits are clear and descriptive

### PR Template
```markdown
### Description
What does this PR do?

### Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

### Testing
How was this tested?

### Screenshots
If applicable

### Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## 🎯 Priority Areas for Contribution

### High Priority
1. **User Authentication**: Firebase/Auth0 integration
2. **Database Integration**: MongoDB or PostgreSQL
3. **Testing Suite**: Unit and integration tests
4. **Performance Optimization**: Web Workers, lazy loading
5. **Accessibility**: ARIA labels, keyboard navigation

### Medium Priority
1. **PWA Support**: Service workers, offline mode
2. **Advanced AI**: Better outfit recommendations
3. **Social Features**: User profiles, comments
4. **E-commerce**: Shopping cart, checkout
5. **Analytics**: User behavior tracking

### Low Priority
1. **Theme Customization**: Dark mode
2. **Internationalization**: Multi-language support
3. **Advanced Filters**: Price, brand, style
4. **3D View**: 360-degree outfit visualization
5. **Voice Commands**: Accessibility feature

## 🏆 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Invited to project discussions

## 📚 Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Express.js Guide](https://expressjs.com)
- [Canvas API Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

## 💬 Questions?

- Open a GitHub Discussion
- Comment on relevant issues
- Check existing documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC License).

---

**Thank you for contributing to GodLovesMe AI!** 🙏
