# 🎮 Functional Tic-Tac-Toe (Multiplayer)

A real-time, multiplayer Tic-Tac-Toe game built with **Node.js** and **Socket.io**. This project is designed with **Functional Programming** principles (including the use of Option Monads for state management) and is fully containerized with **Docker** to ensure it runs anywhere instantly.

---

## 🐳 Quick Start with Docker

The fastest way to get the game running is through Docker. This method eliminates the need to install Node.js, npm, or any local dependencies.

### 1. Prerequisites
- Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running on your system.

### 2. Clone the Repository
Open your terminal and run:
```bash
git clone <your-repo-link>
cd <project-folder-name>

#For build the Docker image
docker build -t tictactoe-app .

#For run the Container
docker run -d -p 3000:3000 --name tictactoe-game tictactoe-app

#Start playing
Once the container is running, open your browser and go to: 👉 http://localhost:3000

🛠 Management & Troubleshooting
Here are some essential Docker commands for managing your application:

Stop the game:
docker stop tictactoe-game

Restart the game:
docker start tictactoe-game

View live logs: 
docker logs -f tictactoe-game (Great for checking socket events and server status)

Remove the container:
 docker rm -f tictactoe-game

Note: If port 3000 is already occupied by another service on your machine, you can use a different port (e.g., 8080) by running: docker run -d -p 8080:3000 --name tictactoe-game tictactoe-app

#---------------------------------------------------------#

Key Features & Tech Stack
Real-time Interaction: Powered by Socket.io for seamless multiplayer moves.

Clean Architecture: Built using Functional Programming patterns for predictable state management.

Backend: Node.js & Express.js.

Frontend: Vanilla JS (Functional), HTML5, and CSS3.

DevOps: Dockerized for consistent deployment across any environment.