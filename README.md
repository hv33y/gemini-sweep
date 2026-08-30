# Gemini Sweep

A lightweight, automated cleanup script for Google Gemini that purges unpinned conversations in sequence while keeping pinned threads intact.<hr>

<img width="1280" height="640" alt="social-preview" src="https://github.com/user-attachments/assets/05e51779-41ea-4284-8e43-8b7b4b059675" />
<hr>

## Features

- **Selective Purge:** Target only conversations under the Recent section while leaving pinned chats untouched.
- **CDK & Overlay Isolation:** Scopes DOM interactions specifically to active modal panels to eliminate misclicks.
- **Visual Feedback:** Animated UI states for idle, hover, active deletion loops, and instant termination.
- **Embedded Credit Decoding:** Obfuscated developer attribution loaded at runtime.

## Installation

1. Install a userscript manager extension:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)
2. Load the script:
   - [Direct Install](https://github.com/hv33y/gemini-sweep/raw/refs/heads/master/gemini-sweep.user.js)

Or create a new script inside your extension dashboard and paste the contents of [`gemini-sweep.user.js`](gemini-sweep.user.js).

## Usage

1. Open [Google Gemini](https://gemini.google.com/).
2. Click the floating **Purge Unpinned** button in the bottom-right corner.
3. Confirm the browser prompt to start the automated queue.
4. Click **Stop** at any point to halt execution immediately.

## Author

- GitHub: [@hv33y](https://github.com/hv33y)
- Repository: [@hv33y/gemini-sweep](https://github.com/hv33y/gemini-sweep)

## License

[MIT](LICENSE)
