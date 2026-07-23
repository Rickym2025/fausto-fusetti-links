document.addEventListener('DOMContentLoaded', function() {

    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqGvRLpmvSmbGrLg4BcH6Ch86-TuwDKDJ282EbPUJ1jUPgmT_C9ocn_3BQbqk1FSKm/exec';
    const CHATBOT_WEBHOOK = 'https://n8n.rmstudio.app/webhook/ffausto-ai-chat';

    const globalPlayer = document.getElementById('global-audio-player');
    const bgAudio = document.getElementById('background-audio');
    
    let allSongsData = [];
    let albumsMap = {};

    let currentAlbumQueue = [];
    let currentAlbumIndex = 0;
    let currentAlbumName = "";
    let isAlbumPlaying = false;

    // AUDIO DI SOTTOFONDO
    const audioOverlay = document.getElementById('audio-start-overlay');
    const startAudioBtn = document.getElementById('start-audio-btn');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    let isBgMuted = true;

    startAudioBtn.onclick = () => {
        audioOverlay.style.display = 'none';
        isBgMuted = false;
        bgAudio.volume = 0.35;
        bgAudio.play().catch(e => console.log("Autoplay bloccato", e));
        updateAudioBtnIcon();
    };

    audioToggleBtn.onclick = () => {
        isBgMuted = !isBgMuted;
        if(isBgMuted) {
            bgAudio.pause();
        } else {
            bgAudio.play().catch(()=>{});
        }
        updateAudioBtnIcon();
    };

    function updateAudioBtnIcon() {
        audioToggleBtn.innerHTML = isBgMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    }

    // DISCOGRAFIA GOOGLE SHEETS
    async function loadDiscography() {
        const grid = document.getElementById('discography-grid');
        
        try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?source=catalogo&t=${Date.now()}`);
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                allSongsData = data;
                groupSongsByAlbum(data);
                renderDiscographyGrid();
            } else {
                grid.innerHTML = '<p style="color:#aaa;">Nessun album trovato nel catalogo.</p>';
            }
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<p style="color:#ff5555;">Errore durante il caricamento della discografia.</p>';
        }
    }

    function groupSongsByAlbum(songs) {
        albumsMap = {};
        songs.forEach(song => {
            let albumName = song.Titolo_CD ? String(song.Titolo_CD).trim() : "";
            if (!albumName || albumName === "undefined" || albumName === "null") {
                albumName = "Inediti & Singoli";
            }
            if (!albumsMap[albumName]) {
                albumsMap[albumName] = [];
            }
            albumsMap[albumName].push(song);
        });
    }

    function renderDiscographyGrid() {
        const grid = document.getElementById('discography-grid');
        grid.innerHTML = '';

        for (const [albumTitle, songs] of Object.entries(albumsMap)) {
            let cover = songs[0].Link_Thumbnail || 'logo6.jpg';
            if (cover.includes('suno.ai') && cover.includes('?')) cover = cover.split('?')[0];

            const card = document.createElement('div');
            card.className = 'album-card';
            card.innerHTML = `
                <div>
                    <img src="${cover}" class="album-cover-img" onerror="this.onerror=null; this.src='logo6.jpg';">
                    <div class="album-card-title">${albumTitle}</div>
                    <div class="album-card-count">${songs.length} brani contenuti</div>
                </div>
                <div class="album-actions-group">
                    <button class="album-btn album-btn-playall" onclick="startFullAlbumPlay('${albumTitle.replace(/'/g, "\\'")}')">
                        <i class="fas fa-play"></i> Ascolta Tutto l'Album
                    </button>
                    <button class="album-btn album-btn-view" onclick="openAlbumModal('${albumTitle.replace(/'/g, "\\'")}')">
                        <i class="fas fa-list"></i> Apri Tracce
                    </button>
                </div>
            `;
            grid.appendChild(card);
        }
    }

    // RIPRODUZIONE CONTINUA CD
    window.startFullAlbumPlay = function(albumTitle) {
        currentAlbumQueue = albumsMap[albumTitle] || [];
        if (currentAlbumQueue.length === 0) return;

        currentAlbumName = albumTitle;
        currentAlbumIndex = 0;
        isAlbumPlaying = true;

        if (bgAudio) bgAudio.pause();

        playQueueSong();
        showAlbumBar();
    };

    function playQueueSong() {
        if (currentAlbumIndex >= currentAlbumQueue.length) {
            closeAlbumBar();
            return;
        }

        const song = currentAlbumQueue[currentAlbumIndex];
        globalPlayer.src = song.url;
        globalPlayer.play().catch(e => console.log("Errore riproduzione:", e));

        document.getElementById('player-album-title').innerText = `Album: ${currentAlbumName}`;
        document.getElementById('player-song-title').innerText = `Traccia ${currentAlbumIndex + 1}/${currentAlbumQueue.length}: ${song.Titolo}`;
        document.getElementById('album-play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
    }

    window.toggleAlbumPlay = function() {
        if (globalPlayer.paused) {
            globalPlayer.play();
            document.getElementById('album-play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            globalPlayer.pause();
            document.getElementById('album-play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        }
    };

    window.nextAlbumTrack = function() {
        if (currentAlbumIndex < currentAlbumQueue.length - 1) {
            currentAlbumIndex++;
            playQueueSong();
        }
    };

    window.prevAlbumTrack = function() {
        if (currentAlbumIndex > 0) {
            currentAlbumIndex--;
            playQueueSong();
        }
    };

    function showAlbumBar() {
        document.getElementById('persistent-album-bar').style.display = 'flex';
    }

    window.closeAlbumBar = function() {
        globalPlayer.pause();
        currentAlbumQueue = [];
        isAlbumPlaying = false;
        document.getElementById('persistent-album-bar').style.display = 'none';
    };

    globalPlayer.addEventListener('ended', function() {
        if (isAlbumPlaying) {
            currentAlbumIndex++;
            playQueueSong();
        }
    });

    // MODALI
    window.openAlbumModal = function(albumTitle) {
        const modal = document.getElementById('album-modal');
        const titleEl = document.getElementById('modal-album-title');
        const actionsEl = document.getElementById('modal-album-actions');
        const listEl = document.getElementById('modal-track-list');

        titleEl.innerText = albumTitle;
        actionsEl.innerHTML = `
            <button class="album-btn album-btn-playall" onclick="startFullAlbumPlay('${albumTitle.replace(/'/g, "\\'")}')">
                <i class="fas fa-play"></i> Ascolta Tutto l'Album Sequenzialmente
            </button>
        `;
        listEl.innerHTML = '';

        const songs = albumsMap[albumTitle] || [];
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `
                <div>
                    <div style="font-weight:600; color:#fff;">${song.Titolo || 'Senza Titolo'}</div>
                    <div style="font-size:0.75em; color:#aaa;">${song.Durata || ''}</div>
                </div>
                <button class="play-btn-circle" onclick="playSingleTrack('${song.url}', this)">
                    <i class="fas fa-play"></i>
                </button>
            `;
            listEl.appendChild(item);
        });

        modal.style.display = 'flex';
    };

    window.closeAlbumModal = function() {
        document.getElementById('album-modal').style.display = 'none';
    };

    window.openVideoModal = function() {
        document.getElementById('video-modal').style.display = 'flex';
    };

    window.openShopModal = function() {
        document.getElementById('shop-modal').style.display = 'flex';
    };

    window.closeModal = function(id) {
        document.getElementById(id).style.display = 'none';
    };

    window.playSingleTrack = function(url, btn) {
        isAlbumPlaying = false;
        document.getElementById('persistent-album-bar').style.display = 'none';

        if (globalPlayer.src === url && !globalPlayer.paused) {
            globalPlayer.pause();
            btn.innerHTML = '<i class="fas fa-play"></i>';
            return;
        }

        document.querySelectorAll('.play-btn-circle').forEach(b => b.innerHTML = '<i class="fas fa-play"></i>');
        btn.innerHTML = '<i class="fas fa-pause"></i>';

        globalPlayer.src = url;
        globalPlayer.play().catch(e => console.log("Riproduzione bloccata", e));
    };

    // CHATBOT
    window.chatSessionId = localStorage.getItem('ff_chat_session_id') || ('sess_' + Date.now());
    localStorage.setItem('ff_chat_session_id', window.chatSessionId);

    window.toggleChat = function() {
        const w = document.getElementById('chatbot-window-wrapper');
        const icon = document.getElementById('chat-toggle-icon');
        w.classList.toggle('collapsed');
        icon.innerHTML = w.classList.contains('collapsed') ? '&#43;' : '&minus;';
    };

    window.sendQuickMsg = function(text) {
        document.getElementById('chat-input').value = text;
        sendMsg();
    };

    window.sendMsg = async function() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;

        input.value = '';
        addMsg(text, 'user');

        try {
            const res = await fetch(CHATBOT_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_message: text, sessionId: window.chatSessionId })
            });
            const data = await res.json();
            addMsg(data.response || "Risposta ricevuta!", 'bot');
        } catch(e) {
            addMsg("Connessione temporaneamente non disponibile.", 'bot');
        }
    };

    function addMsg(text, sender) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        div.innerHTML = text;
        const c = document.getElementById('chatbot-messages');
        c.appendChild(div);
        c.scrollTop = c.scrollHeight;
    }

    loadDiscography();
});
