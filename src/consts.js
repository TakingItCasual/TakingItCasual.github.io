"use strict";

const NUM = Object.freeze({
  /** Maximum ACC value */
  ACC_MAX: 999,
  /** Minimum ACC value */
  get ACC_MIN(){
    return -this.ACC_MAX;
  },
  /** Max number of characters in BoxCode string line */
  NODE_WIDTH_MAIN: 18,
  /** Max number of characters in node sidebar */
  get NODE_WIDTH_SIDE(){
    return this.ACC_MIN.toString().length + 1;
  },
  /** Max number of string lines in a node (minimum of 14) */
  NODE_HEIGHT: 15,
  /** Multiplier for ASCII character dimensions */
  _CHAR_DIM_MULTI: 1,
  /** Height of ASCII characters */
  get CHAR_HEIGHT(){
    return this._CHAR_DIM_MULTI * 9;
  },
  /** Width of ASCII characters (monospacing used, w:h ratio is 8:9) */
  get CHAR_WIDTH(){
    return this._CHAR_DIM_MULTI * 8;
  },
  /** Text pixel gap between text lines and from node borders (minimum of 2) */
  CHAR_GAP: 3,
  /** Used for spacing lines apart */
  get LINE_HEIGHT(){
    return this.CHAR_HEIGHT + this.CHAR_GAP;
  },
  /** Length of time in milliseconds for cursor to blink */
  CURSOR_PERIOD: 800,
});

/** Enum for directions */
const DIR = Object.freeze({
  LEFT: Symbol("LEFT"),
  UP: Symbol("UP"),
  RIGHT: Symbol("RIGHT"),
  DOWN: Symbol("DOWN"),
});

/** Hex codes for various colors */
const COLOR = Object.freeze({
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  /** Default color for various things (boxes, text, etc.) */
  LIGHT_GRAY: "#C8C8C8",
  /** Used for things that need to be a bit darker than the default */
  MID_GRAY: "#8D8D8D",
  /** Used for CorruptNodes */
  CORRUPT_RED: "#BD0D0D",
  TEXT: Object.freeze({
    /** Used for text a bit darker than the default */
    DARKER: "#8D8D8D",
    /** Used for comments within user code */
    COMMENT: "#7A7A7A",
  }),
  /** Used with drawBar function */
  BAR: Object.freeze({
    /** Used for that blinking thingy */
    CURSOR: "#E2E2E2",
    /** Used under highlighted sections of user code */
    SELECTED: "#ABABAB",
    /** Used under executing user code line */
    RUNNING: "#FBFBFB",
    /** Used under stalled user code line */
    WAITING: "#9C9C9C",
    /** Used under newest stack memory node entry */
    MEM_RED: "#4A0A0A",
  }),
});

/** Regex of printable ASCII characters (lowercase letters excepted) */
const ALLOWED_CHARS = Object.freeze(/^[\x20-\x60\x7B-\x7E]*$/);

/** HTML canvas of game screen */
let canvas = document.getElementById("game");
/** HTML canvas context */
let ctx = canvas.getContext("2d", { alpha: false });
