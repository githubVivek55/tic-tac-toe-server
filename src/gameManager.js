const crypto = require('crypto');
const { makeMove } = require('./gameLogic');

class GameManager {
  constructor() {
    this.games = new Map();
  }

  createGame(socketId) {
    let roomId;

    do {
      roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (this.games.has(roomId));

    const game = {
      roomId,
      board: Array(9).fill(null),
      players: {
        X: socketId,
        O: null,
      },
      turn: 'X',
      status: 'waiting',
      winner: null,
    };

    this.games.set(roomId, game);

    return {
      roomId,
      symbol: 'X',
      playerId: socketId,
    };
  }

  listAvailableGames(socketId) {
    return [...this.games.values()]
      .filter(
        (game) =>
          game.status === 'waiting' && game.players.X !== socketId,
      )
      .map((game) => ({
        roomId: game.roomId,
        status: game.status,
      }));
  }

  joinGame(roomId, socketId) {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'waiting' || game.players.O) {
      throw new Error('Game is full or already started');
    }

    if (game.players.X === socketId) {
      throw new Error('You cannot join your own game');
    }

    game.players.O = socketId;
    game.status = 'playing';

    return {
      roomId,
      symbol: 'O',
      playerId: socketId,
    };
  }

  makeMove(roomId, socketId, index) {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error('Game not found');
    }

    const symbol = Object.keys(game.players).find(
      (key) => game.players[key] === socketId,
    );

    if (!symbol) {
      throw new Error('You are not part of this game');
    }

    const result = makeMove(game, symbol, index);

    if (result.error) {
      throw new Error(result.error);
    }

    return game;
  }

  restartGame(roomId, socketId) {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (!Object.values(game.players).includes(socketId)) {
      throw new Error('You are not part of this game');
    }

    if (game.status !== 'finished') {
      throw new Error('Game is not finished');
    }

    game.board = Array(9).fill(null);
    game.turn = 'X';
    game.winner = null;
    game.status = 'playing';

    return game;
  }

  removePlayer(socketId) {
    for (const [roomId, game] of this.games) {
      if (Object.values(game.players).includes(socketId)) {
        this.games.delete(roomId);

        return {
          roomId,
          players: Object.values(game.players).filter(
            (id) => id && id !== socketId,
          ),
        };
      }
    }

    return null;
  }
}

module.exports = GameManager;
