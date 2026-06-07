const audioElements = Array.from(document.querySelectorAll("audio"));
const globalProgressContainer = document.getElementById("global-progress-container");
const globalProgressBar = document.getElementById("global-progress-bar");
const nowPlayingText = document.getElementById("now-playing");
const globalPlayBtn = document.getElementById("globalPlayBtn");
const loopBtn = document.getElementById("loopBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

let currentIndex = -1;
let loopEnabled = false;
let shuffleEnabled = false;
let playHistory = [];
let mediaSessionHandlersRegistered = false;

function supportsMediaSession() {
    return "mediaSession" in navigator;
}

function getTitleForAudio(audio) {
    const songContainer = audio.closest(".song");
    const titleEl = songContainer ? songContainer.querySelector(".song-title") : null;
    return titleEl ? titleEl.textContent.trim() : "(unknown)";
}

function setSongButtonState(audio, isPlaying) {
    const button = audio.closest(".song").querySelector(".controls button");
    if (button) {
        button.textContent = isPlaying ? "Pause" : "Play";
    }
}

function updatePlaybackState() {
    if (!supportsMediaSession()) return;

    if (currentIndex === -1) {
        navigator.mediaSession.playbackState = "none";
        return;
    }

    const audio = audioElements[currentIndex];
    navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
}

function updatePositionState() {
    if (!supportsMediaSession() || currentIndex === -1) return;

    const audio = audioElements[currentIndex];
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    try {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: audio.currentTime
        });
    } catch (error) {
        // Browsers vary in Media Session support; ignore unsupported position updates.
    }
}

function updateMediaSessionMetadata() {
    if (!supportsMediaSession()) return;

    if (currentIndex === -1) {
        navigator.mediaSession.metadata = null;
        updatePlaybackState();
        return;
    }

    const audio = audioElements[currentIndex];
    navigator.mediaSession.metadata = new MediaMetadata({
        title: getTitleForAudio(audio),
        artist: "Jackson & Karla",
        album: "Wedding Songs",
        artwork: [
            { src: "images/album_art_small.png", sizes: "512x512", type: "image/png" },
            { src: "images/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "images/icon-192.png", sizes: "192x192", type: "image/png" }
        ]
    });

    updatePlaybackState();
    updatePositionState();
}

function registerMediaSessionHandlers() {
    if (!supportsMediaSession() || mediaSessionHandlersRegistered) return;

    navigator.mediaSession.setActionHandler("play", () => {
        if (currentIndex === -1) {
            playTrack(shuffleEnabled ? Math.floor(Math.random() * audioElements.length) : 0);
            return;
        }

        const audio = audioElements[currentIndex];
        if (audio.paused) {
            audio.play();
            setSongButtonState(audio, true);
            globalPlayBtn.textContent = "Pause";
            updatePlaybackState();
        }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
        if (currentIndex === -1) return;

        const audio = audioElements[currentIndex];
        if (!audio.paused) {
            audio.pause();
            setSongButtonState(audio, false);
            globalPlayBtn.textContent = "Play";
            updatePlaybackState();
        }
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
        prevTrack();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextTrack();
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (currentIndex === -1 || details.seekTime == null) return;

        const audio = audioElements[currentIndex];
        if (details.fastSeek && typeof audio.fastSeek === "function") {
            audio.fastSeek(details.seekTime);
        } else {
            audio.currentTime = details.seekTime;
        }

        updatePositionState();
    });

    navigator.mediaSession.setActionHandler("stop", () => {
        stopPlayback();
    });

    mediaSessionHandlersRegistered = true;
}

function updateNowPlaying() {
    if (currentIndex >= 0) {
        nowPlayingText.textContent = getTitleForAudio(audioElements[currentIndex]);
    } else {
        nowPlayingText.textContent = "";
    }

    updateMediaSessionMetadata();
}

function stopAllTracks() {
    audioElements.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        setSongButtonState(audio, false);
    });
}

function playTrack(index) {
    if (index < 0 || index >= audioElements.length) return;

    stopAllTracks();
    currentIndex = index;

    if (playHistory[playHistory.length - 1] !== index) {
        playHistory.push(index);
    }

    const audio = audioElements[index];
    audio.play();
    setSongButtonState(audio, true);
    globalPlayBtn.textContent = "Pause";

    updateNowPlaying();
    updatePlaybackState();
}

function playNextAfterEnd(index) {
    if (shuffleEnabled) {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioElements.length);
        } while (newIndex === index && audioElements.length > 1);

        playTrack(newIndex);
        return;
    }

    const next = audioElements[index + 1];
    if (next) {
        playTrack(index + 1);
    } else if (loopEnabled) {
        playTrack(0);
    } else {
        currentIndex = -1;
        globalPlayBtn.textContent = "Play";
        globalProgressBar.style.width = "0%";
        updateNowPlaying();
        updatePlaybackState();
    }
}

function toggleShuffle() {
    shuffleEnabled = !shuffleEnabled;
    shuffleBtn.textContent = shuffleEnabled ? "Shuffle: On" : "Shuffle: Off";
}

function toggleLoop() {
    loopEnabled = !loopEnabled;
    loopBtn.textContent = loopEnabled ? "Loop: On" : "Loop: Off";
}

function togglePlay(button) {
    const audio = button.closest(".song").querySelector("audio");
    const index = audioElements.indexOf(audio);

    if (currentIndex !== index) {
        playTrack(index);
        return;
    }

    if (audio.paused) {
        audio.play();
        setSongButtonState(audio, true);
        globalPlayBtn.textContent = "Pause";
    } else {
        audio.pause();
        setSongButtonState(audio, false);
        globalPlayBtn.textContent = "Play";
    }

    updateNowPlaying();
    updatePlaybackState();
}

function toggleGlobalPlay() {
    if (currentIndex === -1) {
        const index = shuffleEnabled ? Math.floor(Math.random() * audioElements.length) : 0;
        playTrack(index);
        return;
    }

    const audio = audioElements[currentIndex];
    if (audio.paused) {
        audio.play();
        setSongButtonState(audio, true);
        globalPlayBtn.textContent = "Pause";
    } else {
        audio.pause();
        setSongButtonState(audio, false);
        globalPlayBtn.textContent = "Play";
    }

    updateNowPlaying();
    updatePlaybackState();
}

function nextTrack() {
    if (shuffleEnabled) {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * audioElements.length);
        } while (newIndex === currentIndex && audioElements.length > 1);

        playTrack(newIndex);
        return;
    }

    if (currentIndex < audioElements.length - 1) {
        playTrack(currentIndex + 1);
    } else if (loopEnabled) {
        playTrack(0);
    }
}

function prevTrack() {
    if (playHistory.length > 1) {
        playHistory.pop();
        const previousIndex = playHistory[playHistory.length - 1];

        stopAllTracks();
        currentIndex = previousIndex;

        const audio = audioElements[currentIndex];
        audio.play();
        setSongButtonState(audio, true);
        globalPlayBtn.textContent = "Pause";

        updateNowPlaying();
        updatePlaybackState();
        return;
    }

    if (currentIndex > 0) {
        playTrack(currentIndex - 1);
    } else if (loopEnabled) {
        playTrack(audioElements.length - 1);
    }
}

function stopPlayback() {
    if (currentIndex >= 0) {
        const audio = audioElements[currentIndex];
        audio.pause();
        audio.currentTime = 0;
        setSongButtonState(audio, false);
    }

    currentIndex = -1;
    playHistory = [];
    globalPlayBtn.textContent = "Play";
    globalProgressBar.style.width = "0%";

    updateNowPlaying();
    updatePlaybackState();
}

audioElements.forEach((audio, index) => {
    audio.addEventListener("ended", () => {
        playNextAfterEnd(index);
    });

    audio.addEventListener("timeupdate", () => {
        if (audio !== audioElements[currentIndex]) return;

        const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        globalProgressBar.style.width = percent + "%";
        updatePositionState();
    });

    audio.addEventListener("play", () => {
        if (audio === audioElements[currentIndex]) {
            updatePlaybackState();
        }
    });

    audio.addEventListener("pause", () => {
        if (audio === audioElements[currentIndex]) {
            updatePlaybackState();
        }
    });

    audio.addEventListener("loadedmetadata", () => {
        if (audio === audioElements[currentIndex]) {
            updateMediaSessionMetadata();
        }
    });

    audio.addEventListener("ratechange", () => {
        if (audio === audioElements[currentIndex]) {
            updatePositionState();
        }
    });
});

globalProgressContainer.addEventListener("click", (event) => {
    if (currentIndex === -1) return;

    const audio = audioElements[currentIndex];
    const rect = globalProgressContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;

    audio.currentTime = percent * audio.duration;
    updatePositionState();
});

registerMediaSessionHandlers();
