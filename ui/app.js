let currentMessageIndex = 0;
let currentSongName = null; // Para saber qué canción está sonando
let isMusicPanelVisible = false; // Para controlar la visibilidad del panel de música
let songListInitialized = false; // Para asegurarnos de que el panel de música solo se inicialice una vez
let isDragging = false; // Funcionalidad de arrastrar la barra de progreso
let lastRandomSong = null;

let muted = localStorage.getItem('loadscreen_muted') === 'true' || false;
let audioPlayer = new Audio(); // Instancia del reproductor de audio
let currentTimeElement = document.querySelector('.current-time');
let totalTimeElement = document.querySelector('.total-time');
let progressBar = document.querySelector('.progress-bar');
let progressBarContainer = document.querySelector('.progress-bar-container');

$(document).ready(function () {
    loadConfig();

    setTimeout(() => {
        $(".loading").addClass("show");
    }, 3000);
    $(".bgtrueblack").removeClass("show");

    // Cambiar mensaje del ticker cada 10 segundos
    setInterval(() => {
        if (Config.Messages && Config.Messages.length > 0) {
            currentMessageIndex = (currentMessageIndex + 1) % Config.Messages.length;
            $('.ticker-text').text(Config.Messages[currentMessageIndex]);
        }
    }, 10000);

    // Lógica para el progreso de carga
    let loadPercentage = 0;
    const handlers = { loadProgress(data) { loadPercentage = data.loadFraction * 100 } };
    window.addEventListener('message', (e) => (handlers[e.data.eventName] || (() => { }))(e.data));
    setInterval(() => {
        if (loadPercentage == 100) {
            setTimeout(function () {
                $(".loading").removeClass("show");
            }, 1000);
            setTimeout(function () {
                $(".bgtrueblack").addClass("show");
            }, 2000);
        }
        $(".barra").css("width", loadPercentage + "%");
    }, 250);

    window.addEventListener('message', function (event) {
        if (event.action == "terminar") {
            $(".progress").fadeOut(1000);
        }
    });

    // Lógica para la reproducción de música
    function playRandomSong() {
        const songs = Object.keys(Config.Canciones);

        // Si solo hay una canción, reproducirla
        if (songs.length === 1) {
            playSong(songs[0]);
            return;
        }

        let randomSong;
        do {
            // Combinar múltiples fuentes de aleatoriedad
            const randomIndex = Math.floor((Date.now() * Math.random() * performance.now()) % songs.length);
            randomSong = songs[randomIndex];
        } while (randomSong === lastRandomSong && songs.length > 1);

        lastRandomSong = randomSong;
        playSong(randomSong);
    }

    function playSong(songName) {
        if (currentSongName === songName) {
            return;
        }

        const songUrl = Config.Canciones[songName];
        if (songUrl) {
            audioPlayer.pause();
            audioPlayer.src = songUrl;
            audioPlayer.volume = 0.5;
            audioPlayer.muted = muted;

            // Resetear la barra de progreso y tiempos
            progressBar.style.width = '0%';
            currentTimeElement.textContent = '00:00';
            totalTimeElement.textContent = '00:00';

            audioPlayer.play().catch(e => console.error("Error al reproducir el audio: ", e));
            currentSongName = songName;
            updateActiveSong();
            $('.song-title').text(songName);
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '00:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Actualizar el tiempo mientras se reproduce la canción
    audioPlayer.addEventListener('timeupdate', function () {
        if (audioPlayer.duration) {
            const currentTime = audioPlayer.currentTime;
            const duration = audioPlayer.duration;
            const progressPercent = (currentTime / duration) * 100;

            progressBar.style.width = progressPercent + '%';
            currentTimeElement.textContent = formatTime(currentTime);
            totalTimeElement.textContent = formatTime(duration);
        }
    });

    // Hacer clic en la barra de progreso para saltar a un punto específico
    progressBarContainer.addEventListener('click', function (e) {
        if (audioPlayer.duration && audioPlayer.duration > 0) {
            const clickPosition = e.offsetX;
            const containerWidth = this.offsetWidth;
            const clickPercent = clickPosition / containerWidth;
            const newTime = clickPercent * audioPlayer.duration;

            audioPlayer.currentTime = newTime;
            progressBar.style.width = clickPercent * 100 + '%';

            // Actualizar el tiempo actual inmediatamente
            currentTimeElement.textContent = formatTime(newTime);
        }
    });

    progressBarContainer.addEventListener('mousedown', function (e) {
        if (audioPlayer.duration && audioPlayer.duration > 0) {
            isDragging = true;
            updateProgressBar(e);
        }
    });

    document.addEventListener('mousemove', function (e) {
        if (isDragging) {
            updateProgressBar(e);
        }
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
    });

    function updateProgressBar(e) {
        const containerRect = progressBarContainer.getBoundingClientRect();
        const clickPosition = e.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        let clickPercent = clickPosition / containerWidth;

        // Asegurarse de que el porcentaje esté entre 0 y 1
        clickPercent = Math.max(0, Math.min(1, clickPercent));

        const newTime = clickPercent * audioPlayer.duration;

        audioPlayer.currentTime = newTime;
        progressBar.style.width = clickPercent * 100 + '%';
        currentTimeElement.textContent = formatTime(newTime);
    }

    // Actualizar la duración total cuando se cargan los metadatos
    audioPlayer.addEventListener('loadedmetadata', function () {
        if (audioPlayer.duration) {
            totalTimeElement.textContent = formatTime(audioPlayer.duration);
        }
    });

    // Cuando una canción termina, reproducir la siguiente aleatoriamente
    audioPlayer.addEventListener('ended', function () {
        playRandomSong();
    });

    // Control de volumen
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeIcon = document.querySelector('.volume-icon i');

    volumeSlider.addEventListener('input', function () {
        audioPlayer.volume = this.value;

        // Cambiar icono según el volumen
        if (this.value == 0) {
            volumeIcon.className = 'fa-solid fa-volume-xmark';
        } else if (this.value < 0.5) {
            volumeIcon.className = 'fa-solid fa-volume-low';
        } else {
            volumeIcon.className = 'fa-solid fa-volume-high';
        }
    });

    function updateActiveSong() {
        $('.song-item').removeClass('active');
        $(`.song-item:contains('${currentSongName}')`).addClass('active');
    }

    // Evento para el botón de toggle del panel
    $('.toggle-panel-btn').on('click', function () {
        isMusicPanelVisible = !isMusicPanelVisible;
        if (isMusicPanelVisible) {
            $('.music-panel').addClass('show');
        } else {
            $('.music-panel').removeClass('show');
        }
    });

    // Función para reproducir la canción anterior
    function playPreviousSong() {
        const songNames = Object.keys(Config.Canciones);
        const currentIndex = songNames.indexOf(currentSongName);
        const prevIndex = (currentIndex - 1 + songNames.length) % songNames.length;
        playSong(songNames[prevIndex]);
    }

    // Función para reproducir la siguiente canción
    function playNextSong() {
        const songNames = Object.keys(Config.Canciones);
        const currentIndex = songNames.indexOf(currentSongName);
        const nextIndex = (currentIndex + 1) % songNames.length;
        playSong(songNames[nextIndex]);
    }

    $('.song-list').on('click', '.song-item', function () {
        const songName = $(this).text().trim();
        playSong(songName);
    });

    $('.prev-btn').on('click', playPreviousSong);
    $('.next-btn').on('click', playNextSong);

    // Control de play/pause
    document.querySelector('.play-btn').addEventListener('click', function () {
        if (audioPlayer.paused) {
            audioPlayer.play();
            this.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
            audioPlayer.pause();
            this.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
    });

    // Eventos de teclado para controles de música
    window.addEventListener('keydown', (e) => {
        // ESPACIO (32) - Pausar/Reanudar
        if (e.which == 32) {
            e.preventDefault();

            const playButton = document.querySelector('.play-btn');

            if (!currentSongName) {
                playRandomSong();
                playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
                } else {
                    audioPlayer.pause();
                    playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
                }
            }
        }

        // Tecla M (77) - Mutear/Desmutear
        if (e.which == 77) {
            e.preventDefault();

            if (currentSongName) {
                muted = !muted;
                audioPlayer.muted = muted;

                if (muted) {
                    volumeIcon.className = 'fa-solid fa-volume-xmark';
                    volumeSlider.value = 0;
                } else {
                    volumeIcon.className = 'fa-solid fa-volume-high';
                    volumeSlider.value = audioPlayer.volume;
                }

                localStorage.setItem('loadscreen_muted', muted);
            }
        }

        // Flecha izquierda (37) - Retroceder 10 segundos
        if (e.which == 37 && currentSongName) {
            e.preventDefault();
            audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
        }

        // Flecha derecha (39) - Adelantar 10 segundos  
        if (e.which == 39 && currentSongName) {
            e.preventDefault();
            audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
        }

        // Tecla P (80) - Mostrar/ocultar panel de música
        if (e.which == 80) {
            e.preventDefault();
            isMusicPanelVisible = !isMusicPanelVisible;
            if (isMusicPanelVisible) {
                $('.music-panel').addClass('show');
            } else {
                $('.music-panel').removeClass('show');
            }
        }
    });
});

function loadConfig() {
    if (isImage(Config.Background)) {
        document.getElementById("myVideo").style.display = "none";
        document.body.style.backgroundImage = `url(${Config.Background})`;
    } else {
        document.body.style.backgroundImage = "none";
        document.getElementById("myVideo").src = Config.Background;
        document.getElementById("myVideo").style.display = "block";
    }

    document.querySelector(".logo img").src = Config.Logo;
    Translate(".loading_text", Config.Translates.loading, false);

    // Llenar el panel de canciones al cargar
    const songList = $('.song-list');
    for (const songName in Config.Canciones) {
        songList.append(`<li class=\"song-item\">${songName}</li>`);
    }

    // Inicializa el ticker de texto
    if (Config.Messages && Config.Messages.length > 0) {
        $('.ticker-text').text(Config.Messages[0]);
    }
}

function isImage(url) {
    const extension = url.split('.').pop().toLowerCase();
    return Config.ImageExtensions.includes(extension);
}

function Translate(id, text, html) {
    let cm = document.querySelector(id)
    if (!html) {
        cm.innerText = text;
    } else {
        cm.innerHTML = text;
    }
}