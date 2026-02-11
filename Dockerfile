
#ilk olarak temel imajı seçiyoruz(node.js in hafif bir versiyonu)
FROM node:20-alpine

#çalışma dizinini oluşturuyoruz
WORKDIR /app

#Sadece paket dosyalarını kopoyalıyoruz
COPY package*.json ./

#Bağımlılıkları yüklüyorum
RUN npm install

#Tüm proje dosyalarını kopyalıyorum
COPY . .

#Uygulamanın çalıştığı portu dış dünyaya açıyoruz (benim projemde 3000)
EXPOSE 3000

#Uygulamayı Başlatıyorum

CMD ["node","server.js"]
