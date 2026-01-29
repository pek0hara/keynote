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

        // ドラムモード用
        this.drumPattern = null; // 現在のドラムパターン
        this.drumPatternName = 'basic8'; // パターン名
        this.drumBpm = 100; // BPM
        this.drumBeatCount = 0; // 現在のビートカウント
        this.drumIsPlaying = false; // 再生中フラグ
        this.drumUserInputs = []; // ユーザーの入力履歴
        this.drumExpectedBeats = []; // 期待される入力タイミング
        this.drumMeasures = 2; // 小節数
        this.drumInterval = null; // ドラムパターン再生用インターバル
        this.drumCorrectHits = 0; // リアルタイムの正解数
        this.drumJudgmentTimeout = null; // 判定表示のタイムアウト
        this.drumPreviewPhase = false; // プレビューフェーズ中かどうか
        this.drumPreviewCount = 0; // プレビュー周回数（2周で終了）

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
        this.drumModeUI = document.getElementById('drum-mode-ui');
        this.drumPads = document.getElementById('drum-pads');

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

        // ドラムパッドイベント
        this.initDrumPads();
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

    initDrumPads() {
        // ドラムパッドの各パッドにイベントを追加
        // touchstart/mousedownを使用してタップした瞬間に音が鳴るようにする
        document.querySelectorAll('.drum-pad').forEach(pad => {
            // タッチデバイス用: touchstartで即座に反応（複数同時タップ対応）
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault(); // ゴーストクリックを防止
                this.playDrumPad(pad);
            }, { passive: false });

            // デスクトップ用: mousedownで即座に反応
            pad.addEventListener('mousedown', (e) => {
                this.playDrumPad(pad);
            });
        });
    }

    playDrumPad(pad) {
        const drumType = pad.dataset.drum;
        if (!drumType) return;

        // ドラム音を再生
        audioEngine.playDrum(drumType);

        // ビジュアルフィードバック
        pad.classList.add('playing');
        setTimeout(() => pad.classList.remove('playing'), 150);

        // ドラム楽器でゲーム中の場合、回答をチェック
        if (this.instrument === 'drum' && this.drumIsPlaying) {
            this.checkDrumAnswer(drumType);
        }
    }

    playBassPosition(position) {
        const note = position.dataset.note;
        if (!note) return;

        // ベース音を再生
        audioEngine.playBassNote(note);

        // ビジュアルフィードバック
        position.classList.add('playing');
        setTimeout(() => position.classList.remove('playing'), 300);

        // ベース楽器でゲーム中の場合、回答をチェック
        if (this.instrument === 'bass' && this.bassIsPlaying) {
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
        // availableChordsになくても、chordDefinitionsに定義があればメジャーコードを返す
        if (audioEngine.chordDefinitions[noteName]) {
            return noteName;
        }
        return null;
    }
    
    selectInstrument(instrument) {
        this.instrument = instrument;
        document.querySelectorAll('.instrument-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.instrument === instrument);
        });

        // ベース選択時は難易度説明を更新
        this.updateDifficultyDescriptions();
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

        if (this.instrument === 'drum') {
            easyDesc.textContent = '8ビート・BPM80';
            mediumDesc.textContent = 'ロック・BPM100・フルパターン';
            hardDesc.textContent = 'ファンク・BPM120・フルパターン';
        } else if (this.instrument === 'bass') {
            easyDesc.textContent = '4コード・BPM80';
            mediumDesc.textContent = '6コード・BPM100';
            hardDesc.textContent = '8コード・BPM120';
        } else if (this.gameMode === 'chord') {
            easyDesc.textContent = 'メジャーコード';
            mediumDesc.textContent = '+マイナー';
            hardDesc.textContent = '+セブンス';
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

        // ドラムモードの初期化
        this.drumIsPlaying = false;
        this.drumUserInputs = [];

        if (this.instrument === 'drum') {
            // ドラム楽器選択時
            this.setupDrumMode();
        } else if (this.instrument === 'bass') {
            // ベース楽器選択時
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
            this.setupBassMode();
        } else if (this.gameMode === 'chord') {
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
        } else {
            // ギターの場合は指板に存在する音のみを使用
            if (this.instrument === 'guitar') {
                this.availableNotes = audioEngine.getGuitarNotesByDifficulty(this.difficulty);
            } else {
                this.availableNotes = audioEngine.getNotesByDifficulty(this.difficulty);
            }
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

    setupDrumMode() {
        // 難易度に応じた設定
        switch (this.difficulty) {
            case 'easy':
                this.drumPatternName = 'basic8';
                this.drumBpm = 80;
                this.drumMeasures = 2;
                break;
            case 'medium':
                this.drumPatternName = 'rock';
                this.drumBpm = 100;
                this.drumMeasures = 2;
                break;
            case 'hard':
                this.drumPatternName = 'funk';
                this.drumBpm = 120;
                this.drumMeasures = 2;
                break;
        }
        this.drumPattern = audioEngine.getDrumPattern(this.drumPatternName);
    }
    

    
    updateInstrumentVisual() {
        // ドラム楽器の場合
        if (this.instrument === 'drum') {
            this.pianoKeyboard.classList.add('hidden');
            this.guitarFretboard.classList.add('hidden');
            this.bassModeUI.classList.add('hidden');
            this.drumModeUI.classList.remove('hidden');
            return;
        }

        // ベース楽器の場合
        if (this.instrument === 'bass') {
            this.pianoKeyboard.classList.add('hidden');
            this.guitarFretboard.classList.add('hidden');
            this.drumModeUI.classList.add('hidden');
            this.bassModeUI.classList.remove('hidden');
            return;
        }

        // ピアノかギターかでビジュアルを切り替え
        this.bassModeUI.classList.add('hidden');
        this.drumModeUI.classList.add('hidden');
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

        // ドラム楽器では回答ボタンを非表示
        if (this.instrument === 'drum') {
            answerSection.classList.add('hidden');
            return;
        }

        // ベース楽器では回答ボタンを非表示
        if (this.instrument === 'bass') {
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
            // ドラム楽器の場合はパターン再生を停止
            if (this.instrument === 'drum') {
                this.stopDrumMode();
            }
            // ベース楽器の場合はメトロノームを停止
            if (this.instrument === 'bass') {
                audioEngine.stopMetronome();
                this.bassIsPlaying = false;
            }
            this.showResults();
            return;
        }

        // ドラム楽器の場合
        if (this.instrument === 'drum') {
            this.setupDrumQuestion();
            this.updateDrumUI();
            document.getElementById('current-score').textContent = this.score;
            document.getElementById('current-streak').textContent = this.streak;
            document.getElementById('question-number').textContent = `${this.questionNumber}/${this.totalQuestions}`;
            document.getElementById('hint-text').textContent = 'スタートを押してリズムに合わせてドラムを叩こう！';
            return;
        }

        // ベース楽器の場合
        if (this.instrument === 'bass') {
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
        if (this.instrument === 'drum') {
            this.startDrumMode();
        } else if (this.instrument === 'bass') {
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

        // 各コードを1回ずつ再生
        const chordInterval = 500; // コード間の間隔（ms）

        this.currentChordsSequence.forEach((chord, chordIndex) => {
            setTimeout(() => {
                audioEngine.playChord(chord, this.instrument);
                // 最初のコードのみビジュアル表示
                if (chordIndex === 0) {
                    this.animateChord(chord);
                }
            }, chordIndex * chordInterval);
        });

        // 再生ボタンのアニメーションを終了
        const totalDuration = this.currentChordsSequence.length * chordInterval + 500;
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

    // ========== ドラムモード関連 ==========

    setupDrumQuestion() {
        // ドラムパターンを設定
        this.drumPattern = audioEngine.getDrumPattern(this.drumPatternName);
        this.drumUserInputs = [];
        this.drumBeatCount = 0;
        this.drumExpectedBeats = [];
        this.drumCorrectHits = 0;

        // 中級以上ではフルパターン演奏（ハイハットも含む）
        this.drumFullPattern = (this.difficulty === 'medium' || this.difficulty === 'hard');

        // 期待される入力タイミングを生成
        const pattern = this.drumPattern;
        const totalBeats = pattern.beats * this.drumMeasures;

        for (let beat = 0; beat < totalBeats; beat++) {
            const patternBeat = beat % pattern.beats;
            if (pattern.kick[patternBeat]) {
                this.drumExpectedBeats.push({ beat, type: 'kick' });
            }
            if (pattern.snare[patternBeat]) {
                this.drumExpectedBeats.push({ beat, type: 'snare' });
            }
            // 中級以上ではハイハットも対象
            if (this.drumFullPattern && pattern.hihat[patternBeat]) {
                this.drumExpectedBeats.push({ beat, type: 'hihat' });
            }
        }

        // リアルタイムヒットカウンターを初期化
        this.updateDrumHitCounter();

        // 判定表示をクリア
        const judgmentEl = document.getElementById('drum-judgment');
        if (judgmentEl) {
            judgmentEl.innerHTML = '';
        }
    }

    updateDrumUI() {
        // 現在のパターン名を表示
        const patternNameEl = document.getElementById('current-pattern-name');
        if (patternNameEl && this.drumPattern) {
            patternNameEl.textContent = this.drumPattern.name;
        }

        // BPM表示
        const bpmEl = document.getElementById('drum-bpm-display');
        if (bpmEl) {
            bpmEl.textContent = `BPM: ${this.drumBpm}`;
        }

        // ビートインジケーターを更新
        const beatIndicator = document.getElementById('drum-beat-indicator');
        if (beatIndicator && this.drumPattern) {
            const beatsInMeasure = this.drumPattern.beats;
            const beatDots = beatIndicator.querySelectorAll('.drum-beat-dot');
            const currentBeatInPattern = this.drumBeatCount % beatsInMeasure;

            beatDots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentBeatInPattern);
            });
        }

        // 進行状況を表示
        const progressEl = document.getElementById('drum-progress');
        if (progressEl && this.drumPattern) {
            const totalBeats = this.drumPattern.beats * this.drumMeasures;
            progressEl.textContent = `${Math.min(this.drumBeatCount + 1, totalBeats)} / ${totalBeats}`;
        }
    }

    startDrumMode() {
        if (this.drumIsPlaying) {
            // 既に再生中なら停止
            this.stopDrumMode();
            return;
        }

        this.hasPlayed = true;
        this.drumIsPlaying = true;
        this.drumBeatCount = 0;
        this.drumUserInputs = [];
        this.drumPreviewPhase = true;
        this.drumPreviewCount = 0;

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');
        playBtn.querySelector('.play-text').textContent = '停止';

        document.getElementById('hint-text').textContent = 'お手本を聴いてください...';

        // パターンに合わせてドラムを自動再生
        const pattern = this.drumPattern;
        const beatInterval = (60 / this.drumBpm) * 1000 / (pattern.beats === 16 ? 2 : 1); // 16ビートの場合は倍速

        const tick = () => {
            if (!this.drumIsPlaying) return;

            const patternBeat = this.drumBeatCount % pattern.beats;

            if (this.drumPreviewPhase) {
                // プレビューフェーズ: すべてのドラム音を自動再生
                if (pattern.hihat[patternBeat]) {
                    audioEngine.playHihat(false);
                }
                if (pattern.kick[patternBeat]) {
                    audioEngine.playKick();
                }
                if (pattern.snare[patternBeat]) {
                    audioEngine.playSnare();
                }

                // ビートインジケーター更新
                this.updateDrumUI();

                this.drumBeatCount++;

                // 1周完了チェック
                if (this.drumBeatCount % pattern.beats === 0) {
                    this.drumPreviewCount++;

                    // 2周終了でプレビューフェーズ終了
                    if (this.drumPreviewCount >= 2) {
                        this.drumPreviewPhase = false;
                        this.drumBeatCount = 0;
                        this.drumCorrectHits = 0;
                        this.updateDrumHitCounter();
                        if (this.drumFullPattern) {
                            document.getElementById('hint-text').textContent = 'パターンを演奏しよう！';
                        } else {
                            document.getElementById('hint-text').textContent = 'リズムに合わせてドラムを叩こう！';
                        }
                    }
                }
            } else {
                // 入力フェーズ
                // 初級: ハイハットのみ自動再生（ガイド用）
                // 中級以上: 全ドラムをユーザーが演奏（自動再生なし）
                if (!this.drumFullPattern && pattern.hihat[patternBeat]) {
                    audioEngine.playHihat(false);
                }

                // ビートインジケーター更新
                this.updateDrumUI();

                this.drumBeatCount++;

                // 全ビート終了
                const totalBeats = pattern.beats * this.drumMeasures;
                if (this.drumBeatCount >= totalBeats) {
                    this.stopDrumMode();
                    this.evaluateDrumPerformance();
                    return;
                }
            }
        };

        tick(); // 最初のビート
        this.drumInterval = setInterval(tick, beatInterval);
    }

    stopDrumMode() {
        if (this.drumInterval) {
            clearInterval(this.drumInterval);
            this.drumInterval = null;
        }
        this.drumIsPlaying = false;
        this.drumPreviewPhase = false;
        this.drumPreviewCount = 0;

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-text').textContent = '音を聴く';

        // ビートインジケーターをリセット（activeと判定マーク両方）
        document.querySelectorAll('.drum-beat-dot').forEach(dot => {
            dot.classList.remove('active', 'hit-correct', 'hit-wrong');
        });
    }

    checkDrumAnswer(drumType) {
        // プレビューフェーズ中は判定しない（音だけ鳴らす）
        if (this.drumPreviewPhase) {
            return;
        }

        // 現在のビートでの入力を記録
        const tolerance = 1; // ビートの許容範囲

        // 入力を記録
        this.drumUserInputs.push({
            beat: this.drumBeatCount,
            type: drumType,
            timestamp: Date.now()
        });

        // 対応するビートパッドをハイライト
        const pad = document.querySelector(`.drum-pad[data-drum="${drumType}"]`);
        const flashOverlay = document.getElementById('drum-flash-overlay');

        if (pad) {
            // 期待されるビートと一致するかチェック
            const expectedAtBeat = this.drumExpectedBeats.filter(
                e => Math.abs(e.beat - this.drumBeatCount) <= tolerance && e.type === drumType
            );

            // タイミングの精度を計算（判定用）
            let timingDiff = tolerance + 1;
            if (expectedAtBeat.length > 0) {
                timingDiff = Math.min(...expectedAtBeat.map(e => Math.abs(e.beat - this.drumBeatCount)));
            }

            if (expectedAtBeat.length > 0) {
                // 正解時のフィードバック
                this.drumCorrectHits++;

                // パッドのアニメーション
                pad.classList.remove('correct', 'wrong');
                void pad.offsetWidth; // リフローを強制してアニメーションをリセット
                pad.classList.add('correct');
                setTimeout(() => pad.classList.remove('correct'), 400);

                // 画面フラッシュ効果
                if (flashOverlay) {
                    flashOverlay.classList.remove('flash-correct', 'flash-wrong');
                    void flashOverlay.offsetWidth;
                    flashOverlay.classList.add('flash-correct');
                    setTimeout(() => flashOverlay.classList.remove('flash-correct'), 300);
                }

                // 判定テキスト表示
                let judgmentText, judgmentClass;
                if (timingDiff === 0) {
                    judgmentText = 'PERFECT!';
                    judgmentClass = 'perfect';
                } else if (timingDiff <= 0.5) {
                    judgmentText = 'GREAT!';
                    judgmentClass = 'great';
                } else {
                    judgmentText = 'GOOD';
                    judgmentClass = 'good';
                }
                this.showDrumJudgment(judgmentText, judgmentClass);

                // ビートインジケーターに正解マーク
                this.markBeatIndicator(this.drumBeatCount, true);
            } else {
                // 不正解時のフィードバック
                pad.classList.remove('correct', 'wrong');
                void pad.offsetWidth;
                pad.classList.add('wrong');
                setTimeout(() => pad.classList.remove('wrong'), 400);

                // 画面フラッシュ効果（不正解）
                if (flashOverlay) {
                    flashOverlay.classList.remove('flash-correct', 'flash-wrong');
                    void flashOverlay.offsetWidth;
                    flashOverlay.classList.add('flash-wrong');
                    setTimeout(() => flashOverlay.classList.remove('flash-wrong'), 300);
                }

                // 判定テキスト表示
                this.showDrumJudgment('MISS', 'miss');

                // ビートインジケーターに不正解マーク
                this.markBeatIndicator(this.drumBeatCount, false);
            }

            // ヒットカウンターを更新
            this.updateDrumHitCounter();
        }
    }

    // 判定テキストを表示
    showDrumJudgment(text, className) {
        const judgmentEl = document.getElementById('drum-judgment');
        if (!judgmentEl) return;

        // 前のタイムアウトをクリア
        if (this.drumJudgmentTimeout) {
            clearTimeout(this.drumJudgmentTimeout);
        }

        // 新しい判定を表示
        judgmentEl.innerHTML = `<span class="judgment-text ${className}">${text}</span>`;

        // 一定時間後にフェードアウト
        this.drumJudgmentTimeout = setTimeout(() => {
            judgmentEl.innerHTML = '';
        }, 800);
    }

    // ヒットカウンターを更新
    updateDrumHitCounter() {
        const hitCountEl = document.getElementById('drum-hit-count');
        const hitTotalEl = document.getElementById('drum-hit-total');

        if (hitCountEl) {
            hitCountEl.textContent = this.drumCorrectHits;
            // パルスアニメーション
            hitCountEl.classList.remove('pulse');
            void hitCountEl.offsetWidth;
            hitCountEl.classList.add('pulse');
        }

        if (hitTotalEl) {
            hitTotalEl.textContent = this.drumExpectedBeats.length;
        }
    }

    // ビートインジケーターにマークを付ける
    markBeatIndicator(beat, isCorrect) {
        const pattern = this.drumPattern;
        if (!pattern) return;

        const beatInPattern = beat % pattern.beats;
        const beatDot = document.querySelector(`.drum-beat-dot[data-beat="${beatInPattern}"]`);

        if (beatDot) {
            beatDot.classList.remove('hit-correct', 'hit-wrong');
            if (isCorrect) {
                beatDot.classList.add('hit-correct');
            } else {
                beatDot.classList.add('hit-wrong');
            }
        }
    }

    evaluateDrumPerformance() {
        // 期待されるビートに対してユーザーが正しく入力したかチェック
        const tolerance = 1;
        let correctHits = 0;

        this.drumExpectedBeats.forEach(expected => {
            const matchingInput = this.drumUserInputs.find(
                input => Math.abs(input.beat - expected.beat) <= tolerance && input.type === expected.type
            );
            if (matchingInput) {
                correctHits++;
            }
        });

        const totalExpected = this.drumExpectedBeats.length;
        const percentage = totalExpected > 0 ? (correctHits / totalExpected) * 100 : 0;

        // スコア計算
        const baseScore = correctHits * 15;
        const streakBonus = this.streak * 10;
        const difficultyBonus = this.difficulty === 'hard' ? 50 : this.difficulty === 'medium' ? 25 : 0;
        const roundScore = baseScore + streakBonus + difficultyBonus;

        // 70%以上正解で成功
        const isSuccess = percentage >= 70;

        if (isSuccess) {
            this.correctCount++;
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            this.score += roundScore;
            this.showFeedback(true, null);
        } else {
            this.streak = 0;
            this.score += Math.floor(roundScore * 0.3); // 部分点
            this.showFeedback(false, `${correctHits}/${totalExpected}ヒット`);
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

                this.showFeedback(false, expectedChord, this.currentChordsSequence);
                this.streak = 0;
                this.sequenceLength = 3; // シーケンス長を3にリセット

                setTimeout(() => this.nextQuestion(), 2000);
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

                this.showFeedback(false, expectedNote, this.currentNotesSequence);
                this.streak = 0;
                this.sequenceLength = 3; // シーケンス長を3にリセット

                setTimeout(() => this.nextQuestion(), 2000);
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
    
    showFeedback(isCorrect, correctAnswer, fullSequence = null) {
        const feedback = document.getElementById('feedback-display');
        const icon = document.getElementById('feedback-icon');
        const text = document.getElementById('feedback-text');

        icon.className = 'feedback-icon ' + (isCorrect ? 'correct' : 'wrong');
        icon.textContent = isCorrect ? '✓' : '✗';

        if (isCorrect) {
            text.textContent = '正解！';
        } else if (fullSequence && fullSequence.length > 1) {
            // 連続問題で不正解の場合、全シーケンスを表示
            let sequenceText;
            if (this.gameMode === 'chord') {
                sequenceText = fullSequence.join(' → ');
            } else {
                sequenceText = fullSequence.map(note => {
                    const noteName = note.replace(/[0-9]/g, '');
                    return audioEngine.getNoteNameJP(noteName);
                }).join(' → ');
            }
            text.textContent = `正解: ${sequenceText}`;
        } else if (this.instrument === 'bass') {
            // ベース楽器の場合
            text.textContent = correctAnswer;
        } else if (this.gameMode === 'chord') {
            text.textContent = `正解は ${correctAnswer}`;
        } else {
            text.textContent = `正解は ${audioEngine.getNoteNameJP(correctAnswer)}`;
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
        // ドラムモードの場合はパターン再生を停止
        if (this.drumIsPlaying) {
            this.stopDrumMode();
        }

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
