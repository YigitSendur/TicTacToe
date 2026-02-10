console.log("JS dosyası başarıyla yüklendi! ✅");

const socket = io(); // Sunucuya bağlantı hattı

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

// Global bilgiler
let currentRoom = null;
let myUsername = null;

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
    
    if (!boardElement || !statusElement) return; // Henüz oyun ekranı açılmadıysa çizme
    
    boardElement.innerHTML = ''; 

    const winningIndices = state.winner.map(w => w.indices).getOrElse([]);

    state.board.forEach((cell, index) => {
        const btn = document.createElement('button');
        btn.classList.add('cell');
        
        if (winningIndices.includes(index)) {
            btn.classList.add('winner');
        }

        btn.innerText = cell;
        btn.onclick = () => handleCellClick(index);
        boardElement.appendChild(btn);
    });

    // Status mesajını güncelle
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
        statusMessage = `Sıra: ${state.currentPlayer}`;
        statusIcon = '▶';
    }
    
    statusElement.innerHTML = `
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusMessage}</span>
    `;
};

// --- DOM YÜKLENDİKTEN SONRA BAŞLAT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Odaya Katıl Butonu
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const room = roomInput.value.trim();

            console.log('Join button clicked!', { username, room });

            if (username && room) {
                myUsername = username;
                currentRoom = room;

                console.log(`Joining room: ${room} as ${username}`);

                // Sunucuya odaya katılma isteği gönder
                socket.emit('joinRoom', { username, room });

                // Ekranları değiştir - active class kullan
                loginScreen.classList.remove('active');
                gameScreen.classList.add('active');
                
                console.log('Screen switched to game screen');
                
                // İlk render
                render();
            } else {
                alert("Lütfen kullanıcı adı ve oda kodu girin!");
            }
        });
    } else {
        console.error('Join button not found!');
    }

    // Reset butonu event listener'ı
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            socket.emit('requestReset');
            state = initialState;
            render();
        });
    }
});

const handleCellClick = (index) => {
    if (state.board[index] === record.Empty && state.gameActive) {
        // Sunucuya gönder
        socket.emit('playerMove', { 
            index: index, 
            player: state.currentPlayer 
        });

        // Kendi ekranımızda yap
        state = makeMove(state, index); 
        render(); 
    }
};

// --- SOCKET DİNLEYİCİLERİ ---

socket.on('playerJoined', (data) => {
    console.log(`${data.username} odaya katıldı!`);
});

socket.on('moveMade', (data) => {
    console.log('Move received:', data);
    if (state.board[data.index] === record.Empty && state.gameActive) {
        state = makeMove(state, data.index);
        render();
    }
});

socket.on('gameReset', () => {
    console.log('Game reset received');
    state = initialState;
    render();
});

// Bağlantı durumu logları
socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});