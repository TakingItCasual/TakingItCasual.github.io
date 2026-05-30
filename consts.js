"use strict";

const NUM = Object.freeze({
  // Characters that will fit in a BoxCode's line
  NODE_WIDTH: 18,
  // Number of string lines in a node (minimum: 14)
  NODE_HEIGHT: 15,
  // Maximum value that an ACC can contain
  ACC_MAX: 999,
  // Minimum value
  get ACC_MIN(){
    return -this.ACC_MAX;
  },
  // Height of the ASCII characters (must be multiple of 9)
  CHAR_HEIGHT: 9,
  // Characters' width, including pixel after
  get CHAR_WIDTH(){
    return Math.floor(this.CHAR_HEIGHT/9*8);
  },
  // Gap between rows and from sides (minimum: 2)
  CHAR_GAP: 3,
  // Used for spacing lines apart
  get LINE_HEIGHT(){
    return this.CHAR_HEIGHT + this.CHAR_GAP;
  },
});

const COLOR = Object.freeze({
  DIM_WHITE: "#C8C8C8", // Used for the boxes and code
  DESC_WHITE: "#B4B4B4", // Used for text not in a node
  CURSOR_WHITE: "#E2E2E2", // Used for that blinking thingy
  WHITE: "#FFFFFF", // White
  BLACK: "#000000", // Black
  COMMENT_GRAY: "#7A7A7A", // Used for comments within code
  INFO_GRAY: "#8D8D8D", // Used for the ACC, BAK, etc.
  SELECT_GRAY: "#ABABAB", // Used for highlighting sections of code
  ACTIVE_EXEC: "#FBFBFB", // Used for the bar over executing code
  WAIT_EXEC: "#9C9C9C", // Used for the bar over stalled code
  DARK_RED: "#A60D0D", // Used for corruptNode boxes and text
  LIGHT_RED: "#BF0D0D", // Used for corruptNode's red bars and syntax error
  MEM_RED: "#480A0A", // Used for highlighting the top stack memory value
});

// Regex of printable ASCII characters (lowercase letters excepted)
const ALLOWED_CHARS = Object.freeze(/^[\x20-\x60\x7B-\x7E]*$/);

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
