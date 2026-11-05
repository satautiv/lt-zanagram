import {
  bridgeKey,
  newGame,
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
  private visible: Visibility;

  constructor(
    readonly puzzle: Puzzle,
    private readonly board: BoardView,
    private readonly status: StatusLine,
    private readonly options: ControllerOptions = {},
    initial: GameState = newGame(puzzle),
  ) {
    this.state = initial;
    this.visible = visibility(puzzle, initial);
    this.render();
  }

  get currentPath(): readonly TileIndex[] {
    return this.path;
  }

  get playing(): boolean {
    return this.state.status === 'playing';
  }

  isVisible(tile: TileIndex): boolean {
    return this.visible.tiles.has(tile);
  }

  /** True if the tile can be appended to the current path. */
  canExtendTo(tile: TileIndex): boolean {
    const last = this.path.at(-1);
    return (
      last !== undefined &&
      this.isVisible(tile) &&
      !this.path.includes(tile) &&
      this.visible.bridges.has(bridgeKey(last, tile))
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
    const { state, result } = submit(this.puzzle, this.state, path);
    this.state = state;
    this.visible = visibility(this.puzzle, state);
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
      visibleTiles: this.visible.tiles,
      visibleBridges: this.visible.bridges,
      selected: this.path,
      hinted: [],
    });
  }
}

function randomPraise(): string {
  const options = t('feedback.praise').split('|');
  return options[Math.floor(Math.random() * options.length)]!;
}
