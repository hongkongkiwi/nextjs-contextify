# Contributing to Next.js Contextify

## 🚀 Getting Started

### Prerequisites
- Node.js 22.15.0 or higher
- pnpm (latest version)
- VS Code 1.85.0 or higher

### Development Setup
```bash
# Clone the repository
git clone https://github.com/hongkongkiwi/nextjs-contextify
cd nextjs-contextify

# Install dependencies
pnpm install

# Start development
pnpm run dev
```

### Testing Your Changes
```bash
# Build the extension
pnpm run build

# Package for testing
pnpm run package

# Install locally
pnpm run package:install

# Run tests
pnpm run test

# Run linter
pnpm run lint
```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Testing
- Add unit tests for new services
- Add integration tests for UI components
- Ensure all tests pass before submitting PR

### Commit Messages
Follow conventional commits:
```
feat: add new prompt template for debugging
fix: resolve file selection memory leak
docs: update README with new features
test: add unit tests for FileScanner
```

## 🐛 Bug Reports

When reporting bugs, include:
- VS Code version
- Extension version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs
- Sample project structure (if relevant)

## 💡 Feature Requests

For new features:
- Check existing issues first
- Describe use case and benefits
- Consider implementation complexity
- Provide mockups/examples if applicable

## 🔧 Priority Areas for Contribution

1. **Code Refactoring**: Help break down the large extension.ts file
2. **Testing**: Add comprehensive test coverage
3. **Performance**: Optimize for large codebases
4. **Documentation**: Improve guides and examples
5. **UI/UX**: Enhance the webview interface

## 📝 Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Run the full CI pipeline (`pnpm run ci`)
6. Commit changes (`git commit -m 'feat: add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### PR Requirements
- [ ] Code builds successfully
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## 🎯 Architecture Goals

When contributing code, keep these principles in mind:
- **Modularity**: Break down large functions/classes
- **Testability**: Write code that can be easily tested
- **Performance**: Consider impact on large codebases
- **User Experience**: Prioritize intuitive, responsive UI
- **Maintainability**: Use clear, self-documenting code

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given appropriate credit in documentation

## 📞 Getting Help

- Open an issue for questions
- Join discussions in existing issues
- Contact maintainers for complex contributions

Thank you for contributing to Next.js Contextify! 🎉 