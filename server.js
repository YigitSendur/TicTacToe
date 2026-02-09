const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // 1. Odaya Katılma ve İsim Alma
    socket.on('joinRoom', (data) => {
        const { username, room } = data;

        // Oyuncuyu odaya sokuyoruz 🏠
        socket.join(room);

        // Bu bilgileri socket nesnesine kaydediyoruz ki diğer fonksiyonlarda kullanalım
        socket.username = username;
        socket.room = room;

        console.log(`${username}, ${room} odasına katıldı.`);

        // Odadaki DİĞER oyuncuya haber veriyoruz
        socket.to(room).emit('playerJoined', { username });
    });

    // 2. Hamleyi Sadece İlgili Odaya Dağıtma
    socket.on('playerMove', (data) => {
        // Mesajı gönderen hariç, sadece o odadakilere iletir 🎯
        socket.to(socket.room).emit('moveMade', data);
    });

    // 3. Sıfırlama İsteğini Odaya İletme
    socket.on('requestReset', () => {
        socket.to(socket.room).emit('gameReset');
    });

    socket.on('disconnect', () => {
        console.log(`${socket.username || 'Bir oyuncu'} ayrıldı.`);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde hazır!`);
});