# Changelog

All notable changes to the "Next.js Contextify" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated CI/CD pipeline with GitHub workflows
- Enhanced package.json scripts for development workflow
- Development build artifacts on every commit to main
- Comprehensive improvement plan (IMPROVEMENTS.md)
- Contributing guidelines (CONTRIBUTING.md)
- Development scripts: `dev`, `ci:fast`, `analyze:bundle`
- **Publishing Infrastructure**: Automated publishing to VS Code Marketplace and Open VSX Registry
- Publishing scripts: `publish:vscode`, `publish:openvsx`, `publish:all`, `release:publish`
- Manual publishing workflow with marketplace selection options
- Smart environment variable detection (publishes only when secrets are configured)

### Changed
- **Repository ownership**: Updated from `sriem` to `hongkongkiwi`
- **Author**: Changed from "Sergej Riemann" to "Andy McCormack"
- Improved build process with proper pnpm support
- Updated packaging to use `--no-dependencies` flag for reliability
- Enhanced ESLint configuration for VS Code extension development

### Fixed
- Package manager consistency issues in build scripts
- All repository URLs and references updated
- ESLint configuration compatibility with v9.x

## [2.1.1] - 2024-06-16

### Added
- Initial release with Next.js codebase context generation
- Support for XML, Markdown, and JSON output formats
- LLM-optimized prompts (Claude, GPT, Gemini)
- File selection interface with tree view
- Configurable settings for default formats and behaviors

### Features
- 📁 Interactive file selection with Next.js project awareness
- 🚀 Multiple generation modes (Quick, Full, With Prompts)
- 🎯 Optimized for LLM input with token-efficient formatting
- ⚙️ Configurable output formats and target LLMs
- 🔧 Smart file filtering with `.nextjscollectorignore` support

---

## Release Notes Template

When creating a new release:

1. Update the version in `package.json`
2. Add a new section to this changelog
3. Create a git tag: `git tag v[version]`
4. Push the tag: `git push origin v[version]`
5. The GitHub workflow will automatically create the release 