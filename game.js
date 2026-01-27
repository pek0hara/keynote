/**
 * 音感マスター - ゲームロジック
 */

class Game {
    constructor() {
        this.instrument = 'piano';
        this.difficulty = 'easy';
        this.gameMode = 'single'; // 'single', 'chord', 'bass'
        this.currentNote = null;
        this.currentChord = null; // コードモード用
        this.currentNotesSequence = []; // 単音モード：連続音のシーケンス
        this.currentChordsSequence = []; // コードモード：連続コードのシーケンス
        this.rootChord = null; // コードモード：ルートコード（最初に鳴らす基準）
        this.userAnswerSequence = []; // ユーザーの回答シーケンス
        this.sequenceLength = 3; // 現在のシーケンスの長さ（3から開始）
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.questionNumber = 0;
        this.totalQuestions = 10;
        this.correctCount = 0;
        this.availableNotes = [];
        this.availableChords = []; // コードモード用
        this.hasPlayed = false;

        // ベースモード用
        this.bassChordProgression = []; // コード進行
        this.bassCurrentChordIndex = 0; // 現在のコードインデックス
        this.bassBeatCount = 0; // 拍数カウント
        this.bassBeatsPerChord = 4; // 1コードあたりの拍数
        this.bassBpm = 100; // BPM
        this.bassIsPlaying = false; // 再生中フラグ
        this.bassUserInputs = []; // ユーザーの入力履歴
        this.bassExpectedRoots = []; // 期待されるルート音

        this.init();
    }
    
    init() {
        // 画面要素
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen')
        };
        
        // 楽器ビジュアルUI要素
        this.pianoKeyboard = document.getElementById('piano-keyboard');
        this.guitarFretboard = document.getElementById('guitar-fretboard');
        this.bassModeUI = document.getElementById('bass-mode-ui');
        this.bassFretboard = document.getElementById('bass-fretboard');

        // ボタンイベント
        document.querySelectorAll('.instrument-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectInstrument(btn.dataset.instrument));
        });
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
        });
        
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectDifficulty(btn.dataset.difficulty));
        });
        
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-sound-btn').addEventListener('click', () => this.playCurrentSound());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.showScreen('start'));
        document.getElementById('retry-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showScreen('start'));
        
        // ピアノ鍵盤イベント
        this.initPianoKeyboard();

        // ギター弦イベント
        this.initGuitarStrings();

        // ベースフレットボードイベント
        this.initBassFretboard();
    }
    
    initPianoKeyboard() {
        // 白鍵イベント
        document.querySelectorAll('.white-key').forEach(key => {
            key.addEventListener('click', () => this.playKeyNote(key));
        });
        
        // 黒鍵イベント
        document.querySelectorAll('.black-key').forEach(key => {
            key.addEventListener('click', () => this.playKeyNote(key));
        });
    }
    
    initGuitarStrings() {
        // 各フレットポジションにイベントを追加
        document.querySelectorAll('.fret-position').forEach(position => {
            position.addEventListener('click', () => this.playFretPosition(position));
        });
    }

    initBassFretboard() {
        // ベースフレットボードの各ポジションにイベントを追加
        document.querySelectorAll('.bass-fret-position').forEach(position => {
            position.addEventListener('click', () => this.playBassPosition(position));
        });
    }

    playBassPosition(position) {
        const note = position.dataset.note;
        if (!note) return;

        // ベース音を再生
        audioEngine.playBassNote(note);

        // ビジュアルフィードバック
        position.classList.add('playing');
        setTimeout(() => position.classList.remove('playing'), 300);

        // ベースモードでゲーム中の場合、回答をチェック
        if (this.gameMode === 'bass' && this.bassIsPlaying) {
            this.checkBassAnswer(note);
        }
    }
    
    playKeyNote(key) {
        const note = key.dataset.note;
        if (!note) return;

        if (this.gameMode === 'chord') {
            // コードモード：音名からコードを推測して再生
            const noteName = note.replace(/[0-9]/g, '');
            const chord = this.findChordByRoot(noteName);
            if (chord) {
                audioEngine.playChord(chord, 'piano');
                this.animateChord(chord);
            }
        } else {
            // 単音モード
            audioEngine.playNote(note, 'piano');
            key.classList.add('playing');
            setTimeout(() => key.classList.remove('playing'), 300);
        }
    }

    playFretPosition(position) {
        const note = position.dataset.note;
        if (!note) return;

        if (this.gameMode === 'chord') {
            // コードモード：音名からコードを推測して再生
            const noteName = note.replace(/[0-9]/g, '');
            const chord = this.findChordByRoot(noteName);
            if (chord) {
                audioEngine.playChord(chord, 'guitar');
                this.animateChord(chord);
            }
        } else {
            // 単音モード
            audioEngine.playNote(note, 'guitar');
            position.classList.add('playing');
            setTimeout(() => position.classList.remove('playing'), 500);
        }
    }

    // 音名からルートが一致するコードを探す
    findChordByRoot(noteName) {
        // 利用可能なコードの中から、ルート音が一致するものを探す
        for (const chord of this.availableChords) {
            // コード名の最初の部分がルート音（例: "C", "Am" → "A", "C7" → "C"）
            const chordRoot = chord.replace(/m|7/g, '');
            if (chordRoot === noteName) {
                return chord;
            }
        }
        return null;
    }
    
    selectInstrument(instrument) {
        this.instrument = instrument;
        document.querySelectorAll('.instrument-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.instrument === instrument);
        });
    }
    
    selectMode(mode) {
        this.gameMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // 難易度説明をモードに応じて更新
        this.updateDifficultyDescriptions();
    }
    
    updateDifficultyDescriptions() {
        const easyDesc = document.getElementById('difficulty-easy-desc');
        const mediumDesc = document.getElementById('difficulty-medium-desc');
        const hardDesc = document.getElementById('difficulty-hard-desc');

        if (this.gameMode === 'chord') {
            easyDesc.textContent = 'メジャーコード';
            mediumDesc.textContent = '+マイナー';
            hardDesc.textContent = '+セブンス';
        } else if (this.gameMode === 'bass') {
            easyDesc.textContent = '4コード・BPM80';
            mediumDesc.textContent = '6コード・BPM100';
            hardDesc.textContent = '8コード・BPM120';
        } else {
            easyDesc.textContent = 'C D E F G A B';
            mediumDesc.textContent = '2オクターブ';
            hardDesc.textContent = '+シャープ';
        }
    }
    
    selectDifficulty(difficulty) {
        this.difficulty = difficulty;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });
    }
    
    async startGame() {
        await audioEngine.initialize();

        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.questionNumber = 0;
        this.correctCount = 0;
        this.sequenceLength = 3; // シーケンス長を3にリセット

        // ベースモードの初期化
        this.bassIsPlaying = false;
        this.bassUserInputs = [];

        if (this.gameMode === 'chord') {
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
        } else if (this.gameMode === 'bass') {
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
            this.setupBassMode();
        } else {
            this.availableNotes = audioEngine.getNotesByDifficulty(this.difficulty);
        }

        this.updateInstrumentVisual();
        this.generateAnswerButtons();
        this.showScreen('game');
        this.nextQuestion();
    }

    setupBassMode() {
        // 難易度に応じた設定
        switch (this.difficulty) {
            case 'easy':
                this.bassBeatsPerChord = 4;
                this.bassBpm = 80;
                this.sequenceLength = 4;
                break;
            case 'medium':
                this.bassBeatsPerChord = 4;
                this.bassBpm = 100;
                this.sequenceLength = 6;
                break;
            case 'hard':
                this.bassBeatsPerChord = 4;
                this.bassBpm = 120;
                this.sequenceLength = 8;
                break;
        }
    }
    

    
    updateInstrumentVisual() {
        // ベースモードの場合
        if (this.gameMode === 'bass') {
            this.pianoKeyboard.classList.add('hidden');
            this.guitarFretboard.classList.add('hidden');
            this.bassModeUI.classList.remove('hidden');
            return;
        }

        // ピアノかギターかでビジュアルを切り替え
        this.bassModeUI.classList.add('hidden');
        if (this.instrument === 'piano') {
            this.pianoKeyboard.classList.remove('hidden');
            this.guitarFretboard.classList.add('hidden');
            this.updateBlackKeysVisibility();
        } else {
            this.pianoKeyboard.classList.add('hidden');
            this.guitarFretboard.classList.remove('hidden');
        }
    }
    
    updateBlackKeysVisibility() {
        // コードモードまたは上級モードでは黒鍵を表示
        const showBlackKeys = this.gameMode === 'chord' || this.difficulty === 'hard';
        document.querySelectorAll('.black-key').forEach(key => {
            key.classList.toggle('hidden-key', !showBlackKeys);
        });
        
        // 中級以上では上段鍵盤（C3-B3）を表示
        const keyboardUpper = document.getElementById('keyboard-upper');
        if (keyboardUpper) {
            const showUpperKeyboard = this.difficulty === 'medium' || this.difficulty === 'hard';
            keyboardUpper.classList.toggle('hidden', !showUpperKeyboard);
        }
    }
    
    generateAnswerButtons() {
        const grid = document.getElementById('answer-grid');
        const answerSection = document.querySelector('.answer-section');
        grid.innerHTML = '';

        // ベースモードでは回答ボタンを非表示
        if (this.gameMode === 'bass') {
            answerSection.classList.add('hidden');
            return;
        }

        answerSection.classList.remove('hidden');

        if (this.gameMode === 'chord') {
            // コードモード：利用可能なコード名でボタン生成
            this.availableChords.forEach(chord => {
                const btn = document.createElement('button');
                btn.className = 'answer-btn chord-btn';
                btn.dataset.chord = chord;
                btn.textContent = chord;
                btn.addEventListener('click', () => this.checkAnswer(chord));
                grid.appendChild(btn);
            });
        } else {
            // 単音モード：ユニークな音名のみ取得
            const uniqueNotes = [...new Set(this.availableNotes.map(n => n.replace(/[0-9]/g, '')))];

            uniqueNotes.forEach(note => {
                const btn = document.createElement('button');
                btn.className = 'answer-btn';
                btn.dataset.note = note;
                btn.textContent = audioEngine.getNoteNameJP(note);
                btn.addEventListener('click', () => this.checkAnswer(note));
                grid.appendChild(btn);
            });
        }
    }
    
    nextQuestion() {
        this.questionNumber++;
        this.hasPlayed = false;
        this.userAnswerSequence = []; // ユーザーの回答をリセット

        // フィードバックを非表示（最終問題でも確実に閉じる）
        document.getElementById('feedback-display').classList.add('hidden');

        if (this.questionNumber > this.totalQuestions) {
            // ベースモードの場合はメトロノームを停止
            if (this.gameMode === 'bass') {
                audioEngine.stopMetronome();
                this.bassIsPlaying = false;
            }
            this.showResults();
            return;
        }

        // ベースモードの場合
        if (this.gameMode === 'bass') {
            this.setupBassQuestion();
            this.updateBassUI();
            document.getElementById('current-score').textContent = this.score;
            document.getElementById('current-streak').textContent = this.streak;
            document.getElementById('question-number').textContent = `${this.questionNumber}/${this.totalQuestions}`;
            document.getElementById('hint-text').textContent = 'スタートを押してコードに合わせてルート音を弾こう！';
            return;
        }

        if (this.gameMode === 'chord') {
            // コードモード：連続コードのシーケンス生成
            this.currentChordsSequence = [];

            // ルートコードをランダムに選択（シーケンスの最初に入れる）
            const rootIndex = Math.floor(Math.random() * this.availableChords.length);
            this.rootChord = this.availableChords[rootIndex];
            this.currentChordsSequence.push(this.rootChord);

            // 残りのコードを生成
            for (let i = 1; i < this.sequenceLength; i++) {
                const randomIndex = Math.floor(Math.random() * this.availableChords.length);
                this.currentChordsSequence.push(this.availableChords[randomIndex]);
            }

            // 後方互換性のため、最初のコードをcurrentChordにも設定
            this.currentChord = this.currentChordsSequence[0];
        } else {
            // 単音モード：連続音のシーケンス生成
            this.currentNotesSequence = [];
            
            // 1音目はランダムに選択
            const firstIndex = Math.floor(Math.random() * this.availableNotes.length);
            const firstNote = this.availableNotes[firstIndex];
            this.currentNotesSequence.push(firstNote);
            
            // 2音目以降は、1音目をルートとしたメジャースケール上の音から選択
            if (this.sequenceLength > 1) {
                // 1音目をルートとするスケール音を取得
                const scaleNotes = audioEngine.getMajorScaleNotes(firstNote, this.availableNotes);
                
                for (let i = 1; i < this.sequenceLength; i++) {
                    // スケール内の音からランダムに選択
                    const randomIndex = Math.floor(Math.random() * scaleNotes.length);
                    this.currentNotesSequence.push(scaleNotes[randomIndex]);
                }
            }
            
            // 後方互換性のため、最初の音をcurrentNoteにも設定
            this.currentNote = this.currentNotesSequence[0];
        }
        
        // UI更新
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('current-streak').textContent = this.streak;
        document.getElementById('question-number').textContent = `${this.questionNumber}/${this.totalQuestions}`;
        
        // ヒントテキストを更新
        if (this.sequenceLength > 1) {
            if (this.gameMode === 'chord') {
                document.getElementById('hint-text').textContent = `${this.sequenceLength}コードを順番に当ててください`;
            } else {
                document.getElementById('hint-text').textContent = `${this.sequenceLength}音を順番に当ててください`;
            }
        } else {
            document.getElementById('hint-text').textContent = 'ボタンを押して音を聴いてください';
        }

        // 回答ボタンをリセット
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('correct', 'wrong', 'selected');
            btn.disabled = false;
        });
        
        // 鍵盤・弦のハイライトをリセット
        this.resetInstrumentHighlights();
    }
    
    resetInstrumentHighlights() {
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.classList.remove('playing', 'correct', 'wrong');
        });
        document.querySelectorAll('.fret-position').forEach(position => {
            position.classList.remove('playing', 'correct', 'wrong');
        });
    }
    
    playCurrentSound() {
        if (this.gameMode === 'bass') {
            this.startBassMode();
        } else if (this.gameMode === 'chord') {
            this.playCurrentChord();
        } else {
            this.playCurrentNote();
        }
    }
    
    playCurrentNote() {
        if (!this.currentNote) return;
        
        this.hasPlayed = true;
        
        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');
        
        // シーケンスの音を順番に再生（ピアノの色は1音目のみ）
        this.currentNotesSequence.forEach((note, index) => {
            setTimeout(() => {
                audioEngine.playNote(note, this.instrument);
                if (index === 0) {
                    this.animateNote(note);
                }
            }, index * 500); // 500ms間隔で再生
        });
        
        // 再生ボタンのアニメーションを終了
        const totalDuration = this.currentNotesSequence.length * 500 + 500;
        setTimeout(() => playBtn.classList.remove('playing'), totalDuration);
        
        // ヒントテキストを更新
        if (this.sequenceLength > 1) {
            document.getElementById('hint-text').textContent = `${this.sequenceLength}音を順番にクリックしてください`;
        } else {
            document.getElementById('hint-text').textContent = '音を聴いたら下のボタンで回答！';
        }
    }
    
    playCurrentChord() {
        if (this.currentChordsSequence.length === 0) return;

        this.hasPlayed = true;

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');

        // 各コードを4回ずつ繰り返し再生
        const repeatCount = 4;
        const beatInterval = 500; // 1拍の間隔（ms）
        const chordDuration = repeatCount * beatInterval; // 1コードあたりの時間

        this.currentChordsSequence.forEach((chord, chordIndex) => {
            for (let beat = 0; beat < repeatCount; beat++) {
                const time = chordIndex * chordDuration + beat * beatInterval;
                setTimeout(() => {
                    audioEngine.playChord(chord, this.instrument);
                    // 最初のコードの最初の拍のみビジュアル表示
                    if (chordIndex === 0 && beat === 0) {
                        this.animateChord(chord);
                    }
                }, time);
            }
        });

        // 再生ボタンのアニメーションを終了
        const totalDuration = this.currentChordsSequence.length * chordDuration + 500;
        setTimeout(() => playBtn.classList.remove('playing'), totalDuration);

        // ヒントテキストを更新
        document.getElementById('hint-text').textContent = `${this.sequenceLength}コードを順番にクリックしてください`;
    }
    
    animateCurrentNote() {
        if (this.instrument === 'piano') {
            // ピアノの場合：対応する鍵盤をハイライト
            const key = document.querySelector(`[data-note="${this.currentNote}"]`);
            if (key && (key.classList.contains('white-key') || key.classList.contains('black-key'))) {
                key.classList.add('playing');
                setTimeout(() => key.classList.remove('playing'), 500);
            }
        } else {
            // ギターの場合：対応するフレットポジションをハイライト
            const positions = document.querySelectorAll(`.fret-position[data-note="${this.currentNote}"]`);
            positions.forEach(position => {
                position.classList.add('playing');
                setTimeout(() => position.classList.remove('playing'), 500);
            });
        }
    }
    
    animateNote(note) {
        if (this.instrument === 'piano') {
            // ピアノの場合：対応する鍵盤をハイライト
            const key = document.querySelector(`[data-note="${note}"]`);
            if (key && (key.classList.contains('white-key') || key.classList.contains('black-key'))) {
                key.classList.add('playing');
                setTimeout(() => key.classList.remove('playing'), 500);
            }
        } else {
            // ギターの場合：対応するフレットポジションを1つだけハイライト
            const position = document.querySelector(`.fret-position[data-note="${note}"]`);
            if (position) {
                position.classList.add('playing');
                setTimeout(() => position.classList.remove('playing'), 500);
            }
        }
    }
    
    animateChord(chordName) {
        if (this.instrument === 'piano') {
            // ピアノの場合：構成音でハイライト
            const notes = audioEngine.getChordNotes(chordName);
            notes.forEach((note, index) => {
                setTimeout(() => {
                    const key = document.querySelector(`[data-note="${note}"]`);
                    if (key && (key.classList.contains('white-key') || key.classList.contains('black-key'))) {
                        key.classList.add('playing');
                        setTimeout(() => key.classList.remove('playing'), 600);
                    }
                }, index * 50);
            });
        } else {
            // ギターの場合：実際のコードフォームでハイライト
            const chordForm = audioEngine.getGuitarChordForm(chordName);
            chordForm.forEach((pos, index) => {
                setTimeout(() => {
                    const position = document.querySelector(
                        `.fret-position[data-string="${pos.string}"][data-fret="${pos.fret}"]`
                    );
                    if (position) {
                        position.classList.add('playing');
                        setTimeout(() => position.classList.remove('playing'), 600);
                    }
                }, index * 50);
            });
        }
    }

    animateCurrentChord() {
        this.animateChord(this.currentChord);
    }

    // ========== ベースモード関連 ==========

    setupBassQuestion() {
        // コード進行を生成
        this.bassChordProgression = [];
        this.bassExpectedRoots = [];
        this.bassUserInputs = [];
        this.bassCurrentChordIndex = 0;
        this.bassBeatCount = 0;

        for (let i = 0; i < this.sequenceLength; i++) {
            const randomIndex = Math.floor(Math.random() * this.availableChords.length);
            const chord = this.availableChords[randomIndex];
            this.bassChordProgression.push(chord);
            // ルート音を取得（オクターブなし）
            this.bassExpectedRoots.push(audioEngine.getChordRoot(chord));
        }
    }

    updateBassUI() {
        // 現在のコードを表示
        const chordNameEl = document.getElementById('current-chord-name');
        if (chordNameEl && this.bassChordProgression.length > 0) {
            chordNameEl.textContent = this.bassChordProgression[this.bassCurrentChordIndex] || '-';
        }

        // 進行位置を表示
        const positionEl = document.getElementById('progression-position');
        if (positionEl) {
            positionEl.textContent = `${this.bassCurrentChordIndex + 1} / ${this.bassChordProgression.length}`;
        }

        // ビートインジケーターをリセット
        document.querySelectorAll('.beat-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index < this.bassBeatCount % this.bassBeatsPerChord);
        });
    }

    startBassMode() {
        if (this.bassIsPlaying) {
            // 既に再生中なら停止
            this.stopBassMode();
            return;
        }

        this.hasPlayed = true;
        this.bassIsPlaying = true;
        this.bassCurrentChordIndex = 0;
        this.bassBeatCount = 0;
        this.bassUserInputs = [];

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');
        playBtn.querySelector('.play-text').textContent = '停止';

        document.getElementById('hint-text').textContent = 'コードに合わせてルート音を弾こう！';

        // メトロノーム開始とコード再生
        audioEngine.startMetronome(this.bassBpm, (beatCount, isAccent) => {
            this.onBassBeat(beatCount, isAccent);
        }, this.bassBeatsPerChord);
    }

    stopBassMode() {
        audioEngine.stopMetronome();
        this.bassIsPlaying = false;

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-text').textContent = '音を聴く';

        // ビートインジケーターをリセット
        document.querySelectorAll('.beat-dot').forEach(dot => {
            dot.classList.remove('active');
        });
    }

    onBassBeat(beatCount, isAccent) {
        this.bassBeatCount = beatCount;

        // 4拍ごとにコードを進める
        if (beatCount > 0 && beatCount % this.bassBeatsPerChord === 0) {
            this.bassCurrentChordIndex++;

            // 全コード終了
            if (this.bassCurrentChordIndex >= this.bassChordProgression.length) {
                this.stopBassMode();
                this.evaluateBassPerformance();
                return;
            }
        }

        // UIを更新
        this.updateBassUI();

        // ビートインジケーターを更新
        const beatInChord = beatCount % this.bassBeatsPerChord;
        document.querySelectorAll('.beat-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === beatInChord);
        });

        // 1拍目でコードを鳴らす
        if (isAccent || beatCount % this.bassBeatsPerChord === 0) {
            const currentChord = this.bassChordProgression[this.bassCurrentChordIndex];
            if (currentChord) {
                audioEngine.playChord(currentChord, 'guitar');
            }
        }
    }

    checkBassAnswer(note) {
        // 音名からルート音を抽出（オクターブを除去）
        const noteName = note.replace(/[0-9]/g, '');

        // 現在のコードのルート音
        const expectedRoot = this.bassExpectedRoots[this.bassCurrentChordIndex];

        // 入力を記録
        this.bassUserInputs.push({
            chordIndex: this.bassCurrentChordIndex,
            note: noteName,
            correct: noteName === expectedRoot,
            beat: this.bassBeatCount
        });

        // 正誤のビジュアルフィードバック
        const positions = document.querySelectorAll(`.bass-fret-position[data-note="${note}"]`);
        positions.forEach(pos => {
            if (noteName === expectedRoot) {
                pos.classList.add('correct');
                setTimeout(() => pos.classList.remove('correct'), 300);
            } else {
                pos.classList.add('wrong');
                setTimeout(() => pos.classList.remove('wrong'), 300);
            }
        });
    }

    evaluateBassPerformance() {
        // 各コードに対して少なくとも1回正解の入力があったかチェック
        const correctChords = new Set();
        this.bassUserInputs.forEach(input => {
            if (input.correct) {
                correctChords.add(input.chordIndex);
            }
        });

        const totalChords = this.bassChordProgression.length;
        const correctCount = correctChords.size;
        const percentage = (correctCount / totalChords) * 100;

        // スコア計算
        const baseScore = correctCount * 25;
        const streakBonus = this.streak * 10;
        const difficultyBonus = this.difficulty === 'hard' ? 50 : this.difficulty === 'medium' ? 25 : 0;
        const roundScore = baseScore + streakBonus + difficultyBonus;

        // 80%以上正解で成功
        const isSuccess = percentage >= 80;

        if (isSuccess) {
            this.correctCount++;
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            this.score += roundScore;
            this.showFeedback(true, null);

            // シーケンス長を増やす（最大8コードまで）
            if (this.sequenceLength < 8) {
                this.sequenceLength++;
            }
        } else {
            this.streak = 0;
            this.score += Math.floor(roundScore * 0.3); // 部分点
            this.showFeedback(false, `${correctCount}/${totalChords}コード正解`);
        }

        document.getElementById('current-score').textContent = this.score;
        document.getElementById('current-streak').textContent = this.streak;

        setTimeout(() => this.nextQuestion(), 2000);
    }

    checkAnswer(selected) {
        if (!this.hasPlayed) {
            document.getElementById('hint-text').textContent = '⚠️ まず音を聴いてください！';
            return;
        }
        
        if (this.gameMode === 'chord') {
            // コードモード：連続コード対応
            const currentIndex = this.userAnswerSequence.length;
            const expectedChord = this.currentChordsSequence[currentIndex];
            const isCorrect = selected === expectedChord;

            // ユーザーの回答を記録
            this.userAnswerSequence.push(selected);

            // 選択したボタンをハイライト
            const selectedBtn = document.querySelector(`.answer-btn[data-chord="${selected}"]`);
            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.add('selected');
                    // 正解コードを再生
                    audioEngine.playChord(expectedChord, this.instrument);
                } else {
                    selectedBtn.classList.add('wrong');
                }
            }

            // 不正解の場合
            if (!isCorrect) {
                // 全てのボタンを無効化
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.disabled = true;
                    if (btn.dataset.chord === expectedChord) {
                        btn.classList.add('correct');
                    }
                });

                this.showFeedback(false, expectedChord);
                this.streak = 0;
                this.sequenceLength = 3; // シーケンス長を3にリセット

                setTimeout(() => this.nextQuestion(), 1500);
                return;
            }

            // 全て正解した場合
            if (this.userAnswerSequence.length === this.currentChordsSequence.length) {
                // 全てのボタンを無効化
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.disabled = true;
                });

                this.showFeedback(true, null);

                // スコア更新
                this.correctCount++;
                this.streak++;
                this.maxStreak = Math.max(this.maxStreak, this.streak);
                this.score += 100 + (this.streak * 10) + (this.sequenceLength - 1) * 50;

                // シーケンス長を増やす（最大5コードまで）
                if (this.sequenceLength < 5) {
                    this.sequenceLength++;
                }

                setTimeout(() => this.nextQuestion(), 1500);
            } else {
                // まだ回答が続く場合
                const remaining = this.currentChordsSequence.length - this.userAnswerSequence.length;
                document.getElementById('hint-text').textContent = `あと${remaining}コード！`;
            }

        } else {
            // 単音モード：連続音対応
            const currentIndex = this.userAnswerSequence.length;
            const expectedNote = this.currentNotesSequence[currentIndex].replace(/[0-9]/g, '');
            const isCorrect = selected === expectedNote;
            
            // ユーザーの回答を記録
            this.userAnswerSequence.push(selected);
            
            // 選択したボタンをハイライト
            const selectedBtn = document.querySelector(`.answer-btn[data-note="${selected}"]`);
            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.add('selected');
                    // 正解音を再生
                    audioEngine.playNote(this.currentNotesSequence[currentIndex], this.instrument);
                } else {
                    selectedBtn.classList.add('wrong');
                }
            }
            
            // 不正解の場合
            if (!isCorrect) {
                // 全てのボタンを無効化
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.disabled = true;
                    const noteName = this.currentNotesSequence[currentIndex].replace(/[0-9]/g, '');
                    if (btn.dataset.note === noteName) {
                        btn.classList.add('correct');
                    }
                });
                
                this.showFeedback(false, expectedNote);
                this.streak = 0;
                this.sequenceLength = 3; // シーケンス長を3にリセット
                
                setTimeout(() => this.nextQuestion(), 1500);
                return;
            }
            
            // 全て正解した場合
            if (this.userAnswerSequence.length === this.currentNotesSequence.length) {
                // 全てのボタンを無効化
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.disabled = true;
                });
                
                this.showFeedback(true, null);
                
                // スコア更新
                this.correctCount++;
                this.streak++;
                this.maxStreak = Math.max(this.maxStreak, this.streak);
                this.score += 100 + (this.streak * 10) + (this.sequenceLength - 1) * 50; // シーケンス長に応じてボーナス
                
                // シーケンス長を増やす（最大5音まで）
                if (this.sequenceLength < 5) {
                    this.sequenceLength++;
                }
                
                setTimeout(() => this.nextQuestion(), 1500);
            } else {
                // まだ回答が続く場合
                const remaining = this.currentNotesSequence.length - this.userAnswerSequence.length;
                document.getElementById('hint-text').textContent = `あと${remaining}音！`;
            }
        }
    }
    
    showFeedback(isCorrect, correctAnswer) {
        const feedback = document.getElementById('feedback-display');
        const icon = document.getElementById('feedback-icon');
        const text = document.getElementById('feedback-text');
        
        icon.className = 'feedback-icon ' + (isCorrect ? 'correct' : 'wrong');
        icon.textContent = isCorrect ? '✓' : '✗';
        
        if (this.gameMode === 'chord') {
            text.textContent = isCorrect ? '正解！' : `正解は ${correctAnswer}`;
        } else {
            text.textContent = isCorrect ? '正解！' : `正解は ${audioEngine.getNoteNameJP(correctAnswer)}`;
        }
        
        feedback.classList.remove('hidden');
    }
    
    showResults() {
        const percentage = (this.correctCount / this.totalQuestions) * 100;
        
        // ランク判定
        let emoji, title, rank;
        if (percentage >= 90) {
            emoji = '🏆'; title = 'パーフェクト！'; rank = '🥇 音感マスター';
        } else if (percentage >= 70) {
            emoji = '🎉'; title = 'すばらしい！'; rank = '🥈 音感エキスパート';
        } else if (percentage >= 50) {
            emoji = '👍'; title = 'よくできました！'; rank = '🥉 音感トレーナー';
        } else {
            emoji = '💪'; title = 'がんばろう！'; rank = '🎵 音感ビギナー';
        }
        
        document.getElementById('result-emoji').textContent = emoji;
        document.getElementById('result-title').textContent = title;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('correct-count').textContent = `${this.correctCount}/${this.totalQuestions}`;
        document.getElementById('max-streak').textContent = this.maxStreak;
        document.getElementById('rank-badge').textContent = rank;
        
        this.showScreen('result');
    }
    
    showScreen(screenName) {
        // ベースモードの場合はメトロノームを停止
        if (this.bassIsPlaying) {
            this.stopBassMode();
        }

        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[screenName].classList.add('active');

        // ヘッダーの表示制御（ゲーム画面では非表示）
        const header = document.querySelector('.header');
        if (header) {
            if (screenName === 'game') {
                header.style.display = 'none';
            } else {
                header.style.display = ''; // デフォルトに戻す
            }
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
