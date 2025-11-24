const device = document.getElementById("device");
const textBox = document.getElementById("textBox");
const micButton = document.getElementById("micButton");
const closeButton = document.getElementById("closeButton");
const webButton = document.getElementById("webButton");

let uiState = "idle"; // idle | listening
let currentTranscript = "";
let recognizer;
let resetTranscriptTimeout;
let isRecognizing = false;
let inactivityTimeout;
let shouldListen = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
	recognizer = new SpeechRecognition();
	recognizer.lang = "en-US";
	recognizer.interimResults = true;

	recognizer.onresult = (event) => {
		const result = event.results[event.resultIndex];
		if (!result || !result[0]) return;
		const transcript = result[0].transcript.trim();
		currentTranscript = transcript;
		setTranscript(transcript || "Speak now");
		scheduleInactivityRefresh();
	};

	recognizer.onspeechstart = () => toggleSpeechAnimation(true);
	recognizer.onspeechend = () => toggleSpeechAnimation(false);

	recognizer.onerror = () => {
		isRecognizing = false;
		toggleSpeechAnimation(false);
		if (shouldListen) {
			setTranscript("Didn't catch that - listening again");
			scheduleInactivityRefresh();
			restartRecognizer();
			return;
		}
		setTranscript("There was an error. Try again.");
		toIdle();
		scheduleTranscriptReset(1500);
	};

	recognizer.onend = () => {
		isRecognizing = false;
		toggleSpeechAnimation(false);
		if (shouldListen) {
			restartRecognizer();
			return;
		}
		toIdle();
		if (!currentTranscript) scheduleTranscriptReset(0);
	};
} else {
	setTranscript("SpeechRecognition unavailable in this browser.");
	micButton.disabled = true;
	micButton.setAttribute("aria-disabled", "true");
}

function clearTranscriptReset() {
	if (!resetTranscriptTimeout) return;
	window.clearTimeout(resetTranscriptTimeout);
	resetTranscriptTimeout = null;
}

function scheduleTranscriptReset(delay = 0) {
	clearTranscriptReset();
	resetTranscriptTimeout = window.setTimeout(() => {
		currentTranscript = "";
		textBox.textContent = "Speak now";
		resetTranscriptTimeout = null;
	}, delay);
}

function clearInactivityRefresh() {
	if (!inactivityTimeout) return;
	window.clearTimeout(inactivityTimeout);
	inactivityTimeout = null;
}

function scheduleInactivityRefresh(delay = 10000) {
	clearInactivityRefresh();
	inactivityTimeout = window.setTimeout(() => {
		if (!shouldListen) return;
		currentTranscript = "";
		setTranscript("Still listening - resetting...");
		if (recognizer && isRecognizing) {
			try {
				recognizer.stop();
			} catch (err) {
				console.warn("Failed to stop for refresh", err);
			}
			return;
		}
		restartRecognizer();
	}, delay);
}

function setTranscript(value) {
	clearTranscriptReset();
	textBox.textContent = value || "Speak now";
}

function toggleSpeechAnimation(isThinking) {
	if (isThinking) {
		device.classList.add("speaking");
	} else {
		device.classList.remove("speaking");
	}
}

function toListening() {
	if (uiState === "listening") return;
	uiState = "listening";
	device.classList.add("listening");
	if (closeButton) closeButton.disabled = false;
	if (webButton) webButton.disabled = false;
}

function toIdle() {
	if (uiState === "idle") return;
	uiState = "idle";
	device.classList.remove("listening");
	device.classList.remove("speaking");
	if (closeButton) closeButton.disabled = true;
	if (webButton) webButton.disabled = true;
}

function startListening() {
	shouldListen = true;
	toListening();
	restartRecognizer("Speak now");
}

function stopListening() {
	shouldListen = false;
	if (recognizer) {
		recognizer.stop();
	}
	clearInactivityRefresh();
	toggleSpeechAnimation(false);
	toIdle();
	scheduleTranscriptReset(500);
}

function restartRecognizer(message) {
	if (!shouldListen) return;
	if (!recognizer) return;
	if (isRecognizing) return;
	try {
		currentTranscript = "";
		if (message) {
			setTranscript(message);
		} else {
			setTranscript("Speak now");
		}
		isRecognizing = true;
		recognizer.start();
		scheduleInactivityRefresh();
	} catch (err) {
		console.warn("Speech start failed", err);
		isRecognizing = false;
	}
}

if (closeButton) closeButton.disabled = true;
if (webButton) webButton.disabled = true;

if (micButton) micButton.addEventListener("click", startListening);
if (closeButton) closeButton.addEventListener("click", stopListening);
toggleSpeechAnimation(false);
setTranscript("Speak now");
