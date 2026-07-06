// ui.js
// MVCのView/Controller部分：DOMの操作とイベントハンドリングを担当します。

document.addEventListener('DOMContentLoaded', () => {
    
    // Config
    let currentLevel = 1;

    function calculateSize(level) {
        return Math.min(10, 4 + Math.ceil(level / 2));
    }
    
    let game = new GameState(calculateSize(currentLevel));
    let currentMode = 'pen'; // 'pen', 'pencil', 'erase'
    
    // UI Elements
    const gridContainer = document.getElementById('grid-container');
    const livesContainer = document.getElementById('lives-container');
    const overlay = document.getElementById('game-over-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayMessage = document.getElementById('overlay-message');
    const praiseContainer = document.getElementById('praise-container');
    const catMessage = document.getElementById('cat-message');
    const titleScreen = document.getElementById('title-screen');
    const btnStart = document.getElementById('btn-start');
    
    // Tools
    const btnPen = document.getElementById('btn-pen');
    const btnPencil = document.getElementById('btn-pencil');
    const btnErase = document.getElementById('btn-erase');
    
    // Region Colors (Psychedelic Theme)
    const regionColors = [
        'rgba(255, 0, 255, 0.4)', // Magenta
        'rgba(0, 255, 255, 0.4)', // Cyan
        'rgba(57, 255, 20, 0.4)', // Lime
        'rgba(255, 255, 0, 0.4)', // Yellow
        'rgba(138, 43, 226, 0.4)', // Purple
        'rgba(255, 69, 0, 0.4)',  // OrangeRed
        'rgba(0, 250, 154, 0.4)', // MediumSpringGreen
        'rgba(255, 20, 147, 0.4)',// DeepPink
        'rgba(30, 144, 255, 0.4)' // DodgerBlue
    ];

    function initUI() {
        document.getElementById('level-display').textContent = `Lv.${currentLevel}`;
        renderGrid();
        updateLives();
        overlay.classList.add('hidden');
    }

    let isDragging = false;

    // ドラッグ状態の解除
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('touchend', () => isDragging = false);

    // タッチデバイスでのスワイプ操作（要素の連続取得）
    gridContainer.addEventListener('touchmove', (e) => {
        if (!isDragging || currentMode === 'pen') return;
        e.preventDefault(); // スクロール防止
        
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        const cell = element ? element.closest('.cell') : null;
        if (cell) {
            handleCellAction(cell, false);
        }
    }, {passive: false});

    function renderGrid() {
        gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${game.size}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${game.size}, 1fr)`;
        
        for (let r = 0; r < game.size; r++) {
            for (let c = 0; c < game.size; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                cellDiv.dataset.r = r;
                cellDiv.dataset.c = c;
                
                const regionId = game.grid[r][c].regionId;
                cellDiv.style.backgroundColor = regionColors[regionId % regionColors.length];
                
                // Draw borders for regions
                if (r > 0 && game.grid[r-1][c].regionId !== regionId) cellDiv.style.borderTop = '2px solid rgba(255,255,255,0.8)';
                if (r < game.size-1 && game.grid[r+1][c].regionId !== regionId) cellDiv.style.borderBottom = '2px solid rgba(255,255,255,0.8)';
                if (c > 0 && game.grid[r][c-1].regionId !== regionId) cellDiv.style.borderLeft = '2px solid rgba(255,255,255,0.8)';
                if (c < game.size-1 && game.grid[r][c+1].regionId !== regionId) cellDiv.style.borderRight = '2px solid rgba(255,255,255,0.8)';
                
                // スワイプ・ドラッグ操作対応のイベントリスナー
                cellDiv.addEventListener('mousedown', (e) => {
                    // 左クリックのみドラッグ開始
                    if (e.button === 0) {
                        isDragging = true;
                        handleCellAction(cellDiv, true);
                    }
                });
                
                cellDiv.addEventListener('mouseenter', (e) => {
                    const r_idx = parseInt(cellDiv.dataset.r);
                    const c_idx = parseInt(cellDiv.dataset.c);
                    const regionId = game.grid[r_idx][c_idx].regionId;
                    
                    // ハイライト追加
                    document.querySelectorAll('.cell').forEach(el => {
                        const er = parseInt(el.dataset.r);
                        const ec = parseInt(el.dataset.c);
                        const er_reg = game.grid[er][ec].regionId;
                        
                        if (er === r_idx || ec === c_idx) el.classList.add('highlight-axis');
                        if (er_reg === regionId) el.classList.add('highlight-region');
                    });

                    // 猫配置（pen）以外ならドラッグで連続適用
                    if (isDragging && currentMode !== 'pen') {
                        handleCellAction(cellDiv, false);
                    }
                });

                cellDiv.addEventListener('mouseleave', (e) => {
                    // ハイライト削除
                    document.querySelectorAll('.cell').forEach(el => {
                        el.classList.remove('highlight-axis', 'highlight-region');
                    });
                });
                
                // 右クリック対応（❌のトグル）
                cellDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); // デフォルトの右クリックメニューを防止
                    if (game.isGameOver) return;
                    
                    const r_idx = parseInt(cellDiv.dataset.r);
                    const c_idx = parseInt(cellDiv.dataset.c);
                    
                    if (game.grid[r_idx][c_idx].content === 'cat') return; // 猫には無効
                    if (cellDiv.innerHTML.includes('⚠️')) return; // ペナルティ中無効

                    const currentContent = game.grid[r_idx][c_idx].content;
                    const newContent = currentContent === 'x' ? null : 'x';
                    
                    game.placeContent(r_idx, c_idx, newContent);
                    if (newContent === 'x') {
                        // すでにバツがついていなければ付ける
                        if (!cellDiv.innerHTML.includes('❌')) {
                            cellDiv.innerHTML = '<span style="opacity:0.5; font-size:1rem;">❌</span>';
                            if (window.playSFX) window.playSFX('x');
                        }
                    } else {
                        cellDiv.innerHTML = '';
                    }
                });
                
                cellDiv.addEventListener('touchstart', (e) => {
                    isDragging = true;
                    handleCellAction(cellDiv, true);
                    if (currentMode !== 'pen') {
                        e.preventDefault(); // スワイプ時のスクロールを防止
                    }
                }, {passive: false});

                gridContainer.appendChild(cellDiv);
            }
        }
    }

    function handleCellAction(cell, isInitialClick) {
        if (game.isGameOver) return;
        
        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);
        
        // Prevent modifying placed cats
        if (game.grid[r][c].content === 'cat') return;
        
        // 【脆弱性修正】ペナルティ処理中（アニメーション中）の連打による、ライフ多重減少バグを防止
        if (cell.innerHTML.includes('⚠️')) return;
        
        let contentToPlace = null;
        if (currentMode === 'pen') contentToPlace = 'cat';
        else if (currentMode === 'pencil') contentToPlace = 'x';
        else if (currentMode === 'erase') contentToPlace = null;

        // ドラッグ中の最適化: 既に同じ状態ならスキップ
        if (!isInitialClick && game.grid[r][c].content === contentToPlace) return;

        const result = game.placeContent(r, c, contentToPlace);
        
        if (result.success) {
            if (contentToPlace === 'cat') {
                if (result.correct) {
                    // サイケデリック毒猫を配置
                    cell.innerHTML = '<img src="cat.png" class="cat-img pop-in">';
                    if (window.playSFX) window.playSFX('cat');
                    
                    // オート❌のUI反映
                    if (result.autoFilled && result.autoFilled.length > 0) {
                        result.autoFilled.forEach(pos => {
                            const targetCell = gridContainer.querySelector(`.cell[data-r="${pos.r}"][data-c="${pos.c}"]`);
                            if (targetCell) {
                                targetCell.innerHTML = '<span style="opacity:0.5; font-size:1rem;">❌</span>';
                            }
                        });
                        // オート❌完了時に音を鳴らすのもあり
                    }
                    
                    if (game.checkWinCondition()) {
                        showWin();
                    }
                } else {
                    // ミス（ペナルティ）
                    if (window.playSFX) window.playSFX('error');
                    triggerErrorEffect();
                    updateLives();
                    // 赤くバツ印を出して消える
                    cell.innerHTML = '<span style="color:var(--color-danger)">⚠️</span>';
                    setTimeout(() => { 
                        if(!game.isGameOver) {
                            // 自動で❌を入れたものを表示
                            cell.innerHTML = '<span style="opacity:0.5; font-size:1rem;">❌</span>';
                        }
                    }, 800);
                }
            } else if (contentToPlace === 'x') {
                // すでにバツがついている場合は上書きしないよう最適化
                if (!cell.innerHTML.includes('❌')) {
                    cell.innerHTML = '<span style="opacity:0.5; font-size:1rem;">❌</span>';
                    if (window.playSFX) window.playSFX('x');
                }
            } else {
                cell.innerHTML = '';
            }
        }
        
        if (game.isGameOver) {
            showGameOver();
        }
    }

    function triggerErrorEffect() {
        document.body.classList.add('shake', 'flash-danger');
        setTimeout(() => {
            document.body.classList.remove('shake', 'flash-danger');
        }, 400);
    }

    function updateLives() {
        livesContainer.innerHTML = '';
        for (let i = 0; i < game.maxLives; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart';
            heart.textContent = '❤️';
            if (i < game.lives) {
                heart.classList.add('active');
            }
            livesContainer.appendChild(heart);
        }
    }

    function setupTools() {
        const buttons = [
            { btn: btnPen, mode: 'pen' },
            { btn: btnPencil, mode: 'pencil' },
            { btn: btnErase, mode: 'erase' }
        ];

        buttons.forEach(({btn, mode}) => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.btn.classList.remove('active'));
                btn.classList.add('active');
                currentMode = mode;
            });
        });
        
        const btnRestart = document.getElementById('btn-restart');
        btnRestart.addEventListener('click', () => {
            if (btnRestart.dataset.action === 'restart') {
                if (window.playBGM) window.playBGM('game');
            }
            if (btnRestart.dataset.action === 'next') {
                currentLevel++;
                game = new GameState(calculateSize(currentLevel));
                initUI();
            } else if (btnRestart.dataset.action === 'ending') {
                overlay.classList.add('hidden');
                showEnding();
            } else {
                game = new GameState(calculateSize(currentLevel));
                initUI();
            }
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (game.isGameOver) return;
            // 1, 2, 3キーでツール切り替え
            if (e.key === '1') {
                btnPen.click();
            } else if (e.key === '2') {
                btnPencil.click();
            } else if (e.key === '3') {
                btnErase.click();
            }
        });

        const btnEndingContinue = document.getElementById('btn-ending-continue');
        if (btnEndingContinue) {
            btnEndingContinue.addEventListener('click', () => {
                const endingScreen = document.getElementById('ending-screen');
                if (endingScreen) endingScreen.classList.add('hidden');
                
                // アニメーションのリセット
                const creditsContainer = document.querySelector('.credits-container');
                if (creditsContainer) {
                    creditsContainer.style.animation = 'none';
                    creditsContainer.offsetHeight; /* trigger reflow */
                    creditsContainer.style.animation = null; 
                }

                currentLevel++;
                game = new GameState(calculateSize(currentLevel));
                if (window.playBGM) window.playBGM('game');
                initUI();
            });
        }
    }

    const praiseTexts = [
        "ふん、生意気な。少しはやるようだな…毒が回る前に行けニャ。",
        "この幻覚の中でよく生き残ったニャ。褒めてやる。",
        "チッ…私の縄張りを制圧するとは。次は沈めてやるニャ。",
        "毒のオーラに耐えきるとは…お前、さては人間じゃないニャ？",
        "悪くない手際だニャ。だが、深淵はここからだ…！",
        "ふふっ…その程度の毒で満足するなよ？",
        "お前の脳、だいぶ毒に染まってきたみたいだニャ。",
        "クリアしたからって調子に乗るなニャ。次は容赦しない。",
        "ほう…私の毒を飲み干すとは、面白いヤツだ。",
        "こんな狂った盤面を解くなんて、お前も相当な変態だニャ。"
    ];

    const bossPool2 = {
        prefixes: ["ほう…", "まさか…", "フハハハ！", "素晴らしい…", "信じられんニャ…", "ククク…", "見事だ…", "よもや…"],
        middles: ["貴様のような変異体が現れるとはな…", "こんな狂った盤面を解くとは…", "この深淵の幻覚の中で正気を保つとは…", "私の最強の毒素を飲み干すとは…", "これほどの毒のオーラの中で平然としているとは…", "私の支配をここまで退けるとは…", "私の創り出した極彩色の迷宮を破るとは…", "この絶望の淵から這い上がってくるとは…"],
        suffixes: ["だが勘違いするな、ただ少し驚いただけだニャ。", "お前ももう完全にこちら側の住人だニャ。", "永遠に私の毒の中で遊んでやるニャ…！", "だが私が本気を出せば一瞬で溶けるぞ！", "共に世界を極彩色の毒で染め上げようニャ！", "次こそ絶望の淵に沈めてやる！", "お前のその歪んだ魂、気に入ったニャ。", "次は私の真の毒を見せてやるニャ！"]
    };

    function generateBossText() {
        const selectedPool = bossPool2;
        const prefix = selectedPool.prefixes[Math.floor(Math.random() * selectedPool.prefixes.length)];
        const middle = selectedPool.middles[Math.floor(Math.random() * selectedPool.middles.length)];
        const suffix = selectedPool.suffixes[Math.floor(Math.random() * selectedPool.suffixes.length)];
        return `${prefix}${middle}${suffix}`;
    }

    function showGameOver() {
        if (window.playBGM) window.playBGM('stop');
        if (window.playSFX) window.playSFX('gameover');
        praiseContainer.classList.add('hidden');
        overlayTitle.textContent = 'GAME OVER';
        overlayTitle.style.color = 'var(--color-danger)';
        overlayMessage.textContent = '毒に飲まれた...';
        const btnRestart = document.getElementById('btn-restart');
        btnRestart.textContent = '再挑戦';
        btnRestart.dataset.action = 'restart';
        overlay.classList.remove('hidden');
    }

    function showWin() {
        if (window.playSFX) window.playSFX('clear');
        
        let catImageSrc = 'cat_clear.png';
        if (currentLevel >= 11) {
            catImageSrc = 'cat_max.png';
            catMessage.textContent = generateBossText();
        } else {
            const stageIndex = ((currentLevel - 1) % 5) + 1; // 1 to 5
            catImageSrc = `cat_stage${stageIndex}.png`;
            catMessage.textContent = praiseTexts[Math.floor(Math.random() * praiseTexts.length)];
        }
        document.getElementById('clear-cat-img').src = catImageSrc;

        praiseContainer.classList.remove('hidden');
        overlayTitle.textContent = 'CLEAR!';
        overlayTitle.style.color = 'var(--color-lime)';
        overlayMessage.textContent = '縄張りを完全制圧しました！';
        const btnRestart = document.getElementById('btn-restart');
        
        if (currentLevel === 11) {
            btnRestart.textContent = '深淵の先へ (エンディング)';
            btnRestart.dataset.action = 'ending';
        } else {
            btnRestart.textContent = '次のレベルへ';
            btnRestart.dataset.action = 'next';
        }
        
        overlay.classList.remove('hidden');
    }

    function showEnding() {
        if (window.playBGM) window.playBGM('ending');
        const endingScreen = document.getElementById('ending-screen');
        endingScreen.classList.remove('hidden');
    }

    btnStart.addEventListener('click', () => {
        if (window.initAudio) window.initAudio();
        if (window.playBGM) window.playBGM('game');
        titleScreen.classList.add('hidden');
    });

    // Start
    setupTools();
    initUI();
});
