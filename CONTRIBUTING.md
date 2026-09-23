# Contributing to CivicFix

Thank you for your interest in contributing to **CivicFix**! **Kindly star the repository first!**

CivicFix is an AI-powered platform that helps citizens report local civic issues such as potholes, garbage, water leaks, and streetlight failures, while helping authorities manage and resolve complaints efficiently.

We welcome contributions in frontend development, backend development, AI/ML, UI/UX, documentation, testing, and other areas that improve the project.

## How to Contribute

### 1. Fork the Repository

Fork this repository to your own GitHub account.

### 2. Clone the Repository

Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/temp_civic.git
cd temp_civic
```

### 3. Create a Branch

Create a separate branch for your contribution:

```bash
git checkout -b feature/your-feature-name
```

Use meaningful branch names such as:

```text
feature/issue-tracking
feature/chatbot-improvement
fix/login-error
fix/mobile-layout
docs/update-readme
```

### 4. Install Dependencies

Install the required dependencies:

```bash
npm install
```

### 5. Set Up Environment Variables

Some features require API credentials.

Create a `.env` file in the appropriate directory and add the required environment variables.

Do **not** commit API keys, passwords, tokens, or other secrets to the repository.

Example:

```env
GEMINI_API_KEY=your_api_key
WHATSAPP_ACCESS_TOKEN=your_token
```

Use the project's existing environment configuration as a reference.

### 6. Run the Project

Start the development server:

```bash
npm run dev
```

Open the local URL shown in your terminal.

### 7. Make Your Changes

Before starting development:

* Check existing issues to avoid duplicate work.
* For larger changes, discuss the idea in an issue first.
* Keep changes focused on one feature or bug.
* Follow the existing project structure and coding style.
* Avoid modifying unrelated parts of the application.

## Issues

If you find a bug or have an idea for an improvement, create a GitHub issue.

### Bug Reports

A good bug report should include:

* Clear description of the problem
* Steps to reproduce the issue
* Expected behavior
* Actual behavior
* Screenshots or recordings, if useful
* Browser/device information when relevant
* Relevant error messages or logs

### Feature Requests

For feature requests, explain:

* What problem the feature solves
* How the feature could work
* Why it would be useful to citizens, authorities, or other users
* Any possible implementation ideas

Please check existing issues before creating a new one.

## Areas Where You Can Contribute

Contributors can work on areas such as:

### Frontend

* React components
* Responsive UI
* Accessibility
* User experience improvements
* Form improvements
* Dashboard development

### Backend

* APIs
* Database integration
* Authentication
* Complaint management
* Government integration

### AI/ML

* CivicFix chatbot improvements
* Natural-language issue reporting
* Issue classification
* Complaint summarization
* AI-assisted responses
* Prompt engineering and evaluation

### Notifications

* WhatsApp notification workflows
* Complaint status updates
* Notification reliability

### Testing

* Unit tests
* Integration tests
* UI testing
* API testing
* Bug reproduction and verification

### Documentation

* README improvements
* API documentation
* Setup guides
* Developer documentation
* User guides

## Commit Guidelines

Write clear and meaningful commit messages.

Good examples:

```text
Add complaint status tracking
Fix mobile report form
Improve CivicFix chatbot response handling
Add validation for issue reports
Update contributor documentation
```

Avoid vague messages such as:

```text
changes
update
fix
stuff
```

## Pull Requests

Before opening a Pull Request:

* Make sure your code works locally.
* Test the changes you made.
* Make sure there are no unnecessary changes.
* Update documentation when required.
* Make sure you have not committed secrets or API keys.

When opening a Pull Request, include:

* A short description of the changes
* The related issue number, if applicable
* Testing performed
* Screenshots for UI changes, if applicable

Example:

```text
## What changed?

Added complaint status tracking to the citizen dashboard.

## Related Issue

Closes #25

## Testing

- Tested complaint creation
- Tested status updates
- Tested mobile layout
```

## Code Style

Please follow these guidelines:

* Use clear and descriptive variable and function names.
* Keep functions and components focused.
* Avoid unnecessary duplication.
* Add comments when the logic is difficult to understand.
* Keep UI components reusable where possible.
* Do not introduce unnecessary dependencies.

## Before Submitting

Please check the following:

* [ ] My changes work locally.
* [ ] I tested the affected functionality.
* [ ] I followed the existing project structure.
* [ ] I did not commit API keys or secrets.
* [ ] I updated documentation if necessary.
* [ ] My commit messages are meaningful.
* [ ] My Pull Request clearly explains the changes.

## Questions and Discussions

If you are unsure about an issue or contribution, open a GitHub issue and describe what you are trying to accomplish.

For larger changes, discuss the proposed approach before starting implementation so that effort is not duplicated.

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to CivicTech and helping build technology that can make civic issue reporting and resolution more accessible and efficient.
