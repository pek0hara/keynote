/**
 * 音感マスター - ゲームロジック
 */

class Game {
    constructor() {
        this.instrument = 'piano';
        this.difficulty = 'easy';
        this.gameMode = 'single'; // 'single' または 'chord'
        this.currentNote = null;
        this.currentChord = null; // コードモード用
        this.currentNotesSequence = []; // 単音モード：連続音のシーケンス
        this.userAnswerSequence = []; // ユーザーの回答シーケンス
        this.sequenceLength = 1; // 現在のシーケンスの長さ（1から開始）
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.questionNumber = 0;
        this.totalQuestions = 10;
        this.correctCount = 0;
        this.availableNotes = [];
        this.availableChords = []; // コードモード用
        this.hasPlayed = false;
        
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
    
    playKeyNote(key) {
        const note = key.dataset.note;
        if (!note) return;
        
        // 音を再生
        audioEngine.playNote(note, 'piano');
        
        // ビジュアルフィードバック
        key.classList.add('playing');
        setTimeout(() => key.classList.remove('playing'), 300);
    }
    
    playFretPosition(position) {
        const note = position.dataset.note;
        if (!note) return;
        
        // 音を再生
        audioEngine.playNote(note, 'guitar');
        
        // ビジュアルフィードバック
        position.classList.add('playing');
        setTimeout(() => position.classList.remove('playing'), 500);
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
        this.sequenceLength = 1; // シーケンス長を1にリセット
        
        if (this.gameMode === 'chord') {
            this.availableChords = audioEngine.getChordsByDifficulty(this.difficulty);
        } else {
            this.availableNotes = audioEngine.getNotesByDifficulty(this.difficulty);
        }
        
        this.updateInstrumentVisual();
        this.generateAnswerButtons();
        this.showScreen('game');
        this.nextQuestion();
    }
    

    
    updateInstrumentVisual() {
        // ピアノかギターかでビジュアルを切り替え
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
        // 上級モード以外は黒鍵を非表示
        const showBlackKeys = this.difficulty === 'hard';
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
        grid.innerHTML = '';
        
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
        
        if (this.questionNumber > this.totalQuestions) {
            this.showResults();
            return;
        }
        
        if (this.gameMode === 'chord') {
            // ランダムなコードを選択
            const randomIndex = Math.floor(Math.random() * this.availableChords.length);
            this.currentChord = this.availableChords[randomIndex];
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
        if (this.gameMode === 'single' && this.sequenceLength > 1) {
            document.getElementById('hint-text').textContent = `${this.sequenceLength}音を順番に当ててください`;
        } else {
            document.getElementById('hint-text').textContent = 'ボタンを押して音を聴いてください';
        }
        
        document.getElementById('feedback-display').classList.add('hidden');
        
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
        if (this.gameMode === 'chord') {
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
        
        // シーケンスの音を順番に再生
        this.currentNotesSequence.forEach((note, index) => {
            setTimeout(() => {
                audioEngine.playNote(note, this.instrument);
                this.animateNote(note);
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
        if (!this.currentChord) return;
        
        this.hasPlayed = true;
        audioEngine.playChord(this.currentChord, this.instrument);
        
        const playBtn = document.getElementById('play-sound-btn');
        playBtn.classList.add('playing');
        setTimeout(() => playBtn.classList.remove('playing'), 1500);
        
        // 楽器ビジュアルのアニメーション（コード用）
        this.animateCurrentChord();
        
        document.getElementById('hint-text').textContent = 'コードを聴いたら下のボタンで回答！';
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
            // ギターの場合：対応するフレットポジションをハイライト
            const positions = document.querySelectorAll(`.fret-position[data-note="${note}"]`);
            positions.forEach(position => {
                position.classList.add('playing');
                setTimeout(() => position.classList.remove('playing'), 500);
            });
        }
    }
    
    animateCurrentChord() {
        const notes = audioEngine.getChordNotes(this.currentChord);
        
        notes.forEach((note, index) => {
            setTimeout(() => {
                if (this.instrument === 'piano') {
                    const key = document.querySelector(`[data-note="${note}"]`);
                    if (key && (key.classList.contains('white-key') || key.classList.contains('black-key'))) {
                        key.classList.add('playing');
                        setTimeout(() => key.classList.remove('playing'), 600);
                    }
                } else {
                    const positions = document.querySelectorAll(`.fret-position[data-note="${note}"]`);
                    positions.forEach(position => {
                        position.classList.add('playing');
                        setTimeout(() => position.classList.remove('playing'), 600);
                    });
                }
            }, index * 50);
        });
    }
    
    checkAnswer(selected) {
        if (!this.hasPlayed) {
            document.getElementById('hint-text').textContent = '⚠️ まず音を聴いてください！';
            return;
        }
        
        if (this.gameMode === 'chord') {
            // コードモードの処理（従来通り）
            const correctAnswer = this.currentChord;
            const isCorrect = selected === correctAnswer;
            
            // ボタンの状態を更新
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.disabled = true;
                if (btn.dataset.chord === correctAnswer) {
                    btn.classList.add('correct');
                } else if (btn.dataset.chord === selected && !isCorrect) {
                    btn.classList.add('wrong');
                }
            });
            
            // フィードバック表示
            this.showFeedback(isCorrect, correctAnswer);
            
            // スコア更新
            if (isCorrect) {
                this.correctCount++;
                this.streak++;
                this.maxStreak = Math.max(this.maxStreak, this.streak);
                this.score += 100 + (this.streak * 10);
            } else {
                this.streak = 0;
            }
            
            // 次の問題へ
            setTimeout(() => this.nextQuestion(), 1500);
            
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
                this.sequenceLength = 1; // シーケンス長を1にリセット
                
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
