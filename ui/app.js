let muted = localStorage.getItem('loadscreen_muted') === 'true' || false;
let currentMessageIndex = 0; // Agregado para el control de mensajes

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

    // PROGRESS
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

    window.addEventListener('keydown', (e) => {
        if (e.which == 32) {
            muted = !muted;
            document.getElementById("myVideo").muted = muted;
            localStorage.setItem('loadscreen_muted', muted);
            Translate(".mute", (!muted && Config.Translates.mute || Config.Translates.unmute), true);
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
        // El video ya se mutea por defecto en el HTML, y el script controla el muteo con la tecla
    }

    document.querySelector(".logo img").src = Config.Logo;

    Translate(".loading_text", Config.Translates.loading, false);
    Translate(".mute", (!muted && Config.Translates.mute || Config.Translates.unmute), true);

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