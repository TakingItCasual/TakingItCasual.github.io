"use strict";

const NODE_WIDTH = 18; // Characters that will fit on a BoxCode's line
const NODE_HEIGHT = 15; // Number of string lines in a node. Min: 14
const ACC_MAX = 999; // Maximum value that an ACC can contain
const ACC_MIN = -ACC_MAX; // Minimum value
const CHAR_HEIGHT = 9; // Height of the actual characters. Multiple of 9
const CHAR_WIDTH = CHAR_HEIGHT/9*8; // Characters' width, including pixel after
const CHAR_GAP = 3; // Gap between rows and from sides. Min: 2
const LINE_HEIGHT = CHAR_HEIGHT + CHAR_GAP; // Used for spacing lines apart

const DIM_WHITE = "#C8C8C8"; // Used for the boxes and code
const DESC_WHITE = "#B4B4B4"; // Used for text not in a node
const CURSOR_WHITE = "#E2E2E2"; // Used for that blinking thingy
const WHITE = "#FFFFFF"; // White
const BLACK = "#000000"; // Black
const COMMENT_GRAY = "#7A7A7A"; // Used for comments within code
const INFO_GRAY = "#8D8D8D"; // Used for the ACC, BAK, etc.
const SELECT_GRAY = "#ABABAB"; // Used for highlighting sections of code
const ACTIVE_EXEC = "#FBFBFB"; // Used for the bar over executing code
const WAIT_EXEC = "#9C9C9C"; // Used for the bar over stalled code
const DARK_RED = "#A60D0D"; // Used for corruptNode boxes and text
const LIGHT_RED = "#BF0D0D"; // Used for corruptNode's red bars and syntax error
const MEM_RED = "#480A0A"; // Used for highlighting the top stack memory value

const ALLOWED_CHARS = /^[\x20-\x60\x7B-\x7E]*$/; // ASCII characters (regex)

let canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
