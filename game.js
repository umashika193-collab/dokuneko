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
        // Initialize playable grid structure
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill().map(() => ({
            regionId: -1,
            content: null
        })));

        let isUnique = false;
        let attempts = 0;

        while (!isUnique) {
            attempts++;
            // 1. 各行、各列に1匹ずつ、かつ隣接しないように配置
            let validPlacement = false;
            while (!validPlacement) {
                validPlacement = this._tryPlaceStars();
            }

            // 2. それらの位置を元に領域（Region）を生成
            // 同じ星の配置で何度か領域生成を試す
            let regionAttempts = 0;
            while (regionAttempts < 20 && !isUnique) {
                this._generateRegions();
                if (this._hasUniqueSolution()) {
                    isUnique = true;
                }
                regionAttempts++;
            }
            
            // 安全装置（万が一無限ループしそうな場合は妥協するが、基本的には抜ける）
            if (attempts > 200) {
                console.warn("Could not find a unique solution after 200 attempts. Proceeding with current board.");
                break;
            }
        }

        // Assign region IDs to grid
        for (let i = 0; i < this.regions.length; i++) {
            for (let cell of this.regions[i]) {
                this.grid[cell.y][cell.x].regionId = i;
            }
        }
    }

    _hasUniqueSolution() {
        let solutionsCount = 0;
        const size = this.size;
        const colsUsed = new Set();
        const regionsUsed = new Set();
        
        // 高速化のため、座標からリージョンIDを引けるマップを作成
        const regionMap = Array(size).fill().map(() => Array(size).fill(-1));
        for (let i = 0; i < this.regions.length; i++) {
            for (let cell of this.regions[i]) {
                regionMap[cell.y][cell.x] = i;
            }
        }
        
        // 探索用の状態
        const currentSolution = Array(size).fill().map(() => Array(size).fill(false));

        const isValid = (r, c) => {
            // 周囲8マスの接触チェック
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                        if (currentSolution[nr][nc]) return false;
                    }
                }
            }
            return true;
        };

        const solveRow = (r) => {
            if (r === size) {
                solutionsCount++;
                return solutionsCount > 1; // 2個以上の解が見つかったら即座にtrueを返して探索打ち切り
            }
            
            for (let c = 0; c < size; c++) {
                if (colsUsed.has(c)) continue;
                
                const regionId = regionMap[r][c];
                if (regionsUsed.has(regionId)) continue;
                
                if (isValid(r, c)) {
                    currentSolution[r][c] = true;
                    colsUsed.add(c);
                    regionsUsed.add(regionId);
                    
                    if (solveRow(r + 1)) return true; // 下の行で複数解が見つかって打ち切られた場合は伝播させる
                    
                    // バックトラッキング
                    currentSolution[r][c] = false;
                    colsUsed.delete(c);
                    regionsUsed.delete(regionId);
                }
            }
            return false;
        };

        solveRow(0);
        return solutionsCount === 1; // 解がちょうど1つなら唯一解
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
                
                // オート❌機能：同行、同列、同領域、周囲8マスを'x'で埋める
                let autoFilled = [];
                const regionId = this.grid[r][c].regionId;
                
                for(let nr = 0; nr < this.size; nr++) {
                    for(let nc = 0; nc < this.size; nc++) {
                        if (nr === r && nc === c) continue;
                        if (this.grid[nr][nc].content !== null) continue; // 既に何かある場合は上書きしない
                        
                        let shouldX = false;
                        if (nr === r) shouldX = true; // 同じ行
                        else if (nc === c) shouldX = true; // 同じ列
                        else if (this.grid[nr][nc].regionId === regionId) shouldX = true; // 同じ領域
                        else if (Math.abs(nr - r) <= 1 && Math.abs(nc - c) <= 1) shouldX = true; // 周囲8マス（斜め含む隣接）
                        
                        if (shouldX) {
                            this.grid[nr][nc].content = 'x';
                            autoFilled.push({r: nr, c: nc});
                        }
                    }
                }
                
                return { success: true, correct: true, autoFilled: autoFilled };
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
