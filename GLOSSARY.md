# Žodžių tiltai

A daily Lithuanian word puzzle: letters on a grid, joined by bridges, hide words the player finds by tracing paths. This glossary covers the game, its puzzles, and how they are authored.

## Puzzle and board

**Puzzle**:
One day's complete content: its board, required words, extra words, definitions, difficulty and date.
_Avoid_: Level, game, board (when the whole thing is meant)

**Board**:
The grid of tiles and the bridges between them, without the words.
_Avoid_: Puzzle (when only the grid is meant), grid

**Tile**:
One letter cell on the board. Each tile holds exactly one letter of the Lithuanian alphabet.
_Avoid_: Cell, node, letter (when the position is meant)

**Bridge**:
A connection between two neighbouring tiles (horizontal, vertical or diagonal) that a path may cross.
_Avoid_: Edge, link, connection

**Path**:
A sequence of tiles, each consecutive pair joined by a bridge, with no tile used twice.
_Avoid_: Trace, route, chain

**Canonical path**:
The one path stored for a required word; it decides which tiles and bridges the word holds on the board.
_Avoid_: Solution path, official path

**Visible**:
A tile or bridge that at least one unfound required word still needs. Everything else has fallen away.
_Avoid_: Active, remaining, alive

## Words

**Required word**:
A word the player must find to solve the puzzle.
_Avoid_: Target word, main word, answer

**Extra word**:
A valid word traceable on the board that is not required; optional, and it takes time off the final time.
_Avoid_: Bonus word, hidden word

**Submission**:
A path the player commits, before it has been judged as a required word, an extra word, already found or invalid.
_Avoid_: Guess, attempt, answer

**Definition**:
A short original Lithuanian explanation of a required word, shown after the puzzle ends, or during play through a definition hint.
_Avoid_: Clue, meaning, description

## Play

**Hint**:
One reveal of the next tile of the hint target; a player gets half as many per puzzle as there are required words, rounded up.
_Avoid_: Clue, tip

**Hint target**:
The unfound required word that hints are currently revealing, kept until it is found; a word whose definition hint is on show is picked first.
_Avoid_: Hint word

**Definition hint**:
One look at the definition (and letter count) of an unfound required word, without the word; a player gets as many per puzzle as hints.
_Avoid_: Clue, definition help

**Solved**:
The state of a puzzle once every required word has been found.
_Avoid_: Completed, won, finished

**Given up**:
The state of a puzzle the player abandoned, with its remaining required words revealed.
_Avoid_: Failed, lost, quit

## Calendar

**Daily puzzle**:
The puzzle whose date equals the player's local date today.
_Avoid_: Today's game

**Archive puzzle**:
A puzzle from an earlier date, played from the archive calendar.
_Avoid_: Past game, old puzzle

**Streak**:
The run of consecutive puzzle days on which the player solved the daily puzzle; a day with no published puzzle neither extends nor breaks it.
_Avoid_: Chain, combo
