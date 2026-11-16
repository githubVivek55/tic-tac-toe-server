const { io } = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://localhost:3000';

function connectPlayer(name) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL);

    socket.on('connect', () => {
      console.log(`${name} connected: ${socket.id}`);
      resolve(socket);
    });

    socket.on('connect_error', reject);
  });
}

function emitWithAck(socket, event, data) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for acknowledgement for "${event}"`));
    }, 5000);

    const acknowledge = (response) => {
      clearTimeout(timeout);
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    };

    if (data === undefined) {
      socket.emit(event, acknowledge);
    } else {
      socket.emit(event, data, acknowledge);
    }
  });
}

function waitForGameUpdate(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('game-update', handler);
      reject(new Error('Timed out waiting for game update'));
    }, 3000);

    function handler(game) {
      clearTimeout(timeout);
      resolve(game);
    }

    socket.once('game-update', handler);
  });
}

async function runTest() {
  let playerA;
  let playerB;

  try {
    // Connect two players
    playerA = await connectPlayer('Player A');
    playerB = await connectPlayer('Player B');

    // Player A creates a game
    const created = await emitWithAck(playerA, 'create-game');

    console.log(created);
    const roomId = created.roomId;

    assert.strictEqual(created.symbol, 'X');
    assert.strictEqual(created.playerId, playerA.id);

    console.log('\nRoom created:', roomId);
    console.log('Player A symbol:', created.symbol);

    const availableGames = await emitWithAck(playerB, 'list-games');
    assert(
      availableGames.games.some((game) => game.roomId === roomId),
      'Waiting game should be listed for other players',
    );
    assert(
      !(await emitWithAck(playerA, 'list-games')).games.some(
        (game) => game.roomId === roomId,
      ),
      'Player should not see their own game as joinable',
    );

    // Player B joins
    const updateA = waitForGameUpdate(playerA);
    const updateB = waitForGameUpdate(playerB);

    const joined = await emitWithAck(playerB, 'join-game', { roomId });

    assert.strictEqual(joined.symbol, 'O');
    assert.strictEqual(joined.playerId, playerB.id);

    console.log('Player B symbol:', joined.symbol);

    await Promise.all([updateA, updateB]);

    console.log('\nBoth players joined successfully!');

    // Player A makes first move
    const updateA1 = waitForGameUpdate(playerA);
    const updateB1 = waitForGameUpdate(playerB);

    await emitWithAck(playerA, 'make-move', {
      roomId,
      index: 0,
    });

    const [gameA1, gameB1] = await Promise.all([updateA1, updateB1]);

    assert.deepStrictEqual(gameA1.board, gameB1.board);
    assert.strictEqual(gameA1.board[0], 'X');
    assert.strictEqual(gameA1.turn, 'O');

    console.log('\nPlayer A moved successfully!');
    console.log('Board:', gameA1.board);
    console.log('Next turn:', gameA1.turn);

    // Player A tries to move again
    try {
      await emitWithAck(playerA, 'make-move', {
        roomId,
        index: 1,
      });

      throw new Error('Invalid move was accepted!');
    } catch (error) {
      assert.strictEqual(error.message, 'Not your turn');
      console.log('\nTurn validation works!');
    }

    // Player B makes a move
    const updateA2 = waitForGameUpdate(playerA);
    const updateB2 = waitForGameUpdate(playerB);

    await emitWithAck(playerB, 'make-move', {
      roomId,
      index: 1,
    });

    const [gameA2, gameB2] = await Promise.all([updateA2, updateB2]);

    assert.deepStrictEqual(gameA2.board, gameB2.board);
    assert.strictEqual(gameA2.board[1], 'O');
    assert.strictEqual(gameA2.turn, 'X');

    console.log('\nPlayer B moved successfully!');
    console.log('Board:', gameA2.board);

    console.log('\n================================');
    console.log('ALL MULTIPLAYER TESTS PASSED!');
    console.log('================================');
  } catch (error) {
    console.error('\nTEST FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    playerA?.disconnect();
    playerB?.disconnect();
  }
}

runTest();
