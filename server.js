const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Bir Oyuncu Bağlandı! ID:', socket.id);

    // 1. HAMLEYİ YAKALA VE DAĞIT
    socket.on('playerMove', (data) => {
        console.log('Hamle iletiliyor:', data);
        socket.broadcast.emit('moveMade', data);
    });

    // 2. SIFIRLAMA İSTEĞİNİ YAKALA VE DAĞIT (Eksik olan kısım burasıydı!)
    socket.on('requestReset', () => {
        console.log('Sıfırlama isteği geldi, rakibe iletiliyor...');
        // Mesajı gönderen hariç herkese "gameReset" emrini fırlat
        socket.broadcast.emit('gameReset');
    });

    socket.on('disconnect', () => {
        console.log('Bir Oyuncu ayrıldı.');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Sunucu hazır! Adres: http://localhost:${PORT}`);
    console.log('Durdurmak için terminalde Ctrl + C yapabilirsin.');
});