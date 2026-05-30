"use strict";

const NUM = Object.freeze({
  /** Characters that will fit in a single BoxCode line */
  NODE_WIDTH: 18,
  /** Number of string lines in a node (minimum of 14) */
  NODE_HEIGHT: 15,
  /** Maximum ACC value */
  ACC_MAX: 999,
  /** Minimum ACC value */
  get ACC_MIN(){
    return -this.ACC_MAX;
  },
  /** Height of the ASCII characters (must be multiple of 9) */
  CHAR_HEIGHT: 9,
  /** Characters' width (monospacing used, mostly up to 7, but a few have 8) */
  get CHAR_WIDTH(){
    return Math.floor(this.CHAR_HEIGHT/9 * 8);
  },
  /** Pixel gap between lines and from sides (minimum of 2) */
  CHAR_GAP: 3,
  /** Used for spacing lines apart */
  get LINE_HEIGHT(){
    return this.CHAR_HEIGHT + this.CHAR_GAP;
  },
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
let ctx = canvas.getContext("2d");
