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
        this.isBassGuideActive = false; // ガイド表示フラグ
        this.bassUserInputs = []; // ユーザーの入力履歴
        this.bassExpectedRoots = []; // 期待されるルート音
        this.pressedChordTimeout = null; // 押した音のコードハイライト用タイマー

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
        this.drumNoteElements = []; // キャッシュされたドラムノート要素

        // マラカスモード用
        this.maracasBpm = 100;
        this.maracasIsPlaying = false;
        this.maracasLastBeatTime = 0;
        this.maracasBeatCount = 0;
        this.maracasDurationBeats = 32; // セッションの長さ
        this.maracasStats = { count: 0, sumAbsDiff: 0 };
        this.maracasModeUI = document.getElementById('maracas-mode-ui');
        this.customBpm = 100;
        this.tapTempoHistory = [];

        // ギターモディファイア
        this.isMinorActive = false;
        this.isSeventhActive = false;

        // ピアノ・ギターガイド
        this.isPianoGuideActive = false;
        this.isGuitarGuideActive = false;

        this.beatDots = null;

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
        this.maracasModeUI = document.getElementById('maracas-mode-ui');
        this.metronomeRod = document.getElementById('metronome-rod');

        // ボタンイベント
        // 楽器選択イベント (プルダウン)
        const instrumentSelect = document.getElementById('instrument-select');
        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', (e) => this.selectInstrument(e.target.value));
        }
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectMode(btn.dataset.mode));
        });
        
        // BPM設定の同期
        const bpmSlider = document.getElementById('bpm-slider');
        const bpmInput = document.getElementById('bpm-input');

        if (bpmSlider && bpmInput) {
            bpmSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                bpmInput.value = val;
                this.customBpm = val;
                // ゲーム中にBPM変更を即時反映したい場合はここに処理を追加
                if (this.maracasIsPlaying && this.gameMode === 'unlimited') {
                    this.updateMaracasBpm(val);
                }
            });

            bpmInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value);
                if (val < 40) val = 40;
                if (val > 240) val = 240;
                e.target.value = val;
                bpmSlider.value = val;
                this.customBpm = val;
                if (this.maracasIsPlaying && this.gameMode === 'unlimited') {
                    this.updateMaracasBpm(val);
                }
            });
        }

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
        this.initPianoGuide();

        // ギター弦イベント
        this.initGuitarStrings();
        this.initGuitarGuide();

        // ベースフレットボードイベント
        this.initBassFretboard();

        // ドラムパッドイベント
        this.initDrumPads();

        // マラカスパッドイベント
        this.initMaracasPad();

        // 初期表示のために楽器選択を実行
        this.selectInstrument(this.instrument);
    }
    
    initMaracasPad() {
        const pad = document.getElementById('maracas-pad');
        if (!pad) return;

        const handleInput = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.handleMaracasInput();
        };

        pad.addEventListener('touchstart', handleInput, { passive: false });
        pad.addEventListener('mousedown', handleInput);
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

    initPianoGuide() {
        const guideToggle = document.getElementById('piano-guide-checkbox');
        if (guideToggle) {
            guideToggle.addEventListener('change', (e) => {
                this.isPianoGuideActive = e.target.checked;
                this.updatePianoGuide();
            });
        }
    }
    
    initGuitarStrings() {
        // 各フレットポジションにイベントを追加
        document.querySelectorAll('.fret-position').forEach(position => {
            position.addEventListener('click', () => this.playFretPosition(position));
        });

        // モディファイアボタンのイベントリスナー
        const minorBtn = document.getElementById('btn-minor');
        const seventhBtn = document.getElementById('btn-seventh');

        if (minorBtn) {
            minorBtn.addEventListener('click', () => {
                this.isMinorActive = !this.isMinorActive;
                minorBtn.classList.toggle('active', this.isMinorActive);
            });
        }

        if (seventhBtn) {
            seventhBtn.addEventListener('click', () => {
                this.isSeventhActive = !this.isSeventhActive;
                seventhBtn.classList.toggle('active', this.isSeventhActive);
            });
        }
    }

    initGuitarGuide() {
        const guideToggle = document.getElementById('guitar-guide-checkbox');
        if (guideToggle) {
            guideToggle.addEventListener('change', (e) => {
                this.isGuitarGuideActive = e.target.checked;
                this.updateGuitarGuide();
            });
        }
    }

    initBassFretboard() {
        // ベースフレットボードの各ポジションにイベントを追加
        document.querySelectorAll('.bass-fret-position').forEach(position => {
            position.addEventListener('click', () => this.playBassPosition(position));
        });

        // ガイド切り替えスイッチ
        const guideToggle = document.getElementById('bass-guide-checkbox');
        if (guideToggle) {
            guideToggle.addEventListener('change', (e) => {
                this.isBassGuideActive = e.target.checked;
                this.updateBassGuide();
            });
        }

        this.beatDots = document.querySelectorAll('.beat-dot');
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
            // スケールガイド表示時は、押した音のコード構成音をハイライト
            if (this.isBassGuideActive) {
                this.highlightPressedNoteChord(note);
            }
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
            // コードモード：音名とモディファイアからコードを構築して再生
            const noteName = note.replace(/[0-9]/g, '');

            // モディファイアボタンの状態を反映
            let targetChord = noteName;
            if (this.isMinorActive) targetChord += 'm';
            if (this.isSeventhActive) targetChord += '7';

            // モディファイアが何も押されていない場合は、従来通り推測ロジックを使用する（オプション）
            // しかし、ボタンがある以上、ユーザーの明示的な操作を優先するのが自然。
            // ボタンなし＝メジャーコードとして扱う

            audioEngine.playChord(targetChord, 'guitar');
            this.animateChord(targetChord);
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

        // プルダウンの値を同期（プログラムからの変更用）
        const instrumentSelect = document.getElementById('instrument-select');
        if (instrumentSelect && instrumentSelect.value !== instrument) {
            instrumentSelect.value = instrument;
        }

        // モードボタンの表示切り替え
        const singleBtn = document.getElementById('btn-single');
        const chordBtn = document.getElementById('btn-chord');
        const challengeBtn = document.getElementById('btn-challenge');
        const unlimitedBtn = document.getElementById('btn-unlimited');

        // モード選択グループ全体（タイトル含む）
        const modeGroup = document.querySelector('.mode-selector')?.parentElement;

        if (instrument === 'maracas') {
            // マラカスの場合：チャレンジ/エンドレスを表示
            if(modeGroup) modeGroup.classList.remove('hidden');
            if(singleBtn) singleBtn.classList.add('hidden');
            if(chordBtn) chordBtn.classList.add('hidden');
            if(challengeBtn) challengeBtn.classList.remove('hidden');
            if(unlimitedBtn) unlimitedBtn.classList.remove('hidden');

            // デフォルトモードを設定（現在のモードが無効な場合）
            if (this.gameMode === 'single' || this.gameMode === 'chord') {
                this.selectMode('challenge');
            } else {
                // 既存の選択を維持しつつUI更新
                this.selectMode(this.gameMode);
            }
        } else {
            // その他の楽器：チャレンジ/エンドレスを非表示
            // 音当てモード統一のため、単音/コードボタンも非表示にする
            // 結果として全てのボタンが消えるため、グループごと非表示にする
            if(modeGroup) modeGroup.classList.add('hidden');

            if(singleBtn) singleBtn.classList.add('hidden');
            if(chordBtn) chordBtn.classList.add('hidden');
            if(challengeBtn) challengeBtn.classList.add('hidden');
            if(unlimitedBtn) unlimitedBtn.classList.add('hidden');

            // ドラムやベースもモード選択は本来無効だが、とりあえずデフォルトに戻す
            if (this.gameMode === 'challenge' || this.gameMode === 'unlimited') {
                this.selectMode('single');
            } else {
                 this.selectMode(this.gameMode);
            }
        }

        // 難易度説明を更新
        this.updateDifficultyDescriptions();
    }
    
    selectMode(mode) {
        this.gameMode = mode;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // エンドレスモードの場合、難易度選択を隠してBPM設定を表示
        const bpmSettings = document.getElementById('bpm-settings');
        const difficultySelector = document.querySelector('.difficulty-selector').parentElement; // 親のselection-groupを取得

        if (mode === 'unlimited') {
            if(bpmSettings) bpmSettings.classList.remove('hidden');
            if(difficultySelector) difficultySelector.classList.add('hidden');
        } else {
            if(bpmSettings) bpmSettings.classList.add('hidden');
            if(difficultySelector) difficultySelector.classList.remove('hidden');
        }
        
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
        } else if (this.instrument === 'maracas') {
            if (this.gameMode === 'unlimited') {
                // エンドレスモードの場合は難易度選択は隠れるが、念のため
                easyDesc.textContent = '-';
                mediumDesc.textContent = '-';
                hardDesc.textContent = '-';
            } else {
                easyDesc.textContent = 'BPM 80・16拍';
                mediumDesc.textContent = 'BPM 100・32拍';
                hardDesc.textContent = 'BPM 120・48拍';
            }
        } else if (this.instrument === 'bass') {
            // ベースは常に単音モード
            easyDesc.textContent = '単音 (E1 - G2)';
            mediumDesc.textContent = '単音 (E1 - C3)';
            hardDesc.textContent = '単音 (全音域)';
        } else {
            // ピアノ・ギター（上級はコードモード）
            easyDesc.textContent = '単音 (ド〜ソ)';
            mediumDesc.textContent = '単音 (2オクターブ)';
            hardDesc.textContent = 'コード (和音当て)';
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
        this.totalQuestions = 5; // 全5問に変更

        // モードの自動設定（難易度連動）
        if (this.instrument === 'piano' || this.instrument === 'guitar') {
            if (this.difficulty === 'hard') {
                this.gameMode = 'chord';
            } else {
                this.gameMode = 'single';
            }
        } else if (this.instrument === 'bass') {
            // ベースは音当て（単音）モードのみ
            this.gameMode = 'single';
        }

        // ベースモードの初期化
        this.bassIsPlaying = false;
        this.bassUserInputs = [];

        // ドラムモードの初期化
        this.drumIsPlaying = false;
        this.drumUserInputs = [];

        // マラカスモードの初期化
        this.maracasIsPlaying = false;

        if (this.instrument === 'drum') {
            // ドラム楽器選択時
            this.setupDrumMode();
        } else if (this.instrument === 'maracas') {
            // マラカス楽器選択時
            this.setupMaracasMode();
        } else if (this.instrument === 'bass' && this.gameMode === 'chord') {
            // ベース楽器（コードモード＝ルート弾きゲーム）
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
            this.setupBassMode();
        } else if (this.instrument === 'bass' && this.gameMode === 'single') {
            // ベース楽器（単音モード）
            this.availableNotes = audioEngine.getBassNotesByDifficulty(this.difficulty);
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

    setupMaracasMode() {
        if (this.gameMode === 'unlimited') {
            this.maracasBpm = this.customBpm;
            this.maracasDurationBeats = Infinity;
        } else {
            switch (this.difficulty) {
                case 'easy':
                    this.maracasBpm = 80;
                    this.maracasDurationBeats = 16;
                    break;
                case 'medium':
                    this.maracasBpm = 100;
                    this.maracasDurationBeats = 32;
                    break;
                case 'hard':
                    this.maracasBpm = 120;
                    this.maracasDurationBeats = 48;
                    break;
            }
        }
    }

    updateMaracasBpm(newBpm) {
        this.maracasBpm = newBpm;

        // UI更新
        document.getElementById('maracas-target-bpm').textContent = this.maracasBpm;
        const headerBpmEl = document.getElementById('header-bpm-display');
        if (headerBpmEl) headerBpmEl.textContent = this.maracasBpm;

        if (this.metronomeRod) {
            const intervalSec = 60 / this.maracasBpm;
            this.metronomeRod.style.transitionDuration = `${intervalSec}s`;
        }

        // 再生中ならメトロノームを再起動（ビートカウントはリセットされるが許容）
        if (this.maracasIsPlaying) {
            audioEngine.startMetronome(this.maracasBpm, (beatCount, isAccent) => {
                this.onMaracasBeat(beatCount);
            }, 1);
        }
    }
    
    updateInstrumentVisual() {
        // ドラムヘッダー表示の切り替え関数
        const toggleDrumHeader = (show) => {
            const patternItem = document.getElementById('pattern-display-item');
            if (patternItem) patternItem.classList.toggle('hidden', !show);
        };

        const toggleBpmHeader = (show) => {
            const bpmItem = document.getElementById('header-bpm-item');
            if (bpmItem) bpmItem.classList.toggle('hidden', !show);
        };

        // UIを一旦すべて非表示
        this.pianoKeyboard.classList.add('hidden');
        this.guitarFretboard.classList.add('hidden');
        this.bassModeUI.classList.add('hidden');
        this.drumModeUI.classList.add('hidden');
        this.maracasModeUI.classList.add('hidden');
        toggleDrumHeader(false);
        toggleBpmHeader(false);

        if (this.instrument === 'drum') {
            this.drumModeUI.classList.remove('hidden');
            toggleDrumHeader(true);
            toggleBpmHeader(true);
        } else if (this.instrument === 'maracas') {
            this.maracasModeUI.classList.remove('hidden');
            toggleBpmHeader(true);
        } else if (this.instrument === 'bass') {
            this.bassModeUI.classList.remove('hidden');
        } else if (this.instrument === 'piano') {
            this.pianoKeyboard.classList.remove('hidden');
            this.updateBlackKeysVisibility();
            this.updatePianoGuide();
        } else {
            // guitar
            this.guitarFretboard.classList.remove('hidden');
            this.updateGuitarGuide();
        }
    }
    
    updateBlackKeysVisibility() {
        // 初級・中級でも黒鍵を表示（ユーザー要望により常時表示）
        // 元のロジック: const showBlackKeys = this.gameMode === 'chord' || this.difficulty === 'hard';
        const showBlackKeys = true;
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

        // ドラム・ベース（コードモード）・マラカス楽器では回答ボタンを非表示
        // ベースの単音モードは回答ボタンを表示する
        if (this.instrument === 'drum' || this.instrument === 'maracas' || (this.instrument === 'bass' && this.gameMode === 'chord')) {
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
            // マラカス楽器の場合は停止
            if (this.instrument === 'maracas') {
                this.stopMaracasMode();
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

        // マラカス楽器の場合
        if (this.instrument === 'maracas') {
            this.setupMaracasQuestion();
            if (this.gameMode === 'unlimited') {
                document.getElementById('current-score').textContent = '-';
                document.getElementById('current-streak').textContent = '-';
                document.getElementById('question-number').textContent = '∞';
                document.getElementById('hint-text').textContent = 'スタートを押してエンドレスプレイ！';
            } else {
                document.getElementById('current-score').textContent = this.score;
                document.getElementById('current-streak').textContent = this.streak;
                document.getElementById('question-number').textContent = `${this.questionNumber}/${this.totalQuestions}`;
                document.getElementById('hint-text').textContent = 'スタートを押してBPMに合わせて振ろう！';
            }
            return;
        }

        // ベース楽器（コードモード）の場合
        if (this.instrument === 'bass' && this.gameMode === 'chord') {
            this.setupBassQuestion();
            this.updateBassUI();
            document.getElementById('current-score').textContent = this.score;
            document.getElementById('current-streak').textContent = this.streak;
            document.getElementById('question-number').textContent = `${this.questionNumber}/${this.totalQuestions}`;
            document.getElementById('hint-text').textContent = 'スタートを押してコードに合わせてルート音を弾こう！';
            return;
        }

        // 進行度に応じた難易度調整（プール制限）
        let currentPool;
        if (this.gameMode === 'chord') {
            // コードモード
            currentPool = [...this.availableChords];
            if (this.questionNumber <= 3) {
                // 1-3問目: メジャーコードのみに制限
                currentPool = currentPool.filter(c => !c.includes('m') && !c.includes('7'));
            }
            // 4-5問目はフルセット（マイナー・7th含む）
        } else {
            // 単音モード
            currentPool = [...this.availableNotes];
            if (this.questionNumber <= 3) {
                // 1-3問目: 範囲を制限
                if (this.difficulty === 'easy') {
                    // 初級前半: ド〜ソ (C4-G4)
                    const easySubset = ['C4', 'D4', 'E4', 'F4', 'G4'];
                    currentPool = currentPool.filter(n => easySubset.includes(n));
                } else if (this.difficulty === 'medium') {
                    // 中級前半: 1オクターブ (C4-C5)
                    // availableNotesはC3-C5なので、C4以上のみ残す
                    currentPool = currentPool.filter(n => {
                        const octave = parseInt(n.slice(-1));
                        return octave >= 4;
                    });
                }
            }
            // 4-5問目はフルセット
        }

        // プールが空にならないようにガード（念のため）
        if (currentPool.length === 0) {
            currentPool = this.gameMode === 'chord' ? this.availableChords : this.availableNotes;
        }

        if (this.gameMode === 'chord') {
            // コードモード：連続コードのシーケンス生成
            this.currentChordsSequence = [];

            // ルートコードをランダムに選択（シーケンスの最初に入れる）
            const rootIndex = Math.floor(Math.random() * currentPool.length);
            this.rootChord = currentPool[rootIndex];
            this.currentChordsSequence.push(this.rootChord);

            // 残りのコードを生成
            for (let i = 1; i < this.sequenceLength; i++) {
                const randomIndex = Math.floor(Math.random() * currentPool.length);
                this.currentChordsSequence.push(currentPool[randomIndex]);
            }

            // 後方互換性のため、最初のコードをcurrentChordにも設定
            this.currentChord = this.currentChordsSequence[0];
        } else {
            // 単音モード：連続音のシーケンス生成
            this.currentNotesSequence = [];
            
            // 1音目はランダムに選択
            const firstIndex = Math.floor(Math.random() * currentPool.length);
            const firstNote = currentPool[firstIndex];
            this.currentNotesSequence.push(firstNote);
            
            // 2音目以降は、1音目をルートとしたメジャースケール上の音から選択
            if (this.sequenceLength > 1) {
                // 1音目をルートとするスケール音を取得（プールに関わらず、音楽的に正しいスケール音から選ぶか、プール内に制限するか？）
                // ここではプール内（難易度制限内）から選ぶのが適切
                const scaleNotes = audioEngine.getMajorScaleNotes(firstNote, currentPool);
                
                // スケール音がプール内にない場合（稀なケース）、プール全体から選ぶ
                const candidates = scaleNotes.length > 0 ? scaleNotes : currentPool;

                for (let i = 1; i < this.sequenceLength; i++) {
                    // スケール内の音からランダムに選択
                    const randomIndex = Math.floor(Math.random() * candidates.length);
                    this.currentNotesSequence.push(candidates[randomIndex]);
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
        } else if (this.instrument === 'maracas') {
            this.startMaracasMode();
        } else if (this.instrument === 'bass' && this.gameMode === 'chord') {
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

    updatePianoGuide() {
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.classList.remove('scale-guide');
        });

        if (!this.isPianoGuideActive) return;

        // Cメジャースケールを表示
        const scaleNotes = audioEngine.getScaleNotes('C', 'major');

        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            const note = key.dataset.note;
            if (!note) return;
            const noteName = note.replace(/[0-9]/g, '');

            if (scaleNotes.includes(noteName)) {
                key.classList.add('scale-guide');
            }
        });
    }

    updateGuitarGuide() {
        document.querySelectorAll('.fret-position').forEach(pos => {
            pos.classList.remove('scale-guide');
        });

        if (!this.isGuitarGuideActive) return;

        // Cメジャースケールを表示
        const scaleNotes = audioEngine.getScaleNotes('C', 'major');

        document.querySelectorAll('.fret-position').forEach(pos => {
            const note = pos.dataset.note;
            if (!note) return;
            const noteName = note.replace(/[0-9]/g, '');

            if (scaleNotes.includes(noteName)) {
                pos.classList.add('scale-guide');
            }
        });
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
        if (this.beatDots) {
            this.beatDots.forEach((dot, index) => {
                dot.classList.toggle('active', index < this.bassBeatCount % this.bassBeatsPerChord);
            });
        }
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

        this.updateBassGuide();

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
        if (this.beatDots) {
            this.beatDots.forEach(dot => {
                dot.classList.remove('active');
            });
        }
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
        this.updateBassGuide();

        // ビートインジケーターを更新
        const beatInChord = beatCount % this.bassBeatsPerChord;
        if (this.beatDots) {
            this.beatDots.forEach((dot, index) => {
                dot.classList.toggle('active', index === beatInChord);
            });
        }

        // 1拍目でコードを鳴らす
        if (isAccent || beatCount % this.bassBeatsPerChord === 0) {
            const currentChord = this.bassChordProgression[this.bassCurrentChordIndex];
            if (currentChord) {
                audioEngine.playChord(currentChord, 'guitar');
            }
        }
    }

    updateBassGuide() {
        // 全てのガイドをクリア
        document.querySelectorAll('.bass-fret-position').forEach(pos => {
            pos.classList.remove('scale-guide', 'root-guide', 'chord-tone-guide');
        });

        if (!this.isBassGuideActive || !this.bassIsPlaying) return;

        // 現在のコードを取得
        const currentChord = this.bassChordProgression[this.bassCurrentChordIndex];
        if (!currentChord) return;

        // コード情報解析
        const rootName = audioEngine.getChordRoot(currentChord);

        // スケール表示: 常にCメジャー（ユーザー要望）
        const scaleRoot = 'C';
        const scaleType = 'major';
        const scaleNotes = audioEngine.getScaleNotes(scaleRoot, scaleType);

        // 構成音（コードトーン）を取得
        const chordNotesWithOctave = audioEngine.getChordNotes(currentChord);
        const chordToneNames = chordNotesWithOctave.map(note => note.replace(/[0-9]/g, ''));

        // 指板を走査してハイライト
        document.querySelectorAll('.bass-fret-position').forEach(pos => {
            const note = pos.dataset.note; // 例: "G2"
            if (!note) return;
            const noteName = note.replace(/[0-9]/g, '');

            // 優先順位: ルート > 構成音 > スケール
            if (noteName === rootName) {
                pos.classList.add('root-guide');
            } else if (chordToneNames.includes(noteName)) {
                pos.classList.add('chord-tone-guide');
            } else if (scaleNotes.includes(noteName)) {
                pos.classList.add('scale-guide');
            }
        });
    }

    // 押した音のコード構成音をハイライト
    highlightPressedNoteChord(note) {
        // 音名を取得（オクターブ除去）
        const noteName = note.replace(/[0-9]/g, '');

        // 現在のスケールコンテキスト（Cメジャー固定）
        const scaleRoot = 'C';
        const scaleType = 'major';
        const scaleNotes = audioEngine.getScaleNotes(scaleRoot, scaleType);

        let chordToneNames = [];

        // スケールに含まれているかチェック
        const scaleIndex = scaleNotes.indexOf(noteName);

        if (scaleIndex !== -1) {
            // スケール内の音：ダイアトニックコード（1度、3度、5度）を計算
            // インデックスは 0-6
            const rootIndex = scaleIndex;
            const thirdIndex = (scaleIndex + 2) % 7;
            const fifthIndex = (scaleIndex + 4) % 7;

            chordToneNames = [
                scaleNotes[rootIndex],
                scaleNotes[thirdIndex],
                scaleNotes[fifthIndex]
            ];
        } else {
            // スケール外の音：その音をルートとするメジャーコードを表示
            // スケール外の音のメジャースケールを取得して、1, 3, 5度を抽出
            const targetScaleNotes = audioEngine.getScaleNotes(noteName, 'major');
            if (targetScaleNotes.length > 0) {
                chordToneNames = [
                    targetScaleNotes[0],
                    targetScaleNotes[2],
                    targetScaleNotes[4]
                ];
            }
        }

        // 既存のハイライトをクリア
        document.querySelectorAll('.bass-fret-position').forEach(pos => {
            pos.classList.remove('pressed-chord-guide');
        });

        // タイマーをクリア
        if (this.pressedChordTimeout) {
            clearTimeout(this.pressedChordTimeout);
            this.pressedChordTimeout = null;
        }

        // 新しいハイライトを適用
        document.querySelectorAll('.bass-fret-position').forEach(pos => {
            const posNote = pos.dataset.note;
            if (!posNote) return;
            const posNoteName = posNote.replace(/[0-9]/g, '');

            if (chordToneNames.includes(posNoteName)) {
                pos.classList.add('pressed-chord-guide');
            }
        });

        // 一定時間後に消去
        this.pressedChordTimeout = setTimeout(() => {
            document.querySelectorAll('.bass-fret-position').forEach(pos => {
                pos.classList.remove('pressed-chord-guide');
            });
            this.pressedChordTimeout = null;
        }, 500);
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
        this.drumHitBeats = new Set(); // ヒット済みのビートを追跡

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

        // リズムレーンにノートを生成
        this.initDrumLaneNotes();

        // 判定表示をクリア
        const judgmentEl = document.getElementById('drum-judgment');
        if (judgmentEl) {
            judgmentEl.innerHTML = '';
        }
    }

    // リズムレーンにノートを生成
    initDrumLaneNotes() {
        const lanes = {
            hihat: document.getElementById('hihat-lane-notes'),
            snare: document.getElementById('snare-lane-notes'),
            kick: document.getElementById('kick-lane-notes')
        };

        // キャッシュをクリア
        this.drumNoteElements = [];

        // 各レーンをクリア
        Object.values(lanes).forEach(lane => {
            if (lane) lane.innerHTML = '';
        });

        // 期待されるビートごとにノートを生成
        this.drumExpectedBeats.forEach((expected, index) => {
            const lane = lanes[expected.type];
            if (!lane) return;

            const note = document.createElement('div');
            note.className = `drum-note ${expected.type}`;
            note.dataset.beat = expected.beat;
            note.dataset.index = index;
            lane.appendChild(note);
            this.drumNoteElements.push(note);
        });
    }

    updateDrumUI() {
        // 現在のパターン名を表示
        const patternNameEl = document.getElementById('current-pattern-name');
        if (patternNameEl && this.drumPattern) {
            patternNameEl.textContent = this.drumPattern.name;
        }

        // BPM表示
        const bpmEl = document.getElementById('header-bpm-display');
        if (bpmEl) {
            bpmEl.textContent = this.drumBpm;
        }

        // リズムレーンのノート位置を更新
        this.updateDrumLaneNotes();
    }

    // リズムレーンのノート位置を更新
    updateDrumLaneNotes() {
        const rhythmLane = document.getElementById('drum-rhythm-lane');
        if (!rhythmLane) return;

        // プレビューフェーズの表示切り替え
        rhythmLane.classList.toggle('preview', this.drumPreviewPhase);

        const pattern = this.drumPattern;
        if (!pattern) return;

        const totalBeats = pattern.beats * this.drumMeasures;
        const currentBeat = this.drumBeatCount;

        // レーンの幅（判定ライン位置を考慮）
        const visibleBeats = 8; // 表示するビート数

        // 判定ラインとレーンの位置関係を取得（動的に計算）
        const judgmentLine = rhythmLane.querySelector('.drum-judgment-line');
        const lanes = rhythmLane.querySelectorAll('.drum-lane');

        // 要素が正しく取得できない場合は処理中断
        if (!judgmentLine || lanes.length === 0) return;

        const firstLane = lanes[0];

        // 判定ラインの相対位置（レーン内でのX座標）を計算
        // 親要素のパディングなどを考慮するため、offsetLeftの差分を使用
        const judgmentLineX = judgmentLine.offsetLeft;
        const laneStartX = firstLane.offsetLeft;
        const effectiveJudgmentPos = judgmentLineX - laneStartX;

        const laneWidth = firstLane.offsetWidth;

        // 全ノートの位置を更新
        const notes = this.drumNoteElements;
        notes.forEach(note => {
            const noteBeat = parseInt(note.dataset.beat);
            const noteIndex = parseInt(note.dataset.index);
            const noteWidth = note.offsetWidth || 30; // 実際の幅を使用（取得できなければデフォルト30px）

            // 現在のビートからの相対位置を計算
            const beatDiff = noteBeat - currentBeat;

            // ノートの位置を計算
            // 目標位置（hit時）: ノートの中心が判定ラインと重なる位置
            const targetLeft = effectiveJudgmentPos - (noteWidth / 2);

            // 開始位置（右側）: レーンの右端から出現
            const startLeft = laneWidth - noteWidth;

            const totalDistance = startLeft - targetLeft;
            const positionRatio = beatDiff / visibleBeats;

            // 位置を補間計算
            const leftPos = targetLeft + totalDistance * positionRatio;

            note.style.left = `${leftPos}px`;

            // 次に打つべきノートを強調
            const isNextNote = beatDiff >= 0 && beatDiff <= 1 && !this.drumHitBeats.has(noteIndex);
            note.classList.toggle('next-note', isNextNote && !this.drumPreviewPhase);

            // 画面外のノートを非表示
            if (beatDiff < -1 || beatDiff > visibleBeats) {
                note.style.opacity = '0';
            } else {
                note.style.opacity = note.classList.contains('hit') ? '0.3' : '1';
            }
        });
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
                        this.drumHitBeats = new Set(); // ヒット状態をリセット
                        // ノートのヒット状態をリセット
                        this.drumNoteElements.forEach(note => {
                            note.classList.remove('hit');
                        });
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

        // リズムレーンのプレビュー状態をリセット
        const rhythmLane = document.getElementById('drum-rhythm-lane');
        if (rhythmLane) {
            rhythmLane.classList.remove('preview');
        }
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
            // 期待されるビートと一致するかチェック（まだヒットしていないもののみ）
            const expectedAtBeat = this.drumExpectedBeats.filter(
                (e, idx) => Math.abs(e.beat - this.drumBeatCount) <= tolerance &&
                           e.type === drumType &&
                           !this.drumHitBeats.has(idx)
            );

            // タイミングの精度を計算（判定用）
            let timingDiff = tolerance + 1;
            let matchedIndex = -1;
            if (expectedAtBeat.length > 0) {
                const minDiff = Math.min(...expectedAtBeat.map(e => Math.abs(e.beat - this.drumBeatCount)));
                timingDiff = minDiff;
                // マッチしたノートのインデックスを取得
                const matchedExpected = expectedAtBeat.find(e => Math.abs(e.beat - this.drumBeatCount) === minDiff);
                if (matchedExpected) {
                    matchedIndex = this.drumExpectedBeats.indexOf(matchedExpected);
                }
            }

            // ユーザー入力マーカーを表示
            const isCorrect = expectedAtBeat.length > 0;
            this.showDrumInputMarker(drumType, isCorrect);

            if (expectedAtBeat.length > 0) {
                // 正解時のフィードバック
                this.drumCorrectHits++;

                // ヒット済みとしてマーク
                if (matchedIndex >= 0) {
                    this.drumHitBeats.add(matchedIndex);
                    this.markNoteAsHit(matchedIndex);
                }

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
            }
        }
    }

    // ユーザー入力マーカーを表示
    showDrumInputMarker(drumType, isCorrect) {
        const laneNotes = document.getElementById(`${drumType}-lane-notes`);
        if (!laneNotes) return;

        const rhythmLane = document.getElementById('drum-rhythm-lane');
        if (!rhythmLane) return;

        // 判定ラインの位置を動的に取得
        const judgmentLine = rhythmLane.querySelector('.drum-judgment-line');
        const lane = rhythmLane.querySelector('.drum-lane');
        if (!judgmentLine || !lane) return;

        // レーン内での判定ライン位置
        const effectiveJudgmentPos = judgmentLine.offsetLeft - lane.offsetLeft;

        const marker = document.createElement('div');
        marker.className = `drum-input-marker ${isCorrect ? 'correct' : 'wrong'}`;

        // マーカーを追加してから幅を取得（またはCSSの変数を参照）
        // 追加前はoffsetWidthが0になる可能性があるため、一度追加してから位置調整する、あるいは推測する
        // ここではCSS依存を減らすため、追加後に位置を設定
        laneNotes.appendChild(marker);

        const markerWidth = marker.offsetWidth || 24;
        // マーカーの中心を判定ラインに合わせる
        marker.style.left = `${effectiveJudgmentPos - markerWidth / 2}px`;

        // アニメーション後に削除
        setTimeout(() => marker.remove(), 500);
    }

    // ノートをヒット済みとしてマーク
    markNoteAsHit(noteIndex) {
        const note = this.drumNoteElements[noteIndex];
        if (note) {
            note.classList.add('hit');
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

    // ========== マラカスモード関連 ==========

    setupMaracasQuestion() {
        this.maracasStats = { count: 0, sumAbsDiff: 0, maxDiff: 0, correctCount: 0 };
        document.getElementById('maracas-target-bpm').textContent = this.maracasBpm;
        const headerBpmEl = document.getElementById('header-bpm-display');
        if (headerBpmEl) {
            headerBpmEl.textContent = this.maracasBpm;
        }
        document.getElementById('maracas-deviation-value').textContent = 'READY';

        // メーターリセット
        const indicator = document.getElementById('deviation-indicator');
        if (indicator) {
            indicator.style.left = '50%';
            indicator.style.backgroundColor = 'transparent';
        }
    }

    startMaracasMode() {
        if (this.maracasIsPlaying) {
            this.stopMaracasMode();
            return;
        }

        this.hasPlayed = true;
        this.maracasIsPlaying = true;
        this.maracasBeatCount = 0;
        this.maracasStats = { count: 0, sumAbsDiff: 0, maxDiff: 0, correctCount: 0 };

        // メトロノームビジュアルの初期化
        if (this.metronomeRod) {
            const intervalSec = 60 / this.maracasBpm;
            this.metronomeRod.style.transitionDuration = `${intervalSec}s`;
            // 左からスタートするために初期状態を設定
            this.metronomeRod.classList.remove('swing-right');
            this.metronomeRod.classList.add('swing-left');
        }

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');
        playBtn.querySelector('.play-text').textContent = '停止';

        document.getElementById('hint-text').textContent = 'ビートに合わせてシェイク！';
        document.getElementById('maracas-deviation-value').textContent = 'GO!';

        // メトロノーム開始 (4分音符)
        audioEngine.startMetronome(this.maracasBpm, (beatCount, isAccent) => {
            this.onMaracasBeat(beatCount);
        }, 1);
    }

    stopMaracasMode() {
        audioEngine.stopMetronome();
        this.maracasIsPlaying = false;

        // メトロノームビジュアルのリセット
        if (this.metronomeRod) {
            this.metronomeRod.style.transitionDuration = '0.3s';
            this.metronomeRod.classList.remove('swing-left', 'swing-right');
        }

        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.remove('playing');
        playBtn.querySelector('.play-text').textContent = '音を聴く';
    }

    onMaracasBeat(beatCount) {
        this.maracasLastBeatTime = Date.now();
        this.maracasBeatCount = beatCount;

        // メトロノームアニメーション更新
        if (this.metronomeRod) {
            const isMovingRight = beatCount % 2 === 0;
            if (isMovingRight) {
                this.metronomeRod.classList.remove('swing-left');
                this.metronomeRod.classList.add('swing-right');
                this.flashGuide('left');
            } else {
                this.metronomeRod.classList.remove('swing-right');
                this.metronomeRod.classList.add('swing-left');
                this.flashGuide('right');
            }
        }

        // セッション終了チェック
        if (beatCount >= this.maracasDurationBeats) {
            this.stopMaracasMode();
            this.evaluateMaracasPerformance();
        }
    }

    flashGuide(side) {
        const guide = document.querySelector(`.metronome-guide.${side}`);
        if (guide) {
            guide.classList.remove('guide-flash');
            void guide.offsetWidth; // Trigger reflow
            guide.classList.add('guide-flash');
        }
    }

    handleMaracasInput() {
        // 音とアニメーション
        audioEngine.playMaracas();
        const pad = document.getElementById('maracas-pad');
        if (pad) {
            pad.classList.remove('shake');
            void pad.offsetWidth;
            pad.classList.add('shake');
        }

        if (!this.maracasIsPlaying) {
            this.calculateTapTempo();
            return;
        }

        const now = Date.now();
        const interval = 60000 / this.maracasBpm;

        // 直近のビートからのズレを計算
        // maracasLastBeatTimeは「最後に鳴ったクリック」の時間
        // 次のクリックまでの時間は interval
        // 経過時間
        const elapsedSinceLast = now - this.maracasLastBeatTime;

        let diff;
        // 半分以上過ぎていれば「次のビートに対して早い」とみなす
        if (elapsedSinceLast > interval / 2) {
            diff = elapsedSinceLast - interval; // マイナス値（早い）
        } else {
            diff = elapsedSinceLast; // プラス値（遅い）
        }

        // 記録と表示
        this.maracasStats.count++;
        this.maracasStats.sumAbsDiff += Math.abs(diff);
        this.maracasStats.maxDiff = Math.max(this.maracasStats.maxDiff, Math.abs(diff));

        // 許容範囲判定 (±50ms Great, ±100ms Good)
        if (Math.abs(diff) <= 100) {
            this.maracasStats.correctCount++;
        }

        this.showMaracasFeedback(diff);
    }

    calculateTapTempo() {
        const now = Date.now();

        // Reset if too long since last tap (2 seconds)
        if (this.tapTempoHistory.length > 0 && now - this.tapTempoHistory[this.tapTempoHistory.length - 1] > 2000) {
            this.tapTempoHistory = [];
        }

        this.tapTempoHistory.push(now);

        // Keep last 5 taps (4 intervals)
        if (this.tapTempoHistory.length > 5) {
            this.tapTempoHistory.shift();
        }

        // Calculate BPM if we have at least 2 taps
        if (this.tapTempoHistory.length >= 2) {
            let totalDiff = 0;
            for(let i = 1; i < this.tapTempoHistory.length; i++) {
                totalDiff += this.tapTempoHistory[i] - this.tapTempoHistory[i-1];
            }
            const avgDiff = totalDiff / (this.tapTempoHistory.length - 1);
            let bpm = Math.round(60000 / avgDiff);

            // Clamp to allowed range
            bpm = Math.max(40, Math.min(240, bpm));

            // Update State & UI
            this.customBpm = bpm;

            const bpmSlider = document.getElementById('bpm-slider');
            const bpmInput = document.getElementById('bpm-input');
            if (bpmSlider) bpmSlider.value = bpm;
            if (bpmInput) bpmInput.value = bpm;

            this.updateMaracasBpm(bpm);

            // Show feedback in deviation display
            const valEl = document.getElementById('maracas-deviation-value');
            if (valEl) {
                valEl.textContent = `BPM: ${bpm}`;
                valEl.style.color = '#fff';
            }
        }
    }

    showMaracasFeedback(diff) {
        const valEl = document.getElementById('maracas-deviation-value');
        const indicator = document.getElementById('deviation-indicator');

        // 表示更新
        const sign = diff > 0 ? '+' : '';
        valEl.textContent = `${sign}${Math.round(diff)} ms`;

        // 色分け
        let color = '#f45c43'; // Bad
        if (Math.abs(diff) <= 30) color = '#38ef7d'; // Perfect
        else if (Math.abs(diff) <= 80) color = '#feca57'; // Good

        valEl.style.color = color;

        // メーター移動
        // 範囲 ±150ms を ±50% にマッピング
        // diff=0 -> 50%
        // diff=-150 -> 0%
        // diff=+150 -> 100%
        let percent = 50 + (diff / 300) * 100;
        percent = Math.max(0, Math.min(100, percent));

        if (indicator) {
            indicator.style.left = `${percent}%`;
            indicator.style.backgroundColor = color;
            indicator.classList.remove('show');
            void indicator.offsetWidth;
            indicator.classList.add('show');
        }
    }

    evaluateMaracasPerformance() {
        const totalBeats = this.maracasDurationBeats;
        // スコア計算: 平均ズレが小さいほど高得点
        const avgDiff = this.maracasStats.count > 0 ? this.maracasStats.sumAbsDiff / this.maracasStats.count : 1000;

        // 正解率判定（入力数不足は減点対象とすべきだが、簡易的に精度で判定）
        // ただし、極端に少ない入力で高精度を防ぐため、拍数の80%以上は叩いていること
        const inputCoverage = (this.maracasStats.count / totalBeats) * 100;

        let isSuccess = false;
        if (inputCoverage >= 80 && avgDiff <= 80) {
            isSuccess = true;
        }

        const baseScore = isSuccess ? 1000 : 0;
        // 精度ボーナス: 誤差0msで1000点、100msで0点
        const accuracyScore = Math.max(0, 100 - avgDiff) * 10;

        const roundScore = Math.round(baseScore + accuracyScore);

        if (isSuccess) {
            this.correctCount++;
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            this.score += roundScore;
            this.showFeedback(true, null);
        } else {
            this.streak = 0;
            this.score += Math.floor(roundScore * 0.3);
            this.showFeedback(false, `平均ズレ: ${Math.round(avgDiff)}ms`);
        }

        document.getElementById('current-score').textContent = this.score;
        document.getElementById('current-streak').textContent = this.streak;

        setTimeout(() => this.nextQuestion(), 3000);
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

        // マラカスモードの場合は停止
        if (this.maracasIsPlaying) {
            this.stopMaracasMode();
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
