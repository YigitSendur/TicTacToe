const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// 🎮 OYUN ODALARI - Her oda için oyun durumunu saklıyoruz
const rooms = {};

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // 1️⃣ ODAYA KATILMA
    socket.on('joinRoom', (data) => {
        const { username, room } = data;

        // Oyuncuyu odaya sokuyoruz 🏠
        socket.join(room);

        // Bu bilgileri socket nesnesine kaydediyoruz
        socket.username = username;
        socket.room = room;

        // 🆕 Oda yoksa oluştur
        if (!rooms[room]) {
            rooms[room] = {
                players: [],
                currentTurn: 'X',  // İlk sıra X'te
                board: Array(9).fill(''),
                gameActive: true
            };
        }

        // 🆕 Oyuncuyu odaya ekle ve sembol ata
        const playerSymbol = rooms[room].players.length === 0 ? 'X' : 'O';
        
        rooms[room].players.push({
            id: socket.id,
            username: username,
            symbol: playerSymbol
        });

        socket.playerSymbol = playerSymbol;  // Oyuncunun sembolünü sakla

        console.log(`${username}, ${room} odasına katıldı. Sembol: ${playerSymbol}`);

        // Oda içindeki oyuncu listesini hazırla
        const playersInfo = rooms[room].players.map(p => ({
            username: p.username,
            symbol: p.symbol
        }));

        // 🆕 Oyuncuya kendi sembolünü ve oyuncu listesini söyle
        socket.emit('assignedSymbol', { 
            symbol: playerSymbol,
            currentTurn: rooms[room].currentTurn,
            players: playersInfo
        });

        // Odadaki DİĞER oyuncuya haber ver
        socket.to(room).emit('playerJoined', { 
            username,
            symbol: playerSymbol 
        });

        // 🆕 Tüm odaya güncel oyuncu listesini gönder
        io.to(room).emit('playersUpdate', {
            players: playersInfo
        });

        // 🆕 Eğer 2 oyuncu da geldiyse oyun başlasın
        if (rooms[room].players.length === 2) {
            io.to(room).emit('gameReady', {
                message: 'Oyun başlıyor!',
                currentTurn: rooms[room].currentTurn
            });
        }
    });

    // 2️⃣ HAMLE YAPMA - SIRA KONTROLÜ İLE
    socket.on('playerMove', (data) => {
        const room = socket.room;
        const roomData = rooms[room];

        if (!roomData) {
            console.log('❌ Oda bulunamadı!');
            return;
        }

        // 🔒 SIRA KONTROLÜ - En önemli kısım!
        if (socket.playerSymbol !== roomData.currentTurn) {
            console.log(`❌ ${socket.username} sırası olmadan hamle yapmaya çalıştı!`);
            socket.emit('invalidMove', { 
                message: 'Senin sıran değil!' 
            });
            return;
        }

        // 🔒 Hücre boş mu kontrol et
        if (roomData.board[data.index] !== '') {
            console.log('❌ Bu hücre dolu!');
            socket.emit('invalidMove', { 
                message: 'Bu hücre dolu!' 
            });
            return;
        }

        // ✅ Hamle geçerli - kaydet ve ilet
        roomData.board[data.index] = socket.playerSymbol;
        
        console.log(`✅ ${socket.username} (${socket.playerSymbol}) hamle yaptı: ${data.index}`);

        // Sırayı değiştir
        roomData.currentTurn = roomData.currentTurn === 'X' ? 'O' : 'X';

        // Herkese hamleyi bildir
        io.to(room).emit('moveMade', {
            index: data.index,
            player: socket.playerSymbol,
            currentTurn: roomData.currentTurn
        });
    });

    // 3️⃣ SIFIRLAMA
    socket.on('requestReset', () => {
        const room = socket.room;
        
        if (rooms[room]) {
            rooms[room].board = Array(9).fill('');
            rooms[room].currentTurn = 'X';
            rooms[room].gameActive = true;
            
            io.to(room).emit('gameReset', {
                currentTurn: 'X'
            });
        }
    });

    // 4️⃣ AYRILMA
    socket.on('disconnect', () => {
        console.log(`${socket.username || 'Bir oyuncu'} ayrıldı.`);
        
        const room = socket.room;
        if (rooms[room]) {
            // Oyuncuyu listeden çıkar
            rooms[room].players = rooms[room].players.filter(p => p.id !== socket.id);
            
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
});