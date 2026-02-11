console.log("JS dosyası başarıyla yüklendi! ✅");

// ✅ BACKEND BAĞLANTISI
const socket = io("https://tictactoe-s2nh.onrender.com", {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// ========================================
// FRONTEND - SADECE UI VE RENDER
// Oyun mantığı YOK! Backend karar verir.
// ========================================

// Kullanıcı bilgileri
let myUsername = null;
let mySymbol = null;
let currentRoom = null;

// Oyun durumu (Backend'den gelir)
let gameState = {
    board: Array(9).fill(""),
    currentTurn: "X",
    gameActive: true,
    winner: null,
    winningIndices: []
};

// DOM elementleri
const loginScreen = document.getElementById("login-screen");
const gameScreen = document.getElementById("game-screen");
const joinBtn = document.getElementById("join-btn");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room-id");

// ========================================
// RENDER FONKSİYONU
// Backend'den gelen state'i ekrana çizer
// ========================================
function render() {
    const boardElement = document.getElementById("board");
    const statusElement = document.getElementById("status");

    if (!boardElement || !statusElement) return;

    boardElement.innerHTML = "";

    // Her hücreyi oluştur
    gameState.board.forEach((cell, index) => {
        const btn = document.createElement("button");
        btn.classList.add("cell");

        // Kazanan hücre mi?
        if (gameState.winningIndices && gameState.winningIndices.includes(index)) {
            btn.classList.add("winner");
        }

        // Tıklanabilir mi?
        const canClick = 
            mySymbol &&                           // Sembolüm var
            gameState.gameActive &&               // Oyun aktif
            !gameState.winner &&                  // Kazanan yok
            mySymbol === gameState.currentTurn && // Benim sıram
            cell === "";                          // Hücre boş

        if (!canClick) {
            btn.disabled = true;
            btn.classList.add("disabled");
        }

        btn.innerText = cell;
        btn.onclick = () => handleCellClick(index);
        boardElement.appendChild(btn);
    });

    // Durum mesajı
    updateStatus(statusElement);
}

// ========================================
// DURUM MESAJI GÜNCELLEME
// ========================================
function updateStatus(statusElement) {
    let statusMessage = "";
    let statusIcon = "";

    if (!mySymbol) {
        statusMessage = "Odaya bağlanılıyor...";
        statusIcon = "🔄";
    } else if (gameState.winner) {
        const isMeWinner = gameState.winner === mySymbol;
        const name = isMeWinner ? (myUsername || "Sen") : "Rakip";
        statusMessage = `Kazanan: ${name} (${gameState.winner})`;
        statusIcon = "🏆";
    } else if (!gameState.gameActive) {
        statusMessage = "Berabere!";
        statusIcon = "🤝";
    } else {
        const isMyTurn = mySymbol === gameState.currentTurn;
        
        if (isMyTurn) {
            statusMessage = `${myUsername || "Senin"} sıran! (${mySymbol})`;
            statusIcon = "▶️";
        } else {
            const opponentSymbol = mySymbol === "X" ? "O" : "X";
            statusMessage = `Rakibin sırası... (${opponentSymbol})`;
            statusIcon = "⏳";
        }
    }

    statusElement.innerHTML = `
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusMessage}</span>
    `;
}

// ========================================
// HAMLE YAPMA
// Sadece backend'e bildirir, kontrol YAPMAZ!
// ========================================
function handleCellClick(index) {
    if (!mySymbol) {
        console.log("❌ Henüz sembol atanmadı.");
        return;
    }

    if (!gameState.gameActive) {
        console.log("❌ Oyun bitti.");
        return;
    }

    if (mySymbol !== gameState.currentTurn) {
        console.log("❌ Senin sıran değil!");
        return;
    }

    if (gameState.board[index] !== "") {
        console.log("❌ Bu hücre dolu!");
        return;
    }

    console.log(`📤 Hamle gönderiliyor: ${index}`);
    
    // Backend'e gönder, backend karar verir!
    socket.emit("playerMove", { index: index });
}

// ========================================
// DOM EVENT LISTENERS
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing game...");

    // Odaya katıl butonu
    if (joinBtn) {
        joinBtn.addEventListener("click", () => {
            const username = usernameInput.value.trim();
            const room = roomInput.value.trim();

            if (username && room) {
                myUsername = username;
                currentRoom = room;

                console.log(`Joining room: ${room} as ${username}`);

                socket.emit("joinRoom", { username, room });

                loginScreen.classList.remove("active");
                gameScreen.classList.add("active");
            } else {
                alert("Lütfen kullanıcı adı ve oda kodu girin!");
            }
        });
    }

    // Sıfırlama butonu
    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            console.log("🔄 Sıfırlama isteği gönderiliyor...");
            socket.emit("requestReset");
        });
    }
});

// ========================================
// SOCKET EVENT LISTENERS
// Backend'den gelen olayları dinle
// ========================================

// Sembol atandı
socket.on("assignedSymbol", (data) => {
    mySymbol = data.symbol;
    console.log(`🎯 Atanan sembol: ${mySymbol}`);
});

// Oyun durumu güncellendi (EN ÖNEMLİ EVENT!)
socket.on("gameState", (data) => {
    console.log("📥 Oyun durumu alındı:", data);
    
    // Backend'den gelen state'i kaydet
    gameState = {
        board: data.board || Array(9).fill(""),
        currentTurn: data.currentTurn || "X",
        gameActive: data.gameActive !== undefined ? data.gameActive : true,
        winner: data.winner || null,
        winningIndices: data.winningIndices || []
    };

    // Ekranı güncelle
    render();
});

// Oyuncu katıldı
socket.on("playerJoined", (data) => {
    console.log(`✅ ${data.username} odaya katıldı! Sembol: ${data.symbol}`);
});

// Oyun hazır
socket.on("gameReady", (data) => {
    console.log("🎮 Oyun başlıyor!", data);
    if (data.gameState) {
        gameState = data.gameState;
        render();
    }
});

// Geçersiz hamle
socket.on("invalidMove", (data) => {
    console.log("❌ Geçersiz hamle:", data.message);
    alert(data.message);
});

// Oyun bitti
socket.on("gameOver", (data) => {
    console.log("🏁 Oyun bitti:", data);
    
    if (data.winner) {
        const isMeWinner = data.winner === mySymbol;
        const message = isMeWinner 
            ? `🏆 Tebrikler! Kazandın! (${data.winner})`
            : `😢 Kaybettin! Kazanan: ${data.winner}`;
        
        setTimeout(() => alert(message), 500);
    } else {
        setTimeout(() => alert("🤝 Oyun berabere bitti!"), 500);
    }
});

// Oyun sıfırlandı
socket.on("gameReset", (data) => {
    console.log("🔄 Oyun sıfırlandı:", data.message);
});

// Oyuncu ayrıldı
socket.on("playerLeft", (data) => {
    console.log("👋 Oyuncu ayrıldı:", data.message);
    alert(data.message);
});

// Hata
socket.on("error", (data) => {
    console.error("❌ Hata:", data.message);
    alert(`Hata: ${data.message}`);
});

// Bağlantı kuruldu
socket.on("connect", () => {
    console.log("✅ Sunucuya bağlandı:", socket.id);
});

// Bağlantı koptu
socket.on("disconnect", () => {
    console.log("❌ Sunucudan ayrıldı");
});

// Bağlantı hatası
socket.on("connect_error", (error) => {
    console.error("❌ Bağlantı hatası:", error);
    alert("Backend'e bağlanılamıyor! Lütfen sunucunun çalıştığından emin olun.");
});
