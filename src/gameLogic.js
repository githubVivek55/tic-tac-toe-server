function checkWinner(board) {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of winningCombinations) {
    if (board[a] !== null && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) {
    return 'DRAW';
  }

  return null;
}

function makeMove(game, symbol, index) {
  if (game.status !== 'playing') {
    return { error: 'Game is not active' };
  }

  if (game.turn !== symbol) {
    return { error: 'Not your turn' };
  }

  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return { error: 'Invalid cell index' };
  }

  if (game.board[index] !== null) {
    return { error: 'Cell already occupied' };
  }

  game.board[index] = symbol;

  const winner = checkWinner(game.board);

  if (winner) {
    game.winner = winner;
    game.status = 'finished';
  } else {
    game.turn = symbol === 'X' ? 'O' : 'X';
  }

  return { success: true };
}

module.exports = {
  checkWinner,
  makeMove,
};
