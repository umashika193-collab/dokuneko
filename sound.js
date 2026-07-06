// sound.js
// MP3によるBGM制御と、Web Audio APIによるShpongle風（サイビエント・アシッド）効果音の生成

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmGame, bgmEnding;

function initAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // ご用意いただいたShpongleの名曲をBGMとして読み込み
    bgmGame = new Audio('06-Divine Moments Of Truth.mp3');
    bgmGame.loop = true;
    bgmGame.volume = 0.6;

    bgmEnding = new Audio('05-Shamanix.mp3');
    bgmEnding.loop = true;
    bgmEnding.volume = 0.7;
}

function playBGM(type) {
    if (!bgmGame || !bgmEnding) return;
    
    if (type === 'game') {
        bgmEnding.pause();
        bgmEnding.currentTime = 0;
        bgmGame.play().catch(e => console.log('Audio play failed', e));
    } else if (type === 'ending') {
        bgmGame.pause();
        bgmGame.currentTime = 0;
        bgmEnding.play().catch(e => console.log('Audio play failed', e));
    } else if (type === 'stop') {
        bgmGame.pause();
        bgmEnding.pause();
    }
}

// プロシージャル・サイケデリック効果音（SFX）
function playSFX(type) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const t = audioCtx.currentTime;

    if (type === 'cat') {
        // Shpongleでよく聴く「ビヨッ」というフィルターアシッド音（TB-303風）
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(3000, t + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        filter.Q.value = 15; // 高めのレゾナンスでアシッド感を出す
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(t);
        osc.stop(t + 0.35);
    } 
    else if (type === 'x') {
        // 短い民族楽器のクリック音的なパーカッション
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(t);
        osc.stop(t + 0.05);
    }
    else if (type === 'error') {
        // 毒が回るような不協和音ノイズブラスト
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(150, t);
        osc2.frequency.setValueAtTime(155, t); // うねり（ビート）を発生させる
        osc1.frequency.exponentialRampToValueAtTime(50, t + 0.5);
        osc2.frequency.exponentialRampToValueAtTime(45, t + 0.5);
        
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.5);
        osc2.stop(t + 0.5);
    }
    else if (type === 'clear') {
        // トライバル・サイケデリックな高速アルペジオ（フリジアンドミナント音階）
        const notes = [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 493.88, 523.25];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const time = t + (i * 0.1);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(time);
            osc.stop(time + 0.4);
        });
    }
    else if (type === 'gameover') {
        // 意識が沈んでいくような低音ピッチドロップ
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 2);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(t);
        osc.stop(t + 2);
    }
}

window.initAudio = initAudio;
window.playBGM = playBGM;
window.playSFX = playSFX;
