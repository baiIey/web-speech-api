# Web Speech API Prototype (Vanilla JS)

![Vanilla JS speech interface prototype](captures/speech-prototype-vanilla.gif)

This repo now centers on a vanilla JavaScript prototype that mirrors the voice-first experience of Assistant-style apps. Everything runs with static assets—open the folder, serve it locally, and you have a demo-ready build sized for the latest iOS 26 artboard.

### What you’ll learn
* How to wire the Web Speech API without frameworks
* How to present voice-specific UI states (idle, listening, speaking) with CSS and DOM hooks
* How to keep `SpeechRecognition` resilient with watchdogs, timeouts, and auto language detection
* How to experiment with `SpeechSynthesis` voices from the same codebase

### What you’ll need
* The code in `speech-recognition-ios26/`
* Any static web server (`python3 -m http.server`, `npx serve`, etc.)
* Chrome 115+, Edge 115+, or Safari 17+ (desktop or mobile) with microphone permissions enabled

The [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) exposes two building blocks: `SpeechRecognition` (turn voice into text) and `SpeechSynthesis` (turn text into voice). Together they unlock conversational UI prototypes that feel close to production apps like [Google Assistant](https://assistant.google.com/), [Apple's Siri](https://www.apple.com/siri/), or [Amazon Alexa](https://developer.amazon.com/alexa).

### Quick start
1. Clone or download this repo.
2. `cd speech-recognition-ios26`
3. Run a static server:
   * Python: `python3 -m http.server 8090`
   * Node: `npx serve -p 8090`
4. Visit [http://127.0.0.1:8090](http://127.0.0.1:8090) in a supported browser and allow microphone access when prompted.
5. Tap the mic to start listening, tap ✕ to stop, or use the gear to toggle languages.

Because the project is plain HTML/CSS/JS there is no build pipeline—swap assets, tweak `app.js`, refresh the browser, and repeat.

### Repo layout
* `speech-recognition-ios26/` – iPhone 17 Pro-sized vanilla JS prototype, the version showcased above.
* `speech-recognition/` – legacy layout that uses the same JavaScript but older artboard sizing.
* `captures/` & `_img/` – marketing captures you can drop into decks or portfolio pieces.

### Prototype capabilities
The iOS 26 build is a comprehensive playground for testing voice UX. Highlights from `speech-recognition-ios26/app.js`:

* **Stateful UI model** – `idle`, `listening`, and `speaking` states drive CSS classes for the animated waveform, card headers, and button availability.
* **Low-latency prompts** – transcript text switches between “Speak now”, “Start talking…”, and live transcripts with timeout helpers so the UI never feels frozen.
* **Self-healing recognition** – watchdogs restart the recognizer if Chrome drops audio, while inactivity timers reset the session after long pauses.
* **Bilingual support** – a visible language toggle and an automatic detector (English ↔︎ Chinese) adjust recognizer locales and update copy in a couple of taps.
* **Helpful error copy** – microphone, permission, and network errors replace the transcript area with guidance instead of failing silently.
* **Local persistence** – the last selected language is stored in `localStorage` so the next run feels personal.

Use this as a template for your own demos: swap the `textBox` copy, add real-time fetches to your assistant stack, or bolt on `SpeechSynthesis` for responses.

### Working with the code
* **`index.html`** wires up the shell (title bar, cards, mic/settings buttons) and loads `app.js`.
* **`style.css`** handles the faux-device layout, animation hooks (`.listening`, `.speaking`), and typography.
* **`app.js`** creates the recognizer, coordinates UI state, and encapsulates timeouts, watchdogs, and auto language switching logic. Look at `startListening()`, `restartRecognizer()`, and `checkAutoLanguageSwitch()` to understand the full flow.

To try other locales, update `activeLanguage` defaults and tweak `inferLanguageFromTranscript()`. To prototype different prompts or commands, customize the `recognizer.onresult` handler to branch on transcripts or call external APIs.

### SpeechRecognition Interface
The [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) interface lets us recognize speech and respond accordingly. PromptWorks' piece on [Speech Recognition in the Browser](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective) provided the snippet below.

Your browser may request permission to use the microphone.

```javascript
// This API is currently prefixed in Chromium browsers
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Create a new recognizer
const recognizer = new SpeechRecognition();

// Start producing results before the person has finished speaking
recognizer.interimResults = true;

// Set the language of the recognizer
recognizer.lang = "en-US";

// Define a callback to process results
recognizer.onresult = (event) => {
	const result = event.results[event.resultIndex];
	if (!result || !result[0]) return;
	console.log(result[0].transcript);
};

// Start listening...
recognizer.start();
```

Once the transcript is a string you can map it to DOM updates, send it to a service, or run local logic. For example, the snippet below mirrors the prototype’s live transcript area:

```javascript
const textBox = document.querySelector("[data-role='transcript']");
recognizer.onresult = (event) => {
	const result = event.results[event.resultIndex];
	if (!result || !result[0]) return;
	textBox.textContent = result[0].transcript;
};
```

### SpeechSynthesis Interface
The [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) interface provides controls and methods for the synthesis voices available on the device. [Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis#Browser_compatibility) is stronger than recognition, spanning Safari and several mobile browsers.

Snippets from [PromptWorks](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective):

```javascript
speechSynthesis.speak(new SpeechSynthesisUtterance("Hello world."));
```

Incrementing `utterance.voice = voices[1]` lets you cycle through device voices:

```javascript
const voices = speechSynthesis.getVoices();
const utterance = new SpeechSynthesisUtterance("Hello world.");
utterance.voice = voices[1];
speechSynthesis.speak(utterance);
```

---

### References
* PromptWorks - [Speech Recognition in the Browser](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective)
* MDN - [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
* MDN - [SpeechRecognition Interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
* MDN - [SpeechSynthesis Interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
* [js2coffee 2.0](http://js2.coffee/)
