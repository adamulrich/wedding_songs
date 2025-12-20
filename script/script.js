const audioElements = Array.from(document.querySelectorAll("audio"));
const globalProgressContainer = document.getElementById("global-progress-container");
const globalProgressBar = document.getElementById("global-progress-bar");
let currentIndex = -1;
let loopEnabled = false;
let shuffleEnabled = false;
let playHistory = [];

const nowPlayingText = document.getElementById("now-playing");
const globalPlayBtn = document.getElementById("globalPlayBtn");
const loopBtn = document.getElementById("loopBtn");

function toggleShuffle() {
    shuffleEnabled = !shuffleEnabled;
    shuffleBtn.textContent = shuffleEnabled ? "🔀 Shuffle: On" : "🔀 Shuffle: Off";
}

// Safely get the title for a given audio element
function getTitleForAudio(audio) {
    const songContainer = audio.closest(".song");
    const titleEl = songContainer ? songContainer.querySelector(".song-title") : null;
    return titleEl ? titleEl.textContent.trim() : "(unknown)";
}

// Update "Now Playing" text
function updateNowPlaying() {
    if (currentIndex >= 0) {
        const audio = audioElements[currentIndex];
        const title = getTitleForAudio(audio);
        nowPlayingText.textContent = title;
    } else {
        nowPlayingText.textContent = "";
    }
}

// Play a specific track by index
function playTrack(index) {
    if (index < 0 || index >= audioElements.length) return;

    // Stop all others
    audioElements.forEach((a) => {
        a.pause();
        a.currentTime = 0;
        const btn = a.closest(".song").querySelector(".controls button");
        if (btn) btn.textContent = "Play";
    });

    currentIndex = index;

    // Record history only if it's not a duplicate of the last entry
    if (playHistory[playHistory.length - 1] !== index) {
        playHistory.push(index);
    }
    const audio = audioElements[index];
    const btn = audio.closest(".song").querySelector(".controls button");

    audio.play();
    if (btn) btn.textContent = "Pause";
    globalPlayBtn.textContent = "⏸ Pause";

    updateNowPlaying();
}
// Auto-play next track when one ends
audioElements.forEach((audio, index) => {
    audio.addEventListener("ended", () => {

        // If shuffle is ON → pick a random track
        if (shuffleEnabled) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * audioElements.length);
            } while (newIndex === index && audioElements.length > 1);

            playTrack(newIndex);
            return;
        }

        // Otherwise follow normal next/loop logic
        const next = audioElements[index + 1];

        if (next) {
            playTrack(index + 1);
        } else if (loopEnabled) {
            playTrack(0);
        } else {
            globalPlayBtn.textContent = "▶ Play";
            currentIndex = -1;
            updateNowPlaying();
        }
    });
});
// Global controls
function togglePlay(button) {
    const audio = button.closest(".song").querySelector("audio");
    const index = audioElements.indexOf(audio);

    // If switching to a different track
    if (currentIndex !== index) {
        playTrack(index);
        return;
    }

    // Toggle play/pause on the current track
    if (audio.paused) {
        audio.play();
        button.textContent = "Pause";
        globalPlayBtn.textContent = "⏸ Pause";
    } else {
        audio.pause();
        button.textContent = "Play";
        globalPlayBtn.textContent = "▶ Play";
    }

    updateNowPlaying();
}

function toggleGlobalPlay() {
    // If nothing has played yet
    if (currentIndex === -1) {

        // If shuffle is ON → pick a random starting track
        if (shuffleEnabled) {
            let randomIndex = Math.floor(Math.random() * audioElements.length);
            playTrack(randomIndex);
            return;
        }

        // Otherwise start at track 0
        playTrack(0);
        return;
    }

    // If a track is already selected, toggle play/pause
    const audio = audioElements[currentIndex];
    const btn = audio.closest(".song").querySelector(".controls button");

    if (audio.paused) {
        audio.play();
        globalPlayBtn.textContent = "⏸ Pause";
        if (btn) btn.textContent = "Pause";
    } else {
        audio.pause();
        globalPlayBtn.textContent = "▶ Play";
        if (btn) btn.textContent = "Play";
    }

    updateNowPlaying();
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
    // Need at least 2 items: previous + current
    if (playHistory.length > 1) {
        // Remove current track
        playHistory.pop();

        // Get previous track
        const previousIndex = playHistory[playHistory.length - 1];

        // Play it WITHOUT modifying history
        currentIndex = previousIndex;

        const audio = audioElements[currentIndex];

        // Stop all others
        audioElements.forEach((a) => {
            a.pause();
            a.currentTime = 0;
            const btn = a.closest(".song").querySelector(".controls button");
            if (btn) btn.textContent = "Play";
        });

        // Play previous
        audio.play();
        const btn = audio.closest(".song").querySelector(".controls button");
        if (btn) btn.textContent = "Pause";
        globalPlayBtn.textContent = "⏸ Pause";

        updateNowPlaying();
        return;
    }

    // If no history, fallback to normal behavior
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

        const btn = audio.closest(".song").querySelector(".controls button");
        if (btn) btn.textContent = "Play";
    }

    currentIndex = -1;
    playHistory = []; // clear history

    globalPlayBtn.textContent = "▶ Play";
    updateNowPlaying();
}

function toggleLoop() {
    loopEnabled = !loopEnabled;
    loopBtn.textContent = loopEnabled ? "🔁 Loop: On" : "🔁 Loop: Off";
}

audioElements.forEach((audio) => {
    audio.addEventListener("timeupdate", () => {
        if (audio === audioElements[currentIndex]) {
            const percent = (audio.currentTime / audio.duration) * 100;
            globalProgressBar.style.width = percent + "%";
        }
    });
});

globalProgressContainer.addEventListener("click", (e) => {
    if (currentIndex === -1) return;

    const audio = audioElements[currentIndex];
    const rect = globalProgressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;

    audio.currentTime = percent * audio.duration;
});


// Update global progress bar as audio plays
audioElements.forEach((audio) => {
    audio.addEventListener("timeupdate", () => {
        if (audio === audioElements[currentIndex]) {
            const percent = (audio.currentTime / audio.duration) * 100;
            globalProgressBar.style.width = percent + "%";
        }
    });
});

// Allow clicking the global bar to seek
globalProgressContainer.addEventListener("click", (e) => {
    if (currentIndex === -1) return;

    const audio = audioElements[currentIndex];
    const rect = globalProgressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;

    audio.currentTime = percent * audio.duration;
});
