import {
  bridgeKey,
  giveUp,
  newGame,
  revealedTiles,
  rotate,
  useHint,
  setElapsed,
  spell,
  submit,
  visibility,
  wordsLeft,
  type GameState,
  type Puzzle,
  type SubmissionResult,
  type TileIndex,
  type Visibility,
} from '../core';
import { t } from '../i18n';
import type { BoardView } from './board-view';
import type { StatusLine, Tone } from './status-line';

export interface ControllerOptions {
  /** Raw play time so far; the pausing timer lives outside the controller. */
  elapsedMs?: () => number;
  /** Random praise on finding a required word ("Feedback messages" setting, default on). */
  praise?: boolean;
  onChange?: (state: GameState, result: SubmissionResult | null) => void;
}

/**
 * Connects input, the rules engine and the screen for one puzzle. Input methods only build the
 * current path through `begin`/`moveTo`/`setPath`/`commit`; everything else happens here.
 */
export class GameController {
  state: GameState;
  private path: TileIndex[] = [];
  /** Quarter turns shown so far; keeps growing so every turn animates clockwise. */
  private turns: number;
  private onBoard: Visibility;

  constructor(
    readonly puzzle: Puzzle,
    private readonly board: BoardView,
    private readonly status: StatusLine,
    private readonly options: ControllerOptions = {},
    initial: GameState = newGame(puzzle),
  ) {
    this.state = initial;
    this.turns = initial.rotation;
    board.setRotation(this.turns);
    this.onBoard = visibility(puzzle, initial);
    this.render();
  }

  get currentPath(): readonly TileIndex[] {
    return this.path;
  }

  get playing(): boolean {
    return this.state.status === 'playing';
  }

  /** Tiles and bridges still on the board. */
  get visible(): Visibility {
    return this.onBoard;
  }

  isVisible(tile: TileIndex): boolean {
    return this.onBoard.tiles.has(tile);
  }

  /** True if the tile can be appended to the current path. */
  canExtendTo(tile: TileIndex): boolean {
    const last = this.path.at(-1);
    return (
      last !== undefined &&
      this.isVisible(tile) &&
      !this.path.includes(tile) &&
      this.onBoard.bridges.has(bridgeKey(last, tile))
    );
  }

  begin(tile: TileIndex): void {
    if (!this.playing || !this.isVisible(tile)) return;
    this.setPath([tile]);
  }

  /**
   * Dragging onto a tile: a bridged neighbour extends the path, the previous tile steps back,
   * anything else is ignored.
   */
  moveTo(tile: TileIndex): void {
    if (this.path.length === 0 || tile === this.path.at(-1)) return;
    if (tile === this.path.at(-2)) this.setPath(this.path.slice(0, -1));
    else if (this.canExtendTo(tile)) this.setPath([...this.path, tile]);
  }

  setPath(path: readonly TileIndex[]): void {
    this.path = [...path];
    if (this.path.length > 0) this.status.building(spell(this.puzzle, this.path));
    else this.status.idle();
    this.renderBoard();
  }

  /** Ends the puzzle as given up; the results show the remaining words (spec §2 rule 10). */
  giveUp(): void {
    if (!this.playing) return;
    this.path = [];
    this.state = giveUp(this.timed());
    this.onBoard = visibility(this.puzzle, this.state);
    this.render();
    this.options.onChange?.(this.state, null);
  }

  /** Uses one hint, if any are left (spec §5 Hint). */
  hint(): void {
    if (!this.playing) return;
    const next = useHint(this.puzzle, this.state);
    if (next === this.state) return;
    this.state = next;
    this.render();
    this.options.onChange?.(this.state, null);
  }

  /** Turns the board a quarter turn clockwise; purely visual (spec §5 Rotate). */
  rotate(): void {
    this.state = rotate(this.state);
    this.turns += 1;
    this.board.setRotation(this.turns);
    this.options.onChange?.(this.state, null);
  }

  clear(): void {
    this.setPath([]);
  }

  /** Submits the current path. A single tile is ignored, as in the reference game. */
  commit(): SubmissionResult | null {
    const path = this.path;
    if (path.length < 2) {
      this.clear();
      return null;
    }
    const timed = this.timed();
    const { state, result } = submit(this.puzzle, timed, path);
    this.state = state;
    this.onBoard = visibility(this.puzzle, state);
    this.feedback(result, path);
    this.path = [];
    this.render();
    this.options.onChange?.(state, result);
    return result;
  }

  private feedback(result: SubmissionResult, path: readonly TileIndex[]): void {
    const say = (message: string, tone: Tone) => this.status.flash(message, tone);
    switch (result.kind) {
      case 'tooShort':
        say(t('feedback.tooShort'), 'error');
        break;
      case 'notInList':
        say(t('feedback.notInList'), 'error');
        break;
      case 'alreadyFound':
        say(t('feedback.alreadyFound'), 'warn');
        break;
      case 'extra':
        say(t('feedback.extraFound'), 'ok');
        break;
      case 'required':
        if (result.solved) say(t('status.solved'), 'ok');
        else if (this.options.praise ?? true) say(randomPraise(), 'ok');
        else this.status.idle();
        break;
      default:
        this.status.idle();
    }
    if (
      result.kind === 'tooShort' ||
      result.kind === 'notInList' ||
      result.kind === 'alreadyFound'
    ) {
      this.board.shake(path);
      navigator.vibrate?.(60);
    } else if (result.kind === 'required' || result.kind === 'extra') {
      navigator.vibrate?.(20);
    }
  }

  private timed(): GameState {
    const elapsed = this.options.elapsedMs?.();
    return elapsed === undefined ? this.state : setElapsed(this.state, elapsed);
  }

  private render(): void {
    this.status.setResting(
      this.playing
        ? t('status.wordsLeft', { n: wordsLeft(this.puzzle, this.state) })
        : t('status.solved'),
    );
    this.renderBoard();
  }

  private renderBoard(): void {
    this.board.update({
      visibleTiles: this.onBoard.tiles,
      visibleBridges: this.onBoard.bridges,
      selected: this.path,
      hinted: revealedTiles(this.puzzle, this.state),
    });
  }
}

function randomPraise(): string {
  const options = t('feedback.praise').split('|');
  return options[Math.floor(Math.random() * options.length)]!;
}
