# Web Speech API in Framer.js

![Framer.js iOS Google Now prototype for iPhone 7](_img/google-now-framer-gray.gif)

### What you’ll learn
* How to connect to the Web Speech API
* How to access your device’s audio input
* How to access your device’s voice synthesizer

### What you’ll need
* The sample code
* Framer Studio (or Framer.js and a text editor)
* Basic knowledge of HTML, CSS, and JavaScript
* Chrome >33

The [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) provides web apps the ability to recognize voices, transform the audio input into strings, and control the synthesis voices available on the device.

Its two parts, SpeechRecognition (Asynchronous Speech Recognition) and SpeechSynthesis (Text-to-Speech) allow designers to prototype speech-based conversational UIs like [Google Now](https://www.google.com/search/about/learn-more/now/), [Apple's Siri](http://www.apple.com/ios/siri/), and [Amazon Alexa](https://developer.amazon.com/alexa).

The Web Speech API is flagged as an experimental feature in Chrome and Firefox, and is supported in [Chrome Stable 33 and greater](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#Browser_compatibility).

### SpeechRecognition Prototype
>**tl;dr** This prototype will not function in Framer Studio.

You can [interact](http://share.framerjs.com/jlralchs6vaz/) with the sample prototype of Google's iOS app—using Chrome—or clone this repo. Your browser may request permission to use the microphone.

Framer Studio, the official coding environment of Framer.js, is a Safari browser application, which [doesn't fully support](http://caniuse.com/#feat=speech-recognition) the SpeechRecoginition interface of this experimental API. (Safari supports the SpeechSynthesis interface, however.) Framer Studio will likely give the error below and you may not be able to interact with your prototype's preview in the IDE.

```coffeescript
TypeError: undefined is not a constructor (evaluating 'new SpeechRecognition')
```

![Framer Studio errors](_img/google-now-framer-studio.png)

To get around this, we'll run `python -m SimpleHTTPServer [port]` in the directory of the prototype's index.html file and use [Chrome 33 or greater](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#Browser_compatibility) when interacting with our prototypes. (`SpeechRecognition` doesn't trigger the microphone in Framer Studio's-generated server.)

1. Open Terminal
2. `cd` into `speech-recognition.framer`
3. Type: `python -m SimpleHTTPServer 8090`
4. In Chrome, navigate to [http://127.0.0.1:8090/](http://127.0.0.1:8090/)

This will now show the prototype in the current working directory.

![Framer in Chrome browser](_img/google-now-chrome.png)

### Motion port

The `speech-recognition/` directory contains a Motion-powered rebuild that mirrors the Framer prototype, including assets and interactions. Run it with any static server (Chrome 33+ is still required for the Web Speech API):

```
cd speech-recognition
python3 -m http.server 8090
# Visit http://127.0.0.1:8090 in Chrome and allow microphone access.
```

An updated artboard variant for iOS 26 (402×874) lives in `speech-recognition-ios26/` (currently pointed at the original assets in `images-old/` until new artwork is added).


### SpeechRecognition Interface

The [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) interface allows us to recognize speech and respond accordingly. PromptWorks' piece on [Speech Recognition in the Browser](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective) provided the snippet below as JavaScript.

You can paste this in Framer Studio (or run it in the browser build) and open it with Chrome.

Your browser may request permission to use the microphone.

```javascript
// This API is currently prefixed in Chrome
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Create a new recognizer
const recognizer = new SpeechRecognition();

// Start producing results before the person has finished speaking
recognizer.interimResults = true;

// Set the language of the recognizer
recognizer.lang = "en-US";

// Define a callback to process results
recognizer.onresult = event => {
  const result = event.results[event.resultIndex];
  if (!result || !result[0]) return;
  console.log(result[0].transcript);
};

// Start listening...
recognizer.start();
```

Now we can do any number of things with the audio, which is now a string. For example, you can pass the output as HTML to a layer.

```javascript
const textBox = new Layer({
	backgroundColor: "none",
	color: "#969696",
	html: "Speak now",
});

textBox.style = {
	fontSize: "50px",
	fontWeight: "300",
	textAlign: "left",
	fontFamily: "Arial",
};

recognizer.onresult = event => {
	const result = event.results[event.resultIndex];
	if (!result || !result[0]) return;
	textBox.html = result[0].transcript;
};
```

### SpeechSynthesis Interface
The [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) interface provides controls and methods for the synthesis voices available on the device. [Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis#Browser_compatibility) is better with this interface, with support both in Safari and on several mobile browsers.

Snippets from [PromptWorks](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective).

```javascript
speechSynthesis.speak(new SpeechSynthesisUtterance("Hello world."));
```

Incrementing `utterance.voice = voices[1]` should allow you to cycle through your device's synthesis voices.

```javascript
const voices = speechSynthesis.getVoices();
const utterance = new SpeechSynthesisUtterance("Hello world.");
utterance.voice = voices[1];
speechSynthesis.speak(utterance);
```

---
**NOTE:** While the Framer Classic application is no longer available, you can still view and even edit your Framer Classic files. These files, which use the ".framer" extension, are self-contained and can be viewed by running a web server in the folder.

To do this, you can follow these steps:

1. Make a copy of the Framer Classic file.
2. Remove the .framer extension at the end of the filename. This will turn it into a regular folder.
3. Pick the folder you created, start the webserver, and open it in your browser.

To make changes to your Classic files, you can modify the "app.js" file inside the folder.

---

### References
* PromptWorks - [Speech Recognition in the Browser](https://www.promptworks.com/blog/speech-recoginition-in-the-browser?utm_source=codropscollective)
* MDN - [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
* MDN - [SpeechRecognition Interface](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
* MDN - [SpeechSynthesis Interface ](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
* [js2coffee 2.0](http://js2.coffee/)
