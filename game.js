// game.js
// MVCのModel部分：パズルの生成、状態管理、バリデーションを担当します。

class GameState {
    constructor(size = 5) {
        this.size = size;
        this.maxLives = Math.max(5, this.size); // レベル（サイズ）に応じて最大ライフを増加
        this.lives = this.maxLives;
        this.grid = []; // 2D array of objects { regionId, content: null | 'cat' | 'x' }
        this.solution = []; // 2D array boolean (hasCat)
        this.regions = []; // Array of arrays of coordinates
        this.isGameOver = false;
        
        this.generatePuzzle();
    }

    generatePuzzle() {
        // パズルの自動生成アルゴリズム（スターバトル）
        // 1. 各行、各列に1匹ずつ、かつ隣接しないように配置
        // 2. それらの位置を元に領域（Region）を生成
        
        // Initialize empty solution
        this.solution = Array(this.size).fill().map(() => Array(this.size).fill(false));
        
        let validPlacement = false;
        while (!validPlacement) {
            validPlacement = this._tryPlaceStars();
        }

        // Generate regions around the stars
        this._generateRegions();

        // Initialize playable grid
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill().map(() => ({
            regionId: -1,
            content: null
        })));

        // Assign region IDs to grid
        for (let i = 0; i < this.regions.length; i++) {
            for (let cell of this.regions[i]) {
                this.grid[cell.y][cell.x].regionId = i;
            }
        }
    }

    _tryPlaceStars() {
        // バックトラッキングによるStar（猫）の配置
        this.solution = Array(this.size).fill().map(() => Array(this.size).fill(false));
        const colsUsed = new Set();
        
        const placeRow = (r) => {
            if (r === this.size) return true;
            
            const availableCols = [];
            for (let c = 0; c < this.size; c++) {
                if (!colsUsed.has(c) && this._isValidPlacement(r, c)) {
                    availableCols.push(c);
                }
            }
            
            // Randomize array to generate different puzzles
            availableCols.sort(() => Math.random() - 0.5);
            
            for (let c of availableCols) {
                this.solution[r][c] = true;
                colsUsed.add(c);
                
                if (placeRow(r + 1)) return true;
                
                // Backtrack
                this.solution[r][c] = false;
                colsUsed.delete(c);
            }
            return false;
        };
        
        return placeRow(0);
    }

    _isValidPlacement(r, c) {
        // Check surrounding 8 cells for No Touching rule
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                    if (this.solution[nr][nc]) return false;
                }
            }
        }
        return true;
    }

    _generateRegions() {
        // Flood-fill / Voronoi-like region generation
        this.regions = [];
        const stars = [];
        
        // Find all stars
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.solution[r][c]) {
                    stars.push({ y: r, x: c });
                    this.regions.push([{ y: r, x: c }]);
                }
            }
        }

        const unassigned = new Set();
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (!this.solution[r][c]) {
                    unassigned.add(`${r},${c}`);
                }
            }
        }

        // Grow regions randomly
        let madeProgress = true;
        while (unassigned.size > 0 && madeProgress) {
            madeProgress = false;
            
            // Shuffle region order to grow evenly
            const regionIndices = Array.from(Array(this.size).keys());
            regionIndices.sort(() => Math.random() - 0.5);
            
            for (let i of regionIndices) {
                const region = this.regions[i];
                // Find all unassigned neighbors of this region
                const neighbors = [];
                for (let cell of region) {
                    const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
                    for (let [dr, dc] of dirs) {
                        const nr = cell.y + dr;
                        const nc = cell.x + dc;
                        const key = `${nr},${nc}`;
                        if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && unassigned.has(key)) {
                            neighbors.push({ y: nr, x: nc, key });
                        }
                    }
                }
                
                if (neighbors.length > 0) {
                    // Pick a random neighbor
                    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
                    region.push({ y: pick.y, x: pick.x });
                    unassigned.delete(pick.key);
                    madeProgress = true;
                }
            }
        }
        
        // Fix any isolated unassigned cells by attaching them to an adjacent region
        if (unassigned.size > 0) {
            for (let key of unassigned) {
                const [r, c] = key.split(',').map(Number);
                let assignedRegion = 0; // fallback
                const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
                
                // Find neighbor's region
                for (let [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                        if (!unassigned.has(`${nr},${nc}`)) {
                            // Find region index containing (nr, nc)
                            for (let i = 0; i < this.regions.length; i++) {
                                if (this.regions[i].some(cell => cell.y === nr && cell.x === nc)) {
                                    assignedRegion = i;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
                this.regions[assignedRegion].push({y: r, x: c});
                unassigned.delete(key);
            }
        }
    }

    placeContent(r, c, content) {
        if (this.isGameOver) return { success: false, reason: 'gameover' };
        
        // If placing cat
        if (content === 'cat') {
            if (this.solution[r][c] === true) {
                // Correct placement
                this.grid[r][c].content = 'cat';
                return { success: true, correct: true };
            } else {
                // Incorrect placement - Penalty!
                this.lives--;
                if (this.lives <= 0) {
                    this.isGameOver = true;
                }
                // 自動的に「✖」マークをつけて、もう一度間違えないようにサポート
                this.grid[r][c].content = 'x';
                return { success: true, correct: false };
            }
        }
        
        // If placing pencil mark or erasing
        this.grid[r][c].content = content;
        return { success: true, correct: true };
    }
    
    checkWinCondition() {
        let catsPlaced = 0;
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c].content === 'cat') {
                    catsPlaced++;
                }
            }
        }
        return catsPlaced === this.size && this.lives > 0;
    }
}

// 外部から利用可能にする
window.GameState = GameState;
