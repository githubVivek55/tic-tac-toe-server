const GameManager = require('./gameManager');

const gameManager = new GameManager();

function getPublicGame(game) {
  return {
    roomId: game.roomId,
    board: game.board,
    turn: game.turn,
    status: game.status,
    winner: game.winner,
  };
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    // Create game
    socket.on('create-game', (callback) => {
      try {
        const result = gameManager.createGame(socket.id);
        socket.join(result.roomId);
        callback?.({
          success: true,
          ...result,
        });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // List waiting games that this player can join
    socket.on('list-games', (callback) => {
      try {
        callback?.({
          success: true,
          games: gameManager.listAvailableGames(socket.id),
        });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // Join game
    socket.on('join-game', ({ roomId }, callback) => {
      try {
        const result = gameManager.joinGame(roomId?.toUpperCase(), socket.id);

        socket.join(result.roomId);

        callback?.({
          success: true,
          ...result,
        });

        const game = gameManager.games.get(result.roomId);

        io.to(result.roomId).emit('game-update', game);
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // Make a move
    socket.on('make-move', ({ roomId, index }, callback) => {
      try {
        const game = gameManager.makeMove(
          roomId?.toUpperCase(),
          socket.id,
          index,
        );

        io.to(game.roomId).emit('game-update', game);

        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // Restart game
    socket.on('restart-game', ({ roomId }, callback) => {
      try {
        const game = gameManager.restartGame(roomId?.toUpperCase(), socket.id);

        io.to(game.roomId).emit('game-update', game);

        callback?.({ success: true });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Disconnected:', socket.id);

      const result = gameManager.removePlayer(socket.id);

      if (result) {
        io.to(result.roomId).emit('opponent-disconnected');
      }
    });
  });
}

module.exports = setupSocket;
