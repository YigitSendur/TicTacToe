console.log("JS dosyası başarıyla yüklendi! ✅");

const socket = io();

// --- SABİTLER VE TANIMLAR ---
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]            
];

const player = { X: "PlayerX", O: "PlayerO" };
const record = { X: "X", O: "O", Empty: "" };

// --- DOM ELEMANLARI ---
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room-id');

// 🆕 Global bilgiler - EN ÖNEMLİLER
let currentRoom = null;
let myUsername = null;
let mySymbol = null;  // 🆕 BENİM SEMBOLÜM (X veya O)

// --- FONKSİYONEL YAPI (OPTION) ---
const Option = (val) => ({
    map: (fn) => (val != null ? Option(fn(val)) : Option(null)),
    getOrElse: (fallback) => (val != null ? val : fallback),
    isDefined: () => val != null,
    fold: (onNone, onSome) => (val != null ? onSome(val) : onNone()),
});

const Some = (val) => Option(val);
const None = () => Option(null);

const initialState = {
    board: Array(9).fill(record.Empty),
    currentPlayer: player.X,
    gameActive: true,
    winner: None(), 
};

let state = initialState;

// --- OYUN MANTIĞI ---
const checkWinner = (board) => {
    for (let combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] !== record.Empty && board[a] === board[b] && board[a] === board[c]) {
            return Some({ player: board[a], indices: combo });
        }
    }
    return None();
};

const makeMove = (currentState, index) => {
    if (currentState.board[index] !== record.Empty || !currentState.gameActive) {
        return currentState;
    }

    const updatedBoard = [...currentState.board];
    updatedBoard[index] = currentState.currentPlayer === player.X ? record.X : record.O;

    const winnerOpt = checkWinner(updatedBoard);
    const isDraw = !winnerOpt.isDefined() && !updatedBoard.includes(record.Empty);

    return {
        ...currentState,
        board: updatedBoard,
        gameActive: !winnerOpt.isDefined() && !isDraw,
        winner: winnerOpt,
        currentPlayer: (winnerOpt.isDefined() || isDraw) 
            ? currentState.currentPlayer 
            : (currentState.currentPlayer === player.X ? player.O : player.X)
    };
};

// --- RENDER (EKRANA ÇİZME) ---
const render = () => {
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    
    if (!boardElement || !statusElement) return;
    
    boardElement.innerHTML = ''; 

    const winningIndices = state.winner.map(w => w.indices).getOrElse([]);

    state.board.forEach((cell, index) => {
        const btn = document.createElement('button');
        btn.classList.add('cell');
        
        if (winningIndices.includes(index)) {
            btn.classList.add('winner');
        }

        // 🆕 SIRA KONTROLÜ - Buton aktif mi?
        const isMyTurn = (state.currentPlayer === player.X && mySymbol === 'X') || 
                         (state.currentPlayer === player.O && mySymbol === 'O');
        
        // Eğer benim sıram değilse veya hücre doluysa butonu disable et
        if (!isMyTurn || cell !== record.Empty || !state.gameActive) {
            btn.disabled = true;
            btn.classList.add('disabled');
        }

        btn.innerText = cell;
        btn.onclick = () => handleCellClick(index);
        boardElement.appendChild(btn);
    });

    // 🆕 Status mesajını güncelle - Senin sıran mı göster
    let statusMessage = '';
    let statusIcon = '';
    
    if (state.winner.isDefined()) {
        const winner = state.winner.getOrElse({ player: '' });
        statusMessage = `🎉 Kazanan: ${winner.player}`;
        statusIcon = '🏆';
    } else if (!state.gameActive) {
        statusMessage = 'Berabere!';
        statusIcon = '🤝';
    } else {
        const isMyTurn = (state.currentPlayer === player.X && mySymbol === 'X') || 
                         (state.currentPlayer === player.O && mySymbol === 'O');
        
        if (isMyTurn) {
            statusMessage = `Senin sıran! (${mySymbol})`;
            statusIcon = '▶️';
        } else {
            statusMessage = `Rakibin sırası... (${state.currentPlayer === player.X ? 'X' : 'O'})`;
            statusIcon = '⏳';
        }
    }
    
    statusElement.innerHTML = `
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusMessage}</span>
    `;
};

// --- DOM YÜKLENDİKTEN SONRA BAŞLAT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const room = roomInput.value.trim();

            if (username && room) {
                myUsername = username;
                currentRoom = room;

                console.log(`Joining room: ${room} as ${username}`);

                socket.emit('joinRoom', { username, room });

                loginScreen.classList.remove('active');
                gameScreen.classList.add('active');
                
                console.log('Screen switched to game screen');
            } else {
                alert("Lütfen kullanıcı adı ve oda kodu girin!");
            }
        });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            socket.emit('requestReset');
        });
    }
});

// 🆕 HAMLE YAPMA - Sıra kontrolü ile
const handleCellClick = (index) => {
    // Benim sıram mı kontrol et
    const isMyTurn = (state.currentPlayer === player.X && mySymbol === 'X') || 
                     (state.currentPlayer === player.O && mySymbol === 'O');
    
    if (!isMyTurn) {
        console.log('❌ Senin sıran değil!');
        return;
    }

    if (state.board[index] === record.Empty && state.gameActive) {
        console.log(`✅ Hamle yapıyorum: ${index}`);
        
        // Sunucuya gönder
        socket.emit('playerMove', { 
            index: index, 
            player: state.currentPlayer 
        });
    }
};

// --- SOCKET DİNLEYİCİLERİ ---

// 🆕 Server bana sembolümü söylüyor
socket.on('assignedSymbol', (data) => {
    mySymbol = data.symbol;
    console.log(`🎯 Bana atanan sembol: ${mySymbol}`);
    
    // İlk render
    render();
});

socket.on('playerJoined', (data) => {
    console.log(`${data.username} odaya katıldı! Sembol: ${data.symbol}`);
});

// 🆕 Oyun hazır - 2 oyuncu da geldi
socket.on('gameReady', (data) => {
    console.log('✅ Oyun başlıyor!', data);
    render();
});

// 🆕 Hamle yapıldı - state'i güncelle
socket.on('moveMade', (data) => {
    console.log('📥 Hamle alındı:', data);
    
    // State'i güncelle
    state = makeMove(state, data.index);
    
    // Ekranı yenile
    render();
});

// 🆕 Geçersiz hamle uyarısı
socket.on('invalidMove', (data) => {
    console.log('❌ Geçersiz hamle:', data.message);
    alert(data.message);
});

// Oyun sıfırlandı
socket.on('gameReset', (data) => {
    console.log('🔄 Oyun sıfırlandı');
    state = initialState;
    render();
});

socket.on('connect', () => {
    console.log('✅ Sunucuya bağlandı:', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Sunucudan ayrıldı');
});