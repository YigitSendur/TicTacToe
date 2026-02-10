console.log("JS dosyası başarıyla yüklendi! ✅");

const socket = io();

// --- SABİTLER ---
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Oyun durumu
let state = {
    board: Array(9).fill(""),
    currentPlayer: "X",   // "X" veya "O"
    gameActive: true,
    winner: null          // "X" | "O" | null
};

// Global bilgiler
let currentRoom = null;
let myUsername = null;
let mySymbol = null; // "X" veya "O"

// --- DOM ELEMANLARI ---
const loginScreen = document.getElementById("login-screen");
const gameScreen = document.getElementById("game-screen");
const joinBtn = document.getElementById("join-btn");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room-id");

// --- YARDIMCI FONKSİYONLAR ---
const checkWinner = (board) => {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // "X" veya "O"
        }
    }
    return null;
};

// --- RENDER (EKRANA ÇİZME) ---
const render = () => {
    const boardElement = document.getElementById("board");
    const statusElement = document.getElementById("status");

    if (!boardElement || !statusElement) return;

    boardElement.innerHTML = "";

    // Kazanan hücreleri bul (varsa)
    let winningIndices = [];
    if (state.winner) {
        WINNING_COMBINATIONS.forEach((combo) => {
            const [a, b, c] = combo;
            if (
                state.board[a] === state.winner &&
                state.board[b] === state.winner &&
                state.board[c] === state.winner
            ) {
                winningIndices = combo;
            }
        });
    }

    const amIKnown = !!mySymbol;

    state.board.forEach((cell, index) => {
        const btn = document.createElement("button");
        btn.classList.add("cell");

        if (winningIndices.includes(index)) {
            btn.classList.add("winner");
        }

        const isMyTurn =
            amIKnown &&
            state.gameActive &&
            !state.winner &&
            mySymbol === state.currentPlayer;

        // Sıra bende değilse veya hücre doluysa tıklanamasın
        if (!isMyTurn || cell !== "" || !state.gameActive) {
            btn.disabled = true;
            btn.classList.add("disabled");
        }

        btn.innerText = cell;
        btn.onclick = () => handleCellClick(index);
        boardElement.appendChild(btn);
    });

    // --- Durum metni ---
    let statusMessage = "";
    let statusIcon = "";

    if (!amIKnown) {
        statusMessage = "Odaya bağlanılıyor...";
        statusIcon = "🔄";
    } else if (state.winner) {
        const isMeWinner = state.winner === mySymbol;
        const name = isMeWinner && myUsername ? myUsername : "Rakip";
        statusMessage = `Kazanan: ${name} (${state.winner})`;
        statusIcon = "🏆";
    } else if (!state.gameActive) {
        statusMessage = "Berabere!";
        statusIcon = "🤝";
    } else {
        const isMyTurnNow =
            mySymbol === state.currentPlayer && state.gameActive && !state.winner;

        if (isMyTurnNow) {
            const name = myUsername || "Sen";
            statusMessage = `${name}'in sırası! (${mySymbol})`;
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
};

// --- HAMLE YAPMA ---
const handleCellClick = (index) => {
    if (!mySymbol) {
        console.log("Henüz sembol atanmadı.");
        return;
    }

    const isMyTurn =
        state.gameActive &&
        !state.winner &&
        mySymbol === state.currentPlayer;

    if (!isMyTurn) {
        console.log("❌ Senin sıran değil!");
        return;
    }

    if (state.board[index] === "" && state.gameActive) {
        console.log(`✅ Hamle yapıyorum: ${index}`);

        // Sadece sunucuya bildir, state'i sunucudan gelecek event ile güncelleyeceğiz
        socket.emit("playerMove", {
            index: index,
            player: state.currentPlayer
        });
    }
};

// --- DOM YÜKLENDİKTEN SONRA ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, initializing game...");

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

                console.log("Screen switched to game screen");
            } else {
                alert("Lütfen kullanıcı adı ve oda kodu girin!");
            }
        });
    }

    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            socket.emit("requestReset");
        });
    }
});

// --- SOCKET OLAYLARI ---

// Sembol atanıyor
socket.on("assignedSymbol", (data) => {
    mySymbol = data.symbol;
    console.log(`🎯 Bana atanan sembol: ${mySymbol}`);

    // Sunucunun bildirdiği sırayı esas al
    if (data.currentTurn === "X" || data.currentTurn === "O") {
        state.currentPlayer = data.currentTurn;
    } else {
        state.currentPlayer = "X";
    }

    render();
});

socket.on("playerJoined", (data) => {
    console.log(`${data.username} odaya katıldı! Sembol: ${data.symbol}`);
});

// Oyun hazır (2 oyuncu da geldi)
socket.on("gameReady", (data) => {
    console.log("✅ Oyun başlıyor!", data);
    if (data.currentTurn === "X" || data.currentTurn === "O") {
        state.currentPlayer = data.currentTurn;
    } else {
        state.currentPlayer = "X";
    }
    render();
});

// Hamle yapıldı
socket.on("moveMade", (data) => {
    console.log("📥 Hamle alındı:", data);

    const { index, player, currentTurn } = data;

    // Tahtayı güncelle
    const newBoard = [...state.board];
    newBoard[index] = player;

    const winner = checkWinner(newBoard);
    const isDraw = !winner && !newBoard.includes("");

    state.board = newBoard;
    state.winner = winner;
    state.gameActive = !winner && !isDraw;
    state.currentPlayer = currentTurn === "X" || currentTurn === "O"
        ? currentTurn
        : state.currentPlayer;

    render();
});

// Geçersiz hamle
socket.on("invalidMove", (data) => {
    console.log("❌ Geçersiz hamle:", data.message);
    alert(data.message);
});

// Oyun sıfırlandı
socket.on("gameReset", (data) => {
    console.log("🔄 Oyun sıfırlandı");
    state.board = Array(9).fill("");
    state.currentPlayer = data.currentTurn === "X" || data.currentTurn === "O"
        ? data.currentTurn
        : "X";
    state.gameActive = true;
    state.winner = null;
    render();
});

socket.on("connect", () => {
    console.log("✅ Sunucuya bağlandı:", socket.id);
});

socket.on("disconnect", () => {
    console.log("❌ Sunucudan ayrıldı");
});