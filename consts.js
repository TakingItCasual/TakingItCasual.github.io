"use strict";

// Characters that will fit on a BoxCode's line
const NODE_WIDTH = Object.freeze(18);
// Number of string lines in a node. Min: 14
const NODE_HEIGHT = Object.freeze(15);
// Maximum value that an ACC can contain
const ACC_MAX = Object.freeze(999);
// Minimum value
const ACC_MIN = Object.freeze(-ACC_MAX);
// Height of the actual characters. Multiple of 9
const CHAR_HEIGHT = Object.freeze(9);
// Characters' width, including pixel after
const CHAR_WIDTH = Object.freeze(CHAR_HEIGHT/9*8);
// Gap between rows and from sides. Min: 2
const CHAR_GAP = Object.freeze(3);
// Used for spacing lines apart
const LINE_HEIGHT = Object.freeze(CHAR_HEIGHT + CHAR_GAP);

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
