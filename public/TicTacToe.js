const socket = io(); // Sunucuya bağlantı hattı

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]            
];

const player = { X: "PlayerX", O: "PlayerO" };
const record = { X: "X", O: "O", Empty: "" };

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

// --- SAF MANTIK FONKSİYONLARI ---

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

    const statusMessage = state.winner
        .map(w => `Kazanan: ${w.player}`)
        .getOrElse(state.gameActive ? `Sıra: ${state.currentPlayer}` : "Berabere!");
    
    statusElement.innerText = statusMessage;
};

// --- OLAY YÖNETİCİLERİ ---

// 1. Senin tıkladığın an (Mesaj gönderir)
const handleCellClick = (index) => {
    // Eğer hamle geçerliyse hem yap hem sunucuya fırlat
    if (state.board[index] === record.Empty && state.gameActive) {
        
        // Sunucuya gönderiyoruz
        socket.emit('playerMove', { 
            index: index, 
            player: state.currentPlayer 
        });

        // Kendi ekranımızda yapıyoruz
        state = makeMove(state, index); 
        render(); 
    }
};

// 2. Sıfırla Butonu
document.getElementById('reset-btn').onclick = () => {
    // Sunucuya "requestReset" mesajı gönderiyoruz
    socket.emit('requestReset');

    // Kendi ekranımızı sıfırlıyoruz
    state = initialState;
    render();
    console.log("Oyun senin tarafında sıfırlandı.");
};

// --- SOCKET DİNLEYİCİLERİ ---

// Rakip hamle yaptığında burası çalışır (Sadece ekranı günceller, tekrar mesaj atmaz)
socket.on('moveMade', (data) => {
    console.log('Rakip hamle yaptı:', data);
    
    if (state.board[data.index] === record.Empty && state.gameActive) {
        state = makeMove(state, data.index);
        render();
    }
});

// YENİ: Sunucudan gelen sıfırlama emrini dinle
socket.on('gameReset', () => {
    console.log('Rakip oyunu sıfırladı, senin ekranın da temizleniyor...');
    state = initialState;
    render();
});

// İlk açılışta çiz
render();