# DwarfMaze

**"The Dwarf's Escape"** - A browser-based maze game featuring human controls and AI bot solvers (DFS, BFS, Random, Wall-Following) with real-time heat-map trace visualization and comprehensive game history analytics. Built as a single self-contained HTML file.

## Features

🎮 **Dual Play Modes**: Human keyboard/touch controls or automated bot solving  
🤖 **5 Bot Algorithms**: Blind DFS, Blind BFS, Random Walk, Left/Right Wall Followers  
🗺️ **Procedural Maze Generation**: Recursive backtracking with optional dead-end removal  
🔥 **Heat Map Visualization**: Real-time path frequency tracking with gradient coloring  
📊 **Game Analytics**: Complete history with steps, returns, timestamps, and path summaries  
📝 **Decision Logging**: Timestamped bot reasoning with probabilities and highlights  
🎯 **Dynamic Exit Placement**: Drag-and-drop exit repositioning with automatic path reconnection  
📱 **Responsive Design**: Mobile-friendly with touch controls and adaptive layouts  
⚡ **Adjustable Speed**: 4 speed settings for bot execution (50ms to 600ms)  
🔄 **Auto-Restart**: Optional automatic new maze generation after completion

## Quick Start

1) Clone and enter the repo
```bash
git clone https://github.com/haoiyang/DwarfMaze.git
cd DwarfMaze
```

2) (Optional) Serve locally to avoid browser file-permission quirks
```bash
python -m http.server 8000
# then open http://localhost:8000/DwarfMazeGame.html
```
Or simply double-click [DwarfMazeGame.html](DwarfMazeGame.html) to open directly in your browser.

## How to Play
- **Human mode**: Use arrow keys or on-screen arrow buttons to move the dwarf.
- **Goal**: Reach the green EXIT tile.
- **Drag the exit**: Click/touch the EXIT tile to drag it; release to reposition (auto-connects to maze).
- **Restart / New map**: Use the controls to restart same maze or generate a new one.

## Bot Algorithms

### Blind Deep First Search (DFS)
- Explores unvisited paths depth-first with memory tracking
- Backtracks when reaching dead ends
- Logs decision probabilities at crossroads
- **Best for**: Systematic exploration, learning maze structure

### Blind Wide First Search (BFS)
- Breadth-first search to nearest unvisited cells
- Finds shortest path to unexplored areas
- Queue-based level-by-level expansion
- **Best for**: Optimal exploration strategy, minimal redundant steps

### Random Mouse
- Memoryless random walk
- Picks any valid direction including backtracking
- Shows probability distribution for all moves
- **Best for**: Demonstrating inefficiency, stochastic behavior

### Wall Follower (Left/Right)
- Follows chosen wall (left-hand or right-hand rule)
- Guaranteed to solve simply-connected mazes
- Directional awareness with turn logic
- **Best for**: Classic maze-solving demonstration, consistent behavior

### Speed Settings
- **Fast** (50ms): Quick solving for simple mazes
- **Normal** (150ms): Default viewing speed
- **Slow** (300ms): Educational observation
- **Very Slow** (600ms): Detailed decision analysis

## Game Interface

### Live View Canvas
- Real-time maze display with walls, player, and exit
- Player sprite with directional indicators (up/down/left/right)
- Draggable EXIT tile (click/touch to relocate)
- Pause overlay when game is paused
- 19×19 grid (dynamically sized to screen)

### Frequency Heat Map Canvas
- Visualizes path traversal frequency with red gradient
  - **Light red**: Low traversal (1-2 times)
  - **Dark red**: High traversal (up to 108+ times)
- Green marker: Start position (0,1)
- White marker with border: Current/end position
- Historical game replay when viewing past runs

### Control Panel
- **Arrow buttons**: Touch-friendly directional controls
- **Speed selector**: Bot execution speed (4 settings)
- **Mode selector**: Switch between Human/Bot control
- **Algorithm selector**: Choose bot strategy
- **Map type**: Toggle dead-end generation
- **Pause/Resume**: Freeze/unfreeze game state
- **New Map**: Generate fresh maze
- **Auto Restart**: Automatic continuation after win
- **New Map Gen Auto**: Use new maze on auto-restart

### Bot Decision Logic Panel
- Real-time timestamped decision log
- Color-coded entries:
  - **Yellow**: Highlights (bot start, important decisions)
  - **Green**: Actions (moves taken)
  - **Red**: Warnings (dead ends, backtracking)
  - **Gray**: Timestamps
- Auto-scrolling with 50-entry limit
- Shows probability percentages at crossroads

### Route History Panel
- List of completed games (most recent first)
- Displays: Game ID, mode, step count
- Click to view detailed analysis
- **Save button**: Export all logs to `dwarf_maze_logs.txt`
- **Clear button**: Delete history (with confirmation)

### Selected Game Details Panel
- Comprehensive game statistics:
  - Game ID, timestamp, mode
  - Maze size, total steps, return count
- Path summary with directional sequences
  - Example: "Right (5) → Down (3) → Left (2)"
- Full coordinate trace available in saved logs

## History & Analytics
- Each completed run is stored with steps, returns, mode, timestamp, maze size, and full path.
- History panel lets you select and replay traces; summaries come from grouped path segments.
- Logs can be saved as `dwarf_maze_logs.txt` via the Save Log button.

## Technical Architecture

### Maze Generation Algorithm
1. **Initialization**: Create grid filled with walls
2. **Recursive Backtracking**: `carve(r, c)` function
   - Mark current cell as path
   - Shuffle directions randomly
   - Recursively carve to unvisited neighbors
3. **Post-Processing** (if "Dead Ends Not Allowed"):
   - Detect dead ends (3 walls around path cell)
   - Randomly break one wall to create loops
4. **Guarantee Connectivity**:
   - Force open entrance at (0,1) → (1,1)
   - Ensure exit is connected to maze network
   - Enforce wall thickness (prevent single-pixel walls)

### State Management
**Global Variables**:
- `maze[][]`: 2D array (0=path, 1=wall)
- `player`: {x, y, facing} current position and direction
- `exit`: {x, y} goal location
- `pathStack[]`: Current path from start (backtracking reference)
- `fullTrace[]`: Complete movement history (includes returns)
- `gameHistory[]`: Array of completed game records
- `botVisited`: Set of "x,y" visited cells for bot memory
- `isFrozen`: Win state lock
- `isPaused`: Manual pause state
- `gameMode`: "human" or "bot"

**Game Record Structure**:
```javascript
{
  id: number,           // Sequential game ID
  mode: string,         // "human" or "bot"
  steps: number,        // Total moves (fullTrace.length)
  returns: number,      // Backtracking count
  path: [{x,y},...],   // Complete position trace
  timestamp: string,    // Completion time
  size: string          // "19x19"
}
```

### Core Functions

**Initialization**: `initDimensions()`, `generateMaze()`, `resetLevelState()`  
**Movement**: `move(dx, dy)` - validation, path tracking, win detection  
**Bot Control**: `startBot()`, `stopBot()`, `runBotStep()` - interval management  
**Algorithms**: `runBotDFS()`, `runBotBFS()`, `runBotRandom()`, `runBotWallFollower(side)`  
**Rendering**: `draw()` → `drawGame()` + `drawTrace()`  
**Input Handling**: `handleInputStart/Move/End()` for exit dragging  
**Analytics**: `winGame()`, `viewHistory()`, `analyzePathSegments()`  
**Logging**: `logBotDecision(msg, type)` with timestamps and styling

### Event Flow

**Startup Sequence**:
```
Page Load → initDimensions() → generateMaze() → resetLevelState() → draw()
```

**Human Movement**:
```
Input (keyboard/button) → move(dx,dy) → validate → update state → 
check win → draw()
```

**Bot Execution Loop**:
```
startBot() → setInterval → runBotStep() → algorithm logic → 
logBotDecision() → move() → draw() → check win
```

**Exit Drag & Drop**:
```
mousedown/touchstart → handleInputStart() → set dragging mode →
mousemove/touchmove → handleInputMove() → update drag position →
mouseup/touchend → handleInputEnd() → validate → reconnect maze → resetLevelState()
```

**Win Sequence**:
```
move() detects exit → winGame() → freeze state → create record →
update history → auto-restart? → generateMaze() OR resetLevelState()
```

## Data Export & Analytics

### Save Logs Feature
Click **Save** in Route History panel to download `dwarf_maze_logs.txt` containing:
- Header with game count
- For each completed game:
  - Game ID, timestamp, mode, maze size
  - Total steps and return count
  - **Decision Track**: Grouped directional moves (e.g., "Right (5) → Down (3)")
  - **Raw Coordinates**: Full (x,y) path trace

### Log Format Example
```
DWARF MAZE GAME LOGS
====================

Game ID: 1
Time: 14:23:45
Mode: bot
Maze Size: 19x19
Total Steps: 47
Returns: 8

--- DECISION TRACK (Direction & Duration) ---
Right (5) → Down (3) → Left (2) → Up (1) → Right (4) ...

--- RAW COORDINATES ---
(0,1) -> (1,1) -> (2,1) -> (3,1) -> (4,1) -> (5,1) ...

========================================
```

## Performance Notes

- **Maze Generation**: O(n) where n = cells (19×19 = 361)
- **DFS Bot**: O(n) worst case for complete exploration
- **BFS Bot**: O(n) per step for breadth-first search
- **Rendering**: Optimized by aggregating path segments before drawing
- **Log Limit**: 50 entries to prevent memory buildup
- **Canvas Auto-Sizing**: Adapts to screen (max 800px for desktop, 500px for mobile)

## Browser Compatibility

✅ **Modern Browsers**: Chrome, Firefox, Safari, Edge  
✅ **Mobile**: iOS Safari, Chrome Mobile, Firefox Mobile  
✅ **Touch Support**: Full touch event handling for mobile  
✅ **No Dependencies**: Pure vanilla JavaScript, no frameworks required

## Files

- [DwarfMazeGame.html](DwarfMazeGame.html): Single-page app (1614 lines: HTML + CSS + JavaScript)
- [FUNCTION_ANALYSIS.md](FUNCTION_ANALYSIS.md): Complete technical documentation with:
  - 30 function descriptions with purpose, parameters, and call chains
  - 8 workflow diagrams (initialization, movement, bot algorithms, etc.)
  - Data structure specifications
  - Event listener mapping
  - Performance analysis
- [requirements.txt](requirements.txt): Python dependencies (empty - only needed for `http.server`)
- [.gitignore](.gitignore): Excludes virtual environments, caches, IDE files

## Development

### Project Structure
```
DwarfMaze/
├── DwarfMazeGame.html       # Main application (self-contained)
├── FUNCTION_ANALYSIS.md     # Technical documentation
├── README.md                # This file
├── requirements.txt         # Python deps (empty)
├── .gitignore              # Git exclusions
├── .python-version         # Python version marker
└── .venv/                  # Virtual environment (gitignored)
```

### Tech Stack
- **HTML5 Canvas**: Rendering engine for maze and trace visualization
- **Vanilla JavaScript**: No frameworks or libraries
- **CSS3**: Responsive flexbox layouts with mobile-first design
- **LocalStorage**: Not used (in-memory state only)

### Key Design Patterns
- **State Machine**: Game modes (human/bot, paused/running, frozen/active)
- **Observer Pattern**: Event listeners for input, mode changes, history selection
- **Strategy Pattern**: Pluggable bot algorithms via function dispatch
- **Memento Pattern**: Game history with full state snapshots for replay

## Contributing

Contributions welcome! Areas for enhancement:
- Additional maze generation algorithms (Kruskal's, Prim's, etc.)
- More bot strategies (A*, Dijkstra, etc.)
- Maze difficulty settings (size, complexity)
- Sound effects and animations
- Multiplayer racing mode
- Maze editor/designer mode

## License

TBD
