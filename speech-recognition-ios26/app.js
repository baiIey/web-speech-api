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
let restartCount = 0;
let lastRestart = 0;
let watchdogTimeout;
let promptSwapTimeout;
let speechTimeout;
const MAX_RESTARTS_BEFORE_REBUILD = 20;
const MIN_RESTART_GAP = 2000; // ms
const WATCHDOG_MS = 8000;
const INACTIVITY_REFRESH_MS = 12000;
const PROMPT_SWAP_MS = 1200;

/*
Speech interaction touchpoints (keep these easy to scan for designers):
- toggleSpeechAnimation() — adds/removes `.speaking`, swapping listening vs speaking animation.
- toListening()/toIdle() — adds/removes `.listening`, shows/hides header controls.
- schedulePromptSwap() — nudges text to “Start talking…” if no speech yet.
- attachRecognizerHandlers() — maps recognizer events to UI (start/stop animations, prompts, watchdog).
State flow (UI):
- idle --startListening--> listening
- listening --stopListening/recognizer end--> idle
*/

function enableTransitionsAfterPaint() {
	// Let the first frame paint without transitions/animations, then enable them.
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			document.body.classList.add("hydrated");
		});
	});
}
enableTransitionsAfterPaint();

function createRecognizer() {
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	if (!SpeechRecognition) return null;
	const r = new SpeechRecognition();
	r.lang = "en-US";
	r.interimResults = true;
	// Some browsers support this; safe to ignore if not
	try {
		r.continuous = true;
	} catch (_) {}
	return r;
}

recognizer = createRecognizer();
if (!recognizer) {
	setTranscript("SpeechRecognition unavailable in this browser.");
	micButton.disabled = true;
	micButton.setAttribute("aria-disabled", "true");
}

// Timeout helpers: prompt swaps, transcript reset, speech animation off, inactivity refresh.
// --- Timeout helpers: prompt swaps, transcript reset, speech animation off, inactivity refresh ---
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

function clearPromptSwap() {
	if (!promptSwapTimeout) return;
	window.clearTimeout(promptSwapTimeout);
	promptSwapTimeout = null;
}

function schedulePromptSwap() {
	clearPromptSwap();
	promptSwapTimeout = window.setTimeout(() => {
		if (!isRecognizing || !shouldListen) return;
		// Only swap if we haven't started speaking yet
		if (!device.classList.contains("speaking")) {
			setTranscript("Start talking...");
		}
		promptSwapTimeout = null;
	}, PROMPT_SWAP_MS);
}

function clearSpeechTimeout() {
	if (!speechTimeout) return;
	window.clearTimeout(speechTimeout);
	speechTimeout = null;
}

function scheduleSpeechTimeout() {
	clearSpeechTimeout();
	speechTimeout = window.setTimeout(() => {
		toggleSpeechAnimation(false);
	}, 1500);
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
	}, delay ?? INACTIVITY_REFRESH_MS);
}

function setTranscript(value) {
	clearTranscriptReset();
	textBox.textContent = value || "Speak now";
}

function toggleSpeechAnimation(isThinking) {
	if (isThinking) {
		device.classList.add("speaking");
		scheduleSpeechTimeout();
	} else {
		device.classList.remove("speaking");
		clearSpeechTimeout();
	}
}

// UI state toggles for listening/idle and header controls
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
	schedulePromptSwap();
}

function stopListening() {
	shouldListen = false;
	if (recognizer) {
		recognizer.stop();
	}
	clearPromptSwap();
	clearSpeechTimeout();
	clearInactivityRefresh();
	toggleSpeechAnimation(false);
	toIdle();
	scheduleTranscriptReset(500);
}

function restartRecognizer(message) {
	if (!shouldListen) return;
	if (!recognizer) return;
	if (isRecognizing) return;
	const now = Date.now();
	if (now - lastRestart < MIN_RESTART_GAP) {
		window.setTimeout(() => restartRecognizer(message), MIN_RESTART_GAP - (now - lastRestart));
		return;
	}
	lastRestart = now;
	try {
		currentTranscript = "";
		if (message) {
			setTranscript(message);
		} else {
			setTranscript("Speak now");
		}
		toggleSpeechAnimation(false);
		clearSpeechTimeout();
		isRecognizing = true;
		recognizer.start();
		restartCount += 1;
		scheduleInactivityRefresh(INACTIVITY_REFRESH_MS);
		scheduleWatchdog();
			schedulePromptSwap();
			if (restartCount >= MAX_RESTARTS_BEFORE_REBUILD) {
				rebuildRecognizer();
			}
		} catch (err) {
			console.warn("Speech start failed", err);
			isRecognizing = false;
		}
}

function rebuildRecognizer() {
	clearWatchdog();
	clearInactivityRefresh();
	if (recognizer) {
		try {
			recognizer.onresult = null;
			recognizer.onerror = null;
			recognizer.onend = null;
			recognizer.onspeechstart = null;
			recognizer.onspeechend = null;
		} catch (_) {}
	}
	recognizer = createRecognizer();
	restartCount = 0;
	if (!recognizer) {
		setTranscript("SpeechRecognition unavailable in this browser.");
		shouldListen = false;
		toIdle();
		return;
	}
	attachRecognizerHandlers();
	restartRecognizer("Speak now");
}

function clearWatchdog() {
	if (!watchdogTimeout) return;
	window.clearTimeout(watchdogTimeout);
	watchdogTimeout = null;
}

function scheduleWatchdog() {
	clearWatchdog();
	watchdogTimeout = window.setTimeout(() => {
		if (!shouldListen) return;
		console.warn("Watchdog: recognizer stuck, rebuilding");
		rebuildRecognizer();
	}, WATCHDOG_MS);
}

function attachRecognizerHandlers() {
	if (!recognizer) return;
	recognizer.onresult = (event) => {
		const result = event.results[event.resultIndex];
		if (!result || !result[0]) return;
		const transcript = result[0].transcript.trim();
		currentTranscript = transcript;
		setTranscript(transcript || "Speak now");
		scheduleInactivityRefresh();
		clearWatchdog();
		clearPromptSwap();
		// Speech UI: stop speaking animation on finals (onspeechend may not fire); keep rolling timeout during interim speech.
		if (result.isFinal) {
			toggleSpeechAnimation(false);
		} else {
			scheduleSpeechTimeout();
		}
		if (isRecognizing) scheduleWatchdog();
	};

	recognizer.onspeechstart = () => {
		// Speech UI: entering speaking state swaps to the speaking animation.
		toggleSpeechAnimation(true);
		clearWatchdog();
		clearPromptSwap();
	};
	recognizer.onspeechend = () => {
		// Speech UI: leave speaking state when speech ends normally.
		toggleSpeechAnimation(false);
		clearSpeechTimeout();
		scheduleWatchdog();
	};

	recognizer.onerror = () => {
		isRecognizing = false;
		clearWatchdog();
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
		clearWatchdog();
		toggleSpeechAnimation(false);
		if (shouldListen) {
			restartRecognizer();
			return;
		}
		toIdle();
		if (!currentTranscript) scheduleTranscriptReset(0);
	};
}

attachRecognizerHandlers();

if (closeButton) closeButton.disabled = true;
if (webButton) webButton.disabled = true;

if (micButton) micButton.addEventListener("click", startListening);
if (closeButton) closeButton.addEventListener("click", stopListening);
toggleSpeechAnimation(false);
setTranscript("Speak now");
