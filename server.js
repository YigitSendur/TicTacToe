const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ CORS ayarları
const io = new Server(server, {
    cors: {
        origin: [
            "https://yigitsendur.github.io",
            "http://localhost:5500",
            "http://127.0.0.1:5500"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(express.static('public'));

// 🎮 OYUN MANTIĞI - BACKEND'DE!
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Yatay
    [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Dikey
    [0, 4, 8], [2, 4, 6]              // Çapraz
];

/**
 * Kazananı kontrol et
 * @param {Array} board - Oyun tahtası
 * @returns {string|null} - "X", "O" veya null
 */
function checkWinner(board) {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

/**
 * Beraberlik kontrolü
 * @param {Array} board - Oyun tahtası
 * @returns {boolean}
 */
function checkDraw(board) {
    return !board.includes('') && !checkWinner(board);
}

/**
 * Kazanan kombinasyonu bul
 * @param {Array} board - Oyun tahtası
 * @param {string} winner - Kazanan sembol
 * @returns {Array} - Kazanan indeksler
 */
function getWinningIndices(board, winner) {
    for (const combo of WINNING_COMBINATIONS) {
        const [a, b, c] = combo;
        if (board[a] === winner && board[b] === winner && board[c] === winner) {
            return combo;
        }
    }
    return [];
}

// 🎮 OYUN ODALARI
const rooms = {};

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // 1️⃣ ODAYA KATILMA
    socket.on('joinRoom', (data) => {
        const { username, room } = data;

        socket.join(room);
        socket.username = username;
        socket.room = room;

        // Oda yoksa oluştur
        if (!rooms[room]) {
            rooms[room] = {
                players: [],
                currentTurn: 'X',
                board: Array(9).fill(''),
                gameActive: true,
                winner: null,
                winningIndices: []
            };
        }

        const roomData = rooms[room];

        // Oyuncuyu ekle ve sembol ata
        const playerSymbol = roomData.players.length === 0 ? 'X' : 'O';
        
        roomData.players.push({
            id: socket.id,
            username: username,
            symbol: playerSymbol
        });

        socket.playerSymbol = playerSymbol;

        console.log(`${username} (${playerSymbol}), ${room} odasına katıldı`);

        // Oyuncuya sembolünü bildir
        socket.emit('assignedSymbol', { 
            symbol: playerSymbol
        });

        // Oyun durumunu gönder
        const gameState = {
            board: roomData.board,
            currentTurn: roomData.currentTurn,
            gameActive: roomData.gameActive,
            winner: roomData.winner,
            winningIndices: roomData.winningIndices,
            players: roomData.players.map(p => ({
                username: p.username,
                symbol: p.symbol
            }))
        };

        socket.emit('gameState', gameState);

        // Diğer oyuncuya bildir
        socket.to(room).emit('playerJoined', { 
            username,
            symbol: playerSymbol,
            players: gameState.players
        });

        // İki oyuncu da varsa oyun başlasın
        if (roomData.players.length === 2) {
            io.to(room).emit('gameReady', {
                message: 'Oyun başlıyor!',
                gameState: gameState
            });
        }
    });

    // 2️⃣ HAMLE YAPMA - TÜM KONTROLLER BACKEND'DE
    socket.on('playerMove', (data) => {
        const room = socket.room;
        const roomData = rooms[room];

        if (!roomData) {
            console.log('❌ Oda bulunamadı!');
            socket.emit('error', { message: 'Oda bulunamadı!' });
            return;
        }

        const { index } = data;

        // ✅ KONTROL 1: Oyun aktif mi?
        if (!roomData.gameActive) {
            console.log('❌ Oyun bitti!');
            socket.emit('invalidMove', { message: 'Oyun bitti!' });
            return;
        }

        // ✅ KONTROL 2: Sıra bu oyuncuda mı?
        if (socket.playerSymbol !== roomData.currentTurn) {
            console.log(`❌ ${socket.username} sırası olmadan hamle yapmaya çalıştı!`);
            socket.emit('invalidMove', { message: 'Senin sıran değil!' });
            return;
        }

        // ✅ KONTROL 3: İndeks geçerli mi?
        if (index < 0 || index > 8) {
            console.log('❌ Geçersiz indeks!');
            socket.emit('invalidMove', { message: 'Geçersiz hamle!' });
            return;
        }

        // ✅ KONTROL 4: Hücre boş mu?
        if (roomData.board[index] !== '') {
            console.log('❌ Bu hücre dolu!');
            socket.emit('invalidMove', { message: 'Bu hücre dolu!' });
            return;
        }

        // ✅ HAMLE GEÇERLİ - Uygula
        roomData.board[index] = socket.playerSymbol;
        
        console.log(`✅ ${socket.username} (${socket.playerSymbol}) hamle yaptı: ${index}`);

        // 🏆 Kazananı kontrol et
        const winner = checkWinner(roomData.board);
        const isDraw = checkDraw(roomData.board);

        if (winner) {
            roomData.winner = winner;
            roomData.gameActive = false;
            roomData.winningIndices = getWinningIndices(roomData.board, winner);
            
            console.log(`🏆 ${winner} kazandı!`);
        } else if (isDraw) {
            roomData.gameActive = false;
            console.log('🤝 Berabere!');
        } else {
            // Sırayı değiştir
            roomData.currentTurn = roomData.currentTurn === 'X' ? 'O' : 'X';
        }

        // 📡 Güncel oyun durumunu herkese gönder
        const gameState = {
            board: roomData.board,
            currentTurn: roomData.currentTurn,
            gameActive: roomData.gameActive,
            winner: roomData.winner,
            winningIndices: roomData.winningIndices,
            lastMove: {
                index: index,
                player: socket.playerSymbol
            }
        };

        io.to(room).emit('gameState', gameState);

        // Özel mesajlar
        if (winner) {
            io.to(room).emit('gameOver', {
                winner: winner,
                winningIndices: roomData.winningIndices,
                message: `${winner} kazandı!`
            });
        } else if (isDraw) {
            io.to(room).emit('gameOver', {
                winner: null,
                message: 'Berabere!'
            });
        }
    });

    // 3️⃣ SIFIRLAMA
    socket.on('requestReset', () => {
        const room = socket.room;
        
        if (!rooms[room]) {
            return;
        }

        const roomData = rooms[room];

        // Oyunu sıfırla
        roomData.board = Array(9).fill('');
        roomData.currentTurn = 'X';
        roomData.gameActive = true;
        roomData.winner = null;
        roomData.winningIndices = [];

        console.log(`🔄 ${room} odası sıfırlandı`);

        // Yeni oyun durumunu gönder
        const gameState = {
            board: roomData.board,
            currentTurn: roomData.currentTurn,
            gameActive: roomData.gameActive,
            winner: roomData.winner,
            winningIndices: roomData.winningIndices
        };

        io.to(room).emit('gameState', gameState);
        io.to(room).emit('gameReset', { message: 'Yeni oyun başlıyor!' });
    });

    // 4️⃣ AYRILMA
    socket.on('disconnect', () => {
        console.log(`${socket.username || 'Bir oyuncu'} ayrıldı.`);
        
        const room = socket.room;
        if (rooms[room]) {
            // Oyuncuyu listeden çıkar
            rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
            
            // Kalan oyuncuya bildir
            socket.to(room).emit('playerLeft', {
                message: `${socket.username} oyundan ayrıldı.`
            });

            // Oda boşsa sil
            if (rooms[room].players.length === 0) {
                delete rooms[room];
                console.log(`🗑️ ${room} odası silindi.`);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde hazır!`);
    console.log(`✅ CORS aktif: GitHub Pages bağlanabilir`);
    console.log(`🎮 Oyun mantığı tamamen backend'de çalışıyor`);
});
