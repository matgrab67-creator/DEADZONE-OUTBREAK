import './style.css';
import './ui/features.css';
import './ui/forest.css';
import { Game } from './core/Game.js';

const game = new Game();
// Available only in development for the local acceptance harness and debugging.
if (import.meta.env.DEV) window.__DEADZONE__ = game;
game.init();
