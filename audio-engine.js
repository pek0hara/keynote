/**
 * 音感マスター - オーディオエンジン
 * Web Audio APIを使用してピアノとギターの音を生成
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.listenersAttached = false;
        this.iosUnlocked = false;

        // メトロノーム関連
        this.metronomeInterval = null;
        this.metronomeBpm = 100;
        this.metronomeCallback = null;

        // キャッシュ用バッファ
        this.snareBuffer = null;
        this.maracasBuffer = null;

        // ドラムパターン定義
        this.drumPatterns = {
            // 基本的な8ビートパターン
            'basic8': {
                name: '8ビート',
                beats: 8,
                kick:   [1, 0, 0, 0, 1, 0, 0, 0], // キック
                snare:  [0, 0, 1, 0, 0, 0, 1, 0], // スネア
                hihat:  [1, 1, 1, 1, 1, 1, 1, 1]  // ハイハット
            },
            // 基本的な16ビートパターン
            'basic16': {
                name: '16ビート',
                beats: 16,
                kick:   [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                snare:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
                hihat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            // ロックビート
            'rock': {
                name: 'ロック',
                beats: 8,
                kick:   [1, 0, 0, 1, 1, 0, 0, 0],
                snare:  [0, 0, 1, 0, 0, 0, 1, 0],
                hihat:  [1, 1, 1, 1, 1, 1, 1, 1]
            },
            // ファンクビート
            'funk': {
                name: 'ファンク',
                beats: 16,
                kick:   [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
                snare:  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
                hihat:  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]
            }
        };

        // ギター指板で有効な音（0-5フレット: E3〜A4）
        this.guitarValidNotes = [
            'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
            'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4'
        ];

        // ベースモード用の低音周波数（E1-E3）
        this.bassNoteFrequencies = {
            'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00,
            'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
            'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78,
            'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00,
            'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
            'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
            'E3': 164.81
        };

        // 音階の周波数（A4 = 440Hz基準）
        this.noteFrequencies = {
            'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
            'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
            'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
            'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
            'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
            'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
            'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
            'C6': 1046.50
        };
        
        // 音名表記（ABC表記）
        this.noteNamesJP = {
            'C': 'C', 'C#': 'C♯', 'D': 'D', 'D#': 'D♯',
            'E': 'E', 'F': 'F', 'F#': 'F♯', 'G': 'G',
            'G#': 'G♯', 'A': 'A', 'A#': 'A♯', 'B': 'B'
        };
        
        // コード定義（構成音）
        this.chordDefinitions = {
            // メジャーコード
            'C': ['C4', 'E4', 'G4'],
            'C#': ['C#4', 'F4', 'G#4'],
            'D': ['D4', 'F#4', 'A4'],
            'D#': ['D#4', 'G4', 'A#4'],
            'E': ['E4', 'G#4', 'B4'],
            'F': ['F4', 'A4', 'C5'],
            'F#': ['F#4', 'A#4', 'C#5'],
            'G': ['G3', 'B3', 'D4'],
            'G#': ['G#3', 'C4', 'D#4'],
            'A': ['A3', 'C#4', 'E4'],
            'A#': ['A#3', 'D4', 'F4'],
            'B': ['B3', 'D#4', 'F#4'],
            // マイナーコード
            'Cm': ['C4', 'D#4', 'G4'],
            'Dm': ['D4', 'F4', 'A4'],
            'Em': ['E4', 'G4', 'B4'],
            'Fm': ['F4', 'G#4', 'C5'],
            'Gm': ['G3', 'A#3', 'D4'],
            'Am': ['A3', 'C4', 'E4'],
            'Bm': ['B3', 'D4', 'F#4'],
            // マイナーセブンスコード
            'Cm7': ['C4', 'D#4', 'G4', 'A#4'],
            'Dm7': ['D4', 'F4', 'A4', 'C5'],
            'Em7': ['E4', 'G4', 'B4', 'D5'],
            'Fm7': ['F4', 'G#4', 'C5', 'D#5'],
            'Gm7': ['G3', 'A#3', 'D4', 'F4'],
            'Am7': ['A3', 'C4', 'E4', 'G4'],
            'Bm7': ['B3', 'D4', 'F#4', 'A4'],
            'C#m7': ['C#4', 'E4', 'G#4', 'B4'],
            'D#m7': ['D#4', 'F#4', 'A#4', 'C#5'],
            'F#m7': ['F#4', 'A4', 'C#5', 'E5'],
            'G#m7': ['G#3', 'B3', 'D#4', 'F#4'],
            'A#m7': ['A#3', 'C#4', 'F4', 'G#4'],
            // セブンスコード
            'C7': ['C4', 'E4', 'G4', 'A#4'],
            'D7': ['D4', 'F#4', 'A4', 'C5'],
            'E7': ['E4', 'G#4', 'B4', 'D5'],
            'F7': ['F4', 'A4', 'C5', 'D#5'],
            'G7': ['G3', 'B3', 'D4', 'F4'],
            'A7': ['A3', 'C#4', 'E4', 'G4'],
            'B7': ['B3', 'D#4', 'F#4', 'A4']
        };
        
        // コード名の日本語表記
        this.chordNamesJP = {
            'C': 'Cメジャー', 'C#': 'C♯メジャー', 'D': 'Dメジャー', 'D#': 'D♯メジャー',
            'E': 'Eメジャー', 'F': 'Fメジャー', 'F#': 'F♯メジャー', 'G': 'Gメジャー',
            'G#': 'G♯メジャー', 'A': 'Aメジャー', 'A#': 'A♯メジャー', 'B': 'Bメジャー',
            'Cm': 'Cマイナー', 'Dm': 'Dマイナー', 'Em': 'Eマイナー',
            'Fm': 'Fマイナー', 'Gm': 'Gマイナー', 'Am': 'Aマイナー', 'Bm': 'Bマイナー',
            'Cm7': 'Cマイナーセブン', 'Dm7': 'Dマイナーセブン', 'Em7': 'Eマイナーセブン',
            'Fm7': 'Fマイナーセブン', 'Gm7': 'Gマイナーセブン', 'Am7': 'Aマイナーセブン', 'Bm7': 'Bマイナーセブン',
            'C#m7': 'C♯マイナーセブン', 'D#m7': 'D♯マイナーセブン', 'F#m7': 'F♯マイナーセブン',
            'G#m7': 'G♯マイナーセブン', 'A#m7': 'A♯マイナーセブン',
            'C7': 'Cセブン', 'D7': 'Dセブン', 'E7': 'Eセブン',
            'F7': 'Fセブン', 'G7': 'Gセブン', 'A7': 'Aセブン', 'B7': 'Bセブン'
        };

            // 楽曲定義（ベース楽曲モード用）
        this.songDefinitions = {
            'twinkle': {
                name: 'きらきら星',
                bpm: { easy: 70, medium: 90, hard: 110 },
                notes: [
                    // 1行目: ドドソソララソー
                    { note: 'C2', beats: 1 }, { note: 'C2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'A2', beats: 1 }, { note: 'A2', beats: 1 },
                    { note: 'G2', beats: 2 },
                    // 2行目: ファファミミレレドー
                    { note: 'F2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'D2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 2 },
                    // 3行目: ソソファファミミレー
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'F2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'D2', beats: 2 },
                    // 4行目: ソソファファミミレー
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'F2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'D2', beats: 2 },
                    // 5行目: ドドソソララソー
                    { note: 'C2', beats: 1 }, { note: 'C2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'A2', beats: 1 }, { note: 'A2', beats: 1 },
                    { note: 'G2', beats: 2 },
                    // 6行目: ファファミミレレドー
                    { note: 'F2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'D2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 2 }
                ],
                // 伴奏コード進行（小節ごと = 4拍ごと）
                chords: [
                    { chord: 'C', startBeat: 0 },
                    { chord: 'F', startBeat: 4 },
                    { chord: 'F', startBeat: 8 },
                    { chord: 'C', startBeat: 12 },
                    { chord: 'C', startBeat: 16 },
                    { chord: 'G', startBeat: 20 },
                    { chord: 'C', startBeat: 24 },
                    { chord: 'G', startBeat: 28 },
                    { chord: 'C', startBeat: 32 },
                    { chord: 'F', startBeat: 36 },
                    { chord: 'F', startBeat: 40 },
                    { chord: 'C', startBeat: 44 }
                ]
            },
            'kaeru': {
                name: 'かえるの合唱',
                bpm: { easy: 70, medium: 90, hard: 110 },
                notes: [
                    // ドレミファミレドー
                    { note: 'C2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 2 },
                    // ミファソラソファミー
                    { note: 'E2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'A2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'E2', beats: 2 },
                    // ドードー
                    { note: 'C2', beats: 2 }, { note: 'C2', beats: 2 },
                    // ドドレレミミファファ
                    { note: 'C2', beats: 1 }, { note: 'C2', beats: 1 },
                    { note: 'D2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'F2', beats: 1 }, { note: 'F2', beats: 1 },
                    // ミーレードー
                    { note: 'E2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 2 }
                ],
                chords: [
                    { chord: 'C', startBeat: 0 },
                    { chord: 'G', startBeat: 4 },
                    { chord: 'C', startBeat: 8 },
                    { chord: 'G', startBeat: 12 },
                    { chord: 'C', startBeat: 16 },
                    { chord: 'C', startBeat: 20 },
                    { chord: 'F', startBeat: 24 },
                    { chord: 'C', startBeat: 28 }
                ]
            },
            'choucho': {
                name: 'ちょうちょう',
                bpm: { easy: 70, medium: 90, hard: 110 },
                notes: [
                    // ソミミー ファレレー
                    { note: 'G2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'E2', beats: 2 },
                    { note: 'F2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'D2', beats: 2 },
                    // ドレミファソソソー
                    { note: 'C2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'F2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'G2', beats: 2 },
                    // ソミミー ファレレー
                    { note: 'G2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'E2', beats: 2 },
                    { note: 'F2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'D2', beats: 2 },
                    // ドミソソミーー
                    { note: 'C2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'G2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'E2', beats: 4 }
                ],
                chords: [
                    { chord: 'C', startBeat: 0 },
                    { chord: 'G', startBeat: 4 },
                    { chord: 'C', startBeat: 8 },
                    { chord: 'C', startBeat: 12 },
                    { chord: 'C', startBeat: 16 },
                    { chord: 'G', startBeat: 20 },
                    { chord: 'C', startBeat: 24 }
                ]
            },
            'mary': {
                name: 'メリーさんのひつじ',
                bpm: { easy: 70, medium: 90, hard: 110 },
                notes: [
                    // ミレドレミミミー
                    { note: 'E2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'E2', beats: 2 },
                    // レレレー ミソソー
                    { note: 'D2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'D2', beats: 2 },
                    { note: 'E2', beats: 1 }, { note: 'G2', beats: 1 },
                    { note: 'G2', beats: 2 },
                    // ミレドレミミミミ
                    { note: 'E2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'E2', beats: 1 },
                    // レレミレドーーー
                    { note: 'D2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'E2', beats: 1 }, { note: 'D2', beats: 1 },
                    { note: 'C2', beats: 4 }
                ],
                chords: [
                    { chord: 'C', startBeat: 0 },
                    { chord: 'C', startBeat: 4 },
                    { chord: 'G', startBeat: 8 },
                    { chord: 'C', startBeat: 12 },
                    { chord: 'C', startBeat: 16 },
                    { chord: 'C', startBeat: 20 },
                    { chord: 'G', startBeat: 24 },
                    { chord: 'C', startBeat: 28 }
                ]
            }
        };

    // ギターのコードフォーム（弦番号: フレット番号）
        // 弦番号: 1=1弦(最高音), 6=6弦(最低音)
        this.guitarChordForms = {
            // メジャーコード
            'C':  [{string: 1, fret: 0}, {string: 2, fret: 1}, {string: 3, fret: 0}, {string: 4, fret: 2}, {string: 5, fret: 3}],
            'C#': [{string: 1, fret: 1}, {string: 3, fret: 1}, {string: 5, fret: 4}],
            'D':  [{string: 1, fret: 2}, {string: 2, fret: 3}, {string: 3, fret: 2}, {string: 4, fret: 0}],
            'D#': [{string: 1, fret: 3}, {string: 3, fret: 3}, {string: 4, fret: 1}],
            'E':  [{string: 1, fret: 0}, {string: 2, fret: 0}, {string: 3, fret: 1}, {string: 4, fret: 2}, {string: 5, fret: 2}, {string: 6, fret: 0}],
            'F':  [{string: 1, fret: 1}, {string: 2, fret: 1}, {string: 3, fret: 2}, {string: 4, fret: 3}, {string: 5, fret: 3}, {string: 6, fret: 1}],
            'F#': [{string: 1, fret: 2}, {string: 2, fret: 2}, {string: 3, fret: 3}, {string: 4, fret: 4}, {string: 6, fret: 2}],
            'G':  [{string: 1, fret: 3}, {string: 2, fret: 0}, {string: 3, fret: 0}, {string: 4, fret: 0}, {string: 5, fret: 2}, {string: 6, fret: 3}],
            'G#': [{string: 1, fret: 4}, {string: 2, fret: 1}, {string: 4, fret: 1}, {string: 6, fret: 4}],
            'A':  [{string: 1, fret: 0}, {string: 2, fret: 2}, {string: 3, fret: 2}, {string: 4, fret: 2}, {string: 5, fret: 0}],
            'A#': [{string: 1, fret: 1}, {string: 2, fret: 3}, {string: 4, fret: 3}, {string: 5, fret: 1}],
            'B':  [{string: 1, fret: 2}, {string: 2, fret: 4}, {string: 3, fret: 4}, {string: 4, fret: 4}, {string: 5, fret: 2}],
            // マイナーコード
            'Cm': [{string: 1, fret: 3}, {string: 2, fret: 4}, {string: 3, fret: 5}, {string: 4, fret: 5}, {string: 5, fret: 3}],
            'Dm': [{string: 1, fret: 1}, {string: 2, fret: 3}, {string: 3, fret: 2}, {string: 4, fret: 0}],
            'Em': [{string: 1, fret: 0}, {string: 2, fret: 0}, {string: 3, fret: 0}, {string: 4, fret: 2}, {string: 5, fret: 2}, {string: 6, fret: 0}],
            'Fm': [{string: 1, fret: 1}, {string: 2, fret: 1}, {string: 3, fret: 1}, {string: 4, fret: 3}, {string: 5, fret: 3}, {string: 6, fret: 1}],
            'Gm': [{string: 1, fret: 3}, {string: 2, fret: 3}, {string: 3, fret: 3}, {string: 4, fret: 5}, {string: 5, fret: 5}, {string: 6, fret: 3}],
            'Am': [{string: 1, fret: 0}, {string: 2, fret: 1}, {string: 3, fret: 2}, {string: 4, fret: 2}, {string: 5, fret: 0}],
            'Bm': [{string: 1, fret: 2}, {string: 2, fret: 3}, {string: 3, fret: 4}, {string: 4, fret: 4}, {string: 5, fret: 2}],
            // マイナーセブンスコード
            'Cm7': [{string: 1, fret: 3}, {string: 2, fret: 4}, {string: 3, fret: 3}, {string: 4, fret: 5}, {string: 5, fret: 3}],
            'Dm7': [{string: 1, fret: 1}, {string: 2, fret: 1}, {string: 3, fret: 2}, {string: 4, fret: 0}],
            'Em7': [{string: 1, fret: 0}, {string: 2, fret: 3}, {string: 3, fret: 0}, {string: 4, fret: 2}, {string: 5, fret: 2}, {string: 6, fret: 0}],
            'Fm7': [{string: 1, fret: 1}, {string: 2, fret: 1}, {string: 3, fret: 1}, {string: 4, fret: 1}, {string: 5, fret: 3}, {string: 6, fret: 1}],
            'Gm7': [{string: 1, fret: 3}, {string: 2, fret: 3}, {string: 3, fret: 3}, {string: 4, fret: 3}, {string: 5, fret: 5}, {string: 6, fret: 3}],
            'Am7': [{string: 1, fret: 0}, {string: 2, fret: 1}, {string: 3, fret: 0}, {string: 4, fret: 2}, {string: 5, fret: 0}],
            'Bm7': [{string: 1, fret: 2}, {string: 2, fret: 3}, {string: 3, fret: 2}, {string: 4, fret: 4}, {string: 5, fret: 2}],
            'C#m7': [{string: 1, fret: 4}, {string: 2, fret: 5}, {string: 3, fret: 4}, {string: 4, fret: 6}, {string: 5, fret: 4}],
            'D#m7': [{string: 1, fret: 6}, {string: 2, fret: 7}, {string: 3, fret: 6}, {string: 4, fret: 8}, {string: 5, fret: 6}],
            'F#m7': [{string: 1, fret: 2}, {string: 2, fret: 2}, {string: 3, fret: 2}, {string: 4, fret: 2}, {string: 5, fret: 4}, {string: 6, fret: 2}],
            'G#m7': [{string: 1, fret: 4}, {string: 2, fret: 4}, {string: 3, fret: 4}, {string: 4, fret: 4}, {string: 5, fret: 6}, {string: 6, fret: 4}],
            'A#m7': [{string: 1, fret: 1}, {string: 2, fret: 2}, {string: 3, fret: 1}, {string: 4, fret: 3}, {string: 5, fret: 1}],
            // セブンスコード
            'C7': [{string: 1, fret: 0}, {string: 2, fret: 1}, {string: 3, fret: 3}, {string: 4, fret: 2}, {string: 5, fret: 3}],
            'D7': [{string: 1, fret: 2}, {string: 2, fret: 1}, {string: 3, fret: 2}, {string: 4, fret: 0}],
            'E7': [{string: 1, fret: 0}, {string: 2, fret: 0}, {string: 3, fret: 1}, {string: 4, fret: 0}, {string: 5, fret: 2}, {string: 6, fret: 0}],
            'F7': [{string: 1, fret: 1}, {string: 2, fret: 1}, {string: 3, fret: 2}, {string: 4, fret: 1}, {string: 5, fret: 3}, {string: 6, fret: 1}],
            'G7': [{string: 1, fret: 1}, {string: 2, fret: 0}, {string: 3, fret: 0}, {string: 4, fret: 0}, {string: 5, fret: 2}, {string: 6, fret: 3}],
            'A7': [{string: 1, fret: 0}, {string: 2, fret: 2}, {string: 3, fret: 0}, {string: 4, fret: 2}, {string: 5, fret: 0}],
            'B7': [{string: 1, fret: 2}, {string: 2, fret: 0}, {string: 3, fret: 2}, {string: 4, fret: 1}, {string: 5, fret: 2}]
        };
    }
    
    async initialize() {
        await this.createContext();
        this.setupListeners();
    }

    async createContext() {
        if (this.isInitialized && this.audioContext && this.audioContext.state !== 'closed') return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
        }
    }

    setupListeners() {
        if (this.listenersAttached) return;

        // ページがバックグラウンドから復帰した時に AudioContext を再開
        this.setupVisibilityChangeHandler();

        // ユーザー操作時に AudioContext を再開（バックグラウンド復帰対策）
        this.setupUserInteractionHandler();

        this.listenersAttached = true;
    }

    // ページ表示状態の変更を監視して AudioContext を再開
    setupVisibilityChangeHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (this.audioContext) {
                    this.ensureAudioContextRunning();
                }
            } else if (document.visibilityState === 'hidden') {
                // バックグラウンド時は明示的に suspend することで、
                // 復帰時に resume が確実に機能するようにする（ゾンビ状態の防止）
                if (this.audioContext && this.audioContext.state === 'running') {
                    this.audioContext.suspend().catch(err => console.warn('Failed to suspend AudioContext:', err));
                }
            }
        });
    }

    // ユーザー操作を監視して AudioContext を再開
    setupUserInteractionHandler() {
        const resumeAudio = async () => {
            // iOSのサイレントモード（マナーモード）でもスピーカーから音が出るようにするための対策
            // 初回のユーザー操作時に無音のHTML5 Audio要素を再生する
            if (!this.iosUnlocked) {
                this.iosUnlocked = true;
                const audio = new Audio();
                // 極めて短い無音のMP3データ
                audio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAAtAAAB5AAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
                audio.volume = 0.01;
                audio.play().catch(() => {});
            }

            await this.ensureAudioContextRunning();

            // Web Audio APIのロック解除用（特にiOS/Android）
            // 無音のオシレーターを一瞬再生することでオーディオエンジンを確実に起動する
            if (this.audioContext && this.audioContext.state === 'running') {
                try {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    gain.gain.value = 0; // 無音
                    osc.connect(gain).connect(this.audioContext.destination);
                    osc.start(0);
                    osc.stop(0.001);
                } catch (e) {
                    // エラーは無視（すでに破棄されている場合など）
                }
            }
        };

        const events = ['click', 'touchstart', 'touchend', 'keydown'];
        events.forEach(event => {
            document.addEventListener(event, resumeAudio, { passive: true });
        });
    }

    // AudioContext が running 状態であることを保証する
    async ensureAudioContextRunning() {
        // AudioContextがない、または閉じている場合は再初期化
        if (!this.audioContext || this.audioContext.state === 'closed') {
            await this.createContext();
            return;
        }

        // running以外ならresumeを試みる
        if (this.audioContext.state !== 'running') {
            try {
                await this.audioContext.resume();
            } catch (err) {
                console.warn('Failed to resume AudioContext:', err);
            }
        }
    }
    
    async playPiano(frequency, duration = 1.5) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frequency, now);
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const masterGain = this.audioContext.createGain();
        
        gain1.gain.setValueAtTime(0.5, now);
        gain2.gain.setValueAtTime(0.3, now);
        
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
        masterGain.gain.exponentialRampToValueAtTime(0.4, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc1.connect(gain1).connect(masterGain).connect(this.audioContext.destination);
        osc2.connect(gain2).connect(masterGain);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    async playGuitar(frequency, duration = 2) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + duration);

        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.5, now + 0.005);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter).connect(masterGain).connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    // ベース音を再生（低音に最適化）
    async playBass(frequency, duration = 1.5) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        // サイン波とトライアングル波を組み合わせて太い低音を生成
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frequency, now);

        // ローパスフィルターで高音をカット
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(1, now);

        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const masterGain = this.audioContext.createGain();

        gain1.gain.setValueAtTime(0.6, now);
        gain2.gain.setValueAtTime(0.3, now);

        // エンベロープ
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.7, now + 0.02);
        masterGain.gain.exponentialRampToValueAtTime(0.5, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(gain1).connect(filter).connect(masterGain).connect(this.audioContext.destination);
        osc2.connect(gain2).connect(filter);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    // メトロノームのクリック音
    async playMetronomeClick(isAccent = false) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1000 : 800, now);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(isAccent ? 0.3 : 0.2, now + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain).connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // メトロノーム開始
    startMetronome(bpm, callback, beatsPerMeasure = 4) {
        this.stopMetronome();
        this.metronomeBpm = bpm;
        this.metronomeCallback = callback;

        const interval = (60 / bpm) * 1000;
        let beatCount = 0;

        const tick = () => {
            const isAccent = beatCount % beatsPerMeasure === 0;
            this.playMetronomeClick(isAccent);
            if (this.metronomeCallback) {
                this.metronomeCallback(beatCount, isAccent);
            }
            beatCount++;
        };

        tick(); // 最初の拍を即座に再生
        this.metronomeInterval = setInterval(tick, interval);
    }

    // メトロノーム停止
    stopMetronome() {
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }
        this.metronomeCallback = null;
    }

    // ドラム音声生成 - キック（バスドラム）
    async playKick() {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        // オシレーターでキックのトーンを生成
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain).connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // ドラム音声生成 - スネア
    async playSnare() {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        // ノイズでスネアを生成（バッファをキャッシュして再利用）
        if (!this.snareBuffer) {
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            this.snareBuffer = buffer;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.snareBuffer;

        // ハイパスフィルターでスネアらしいサウンドに
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // トーン部分
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(filter).connect(gain).connect(this.audioContext.destination);
        osc.connect(oscGain).connect(this.audioContext.destination);

        noise.start(now);
        noise.stop(now + 0.2);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // ドラム音声生成 - ハイハット（クローズ）
    async playHihat(open = false) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        const duration = open ? 0.3 : 0.08;

        // ノイズでハイハットを生成
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        // バンドパスフィルターでハイハットらしいサウンドに
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(10000, now);
        filter.Q.setValueAtTime(1, now);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(open ? 0.4 : 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter).connect(gain).connect(this.audioContext.destination);
        noise.start(now);
        noise.stop(now + duration);
    }

    // ドラム音を再生（種類を指定）
    playDrum(type) {
        switch (type) {
            case 'kick':
                this.playKick();
                break;
            case 'snare':
                this.playSnare();
                break;
            case 'hihat':
                this.playHihat(false);
                break;
            case 'hihat-open':
                this.playHihat(true);
                break;
            case 'maracas':
                this.playMaracas();
                break;
        }
    }

    // マラカス音声生成
    async playMaracas() {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        // ノイズでマラカスを生成（バッファをキャッシュして再利用）
        if (!this.maracasBuffer) {
            const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1秒
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            this.maracasBuffer = buffer;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.maracasBuffer;

        // バンドパスフィルターで高域を強調
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(4000, now);
        filter.Q.setValueAtTime(1, now);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now); // 音量は控えめ
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.connect(filter).connect(gain).connect(this.audioContext.destination);
        noise.start(now);
        noise.stop(now + 0.1);
    }

    // ドラムパターンを取得
    getDrumPattern(patternName) {
        return this.drumPatterns[patternName] || this.drumPatterns['basic8'];
    }

    // 利用可能なドラムパターン名のリストを取得
    getAvailableDrumPatterns() {
        return Object.keys(this.drumPatterns);
    }

    playNote(note, instrument = 'piano') {
        let frequency;
        if (instrument === 'bass') {
            frequency = this.bassNoteFrequencies[note] || this.noteFrequencies[note];
        } else {
            frequency = this.noteFrequencies[note];
        }

        if (!frequency) return;
        if (instrument === 'piano') this.playPiano(frequency);
        else if (instrument === 'guitar') this.playGuitar(frequency);
        else if (instrument === 'bass') this.playBass(frequency);
    }

    // ベースノートを再生（ベースモード用）
    playBassNote(note) {
        const frequency = this.bassNoteFrequencies[note] || this.noteFrequencies[note];
        if (!frequency) return;
        this.playBass(frequency);
    }

    // コードのルート音を取得
    getChordRoot(chordName) {
        // コード名からルート音を抽出（例: "Am" → "A", "C7" → "C"）
        const root = chordName.replace(/m|7/g, '');
        return root;
    }

    // ルート音のベース周波数を取得（オクターブ2）
    getRootBassNote(chordName) {
        const root = this.getChordRoot(chordName);
        return root + '2'; // オクターブ2のルート音
    }
    
    // コードを再生（複数の音を同時に鳴らす）
    playChord(chordName, instrument = 'piano') {
        const notes = this.chordDefinitions[chordName];
        if (!notes) return;
        
        // 各音を少しずらして鳴らす（アルペジオ効果）
        notes.forEach((note, index) => {
            setTimeout(() => {
                const frequency = this.noteFrequencies[note];
                if (frequency) {
                    if (instrument === 'piano') {
                        this.playPianoChordNote(frequency, 2);
                    } else {
                        this.playGuitarChordNote(frequency, 2.5);
                    }
                }
            }, index * 30); // 30ms間隔でアルペジオ
        });
    }
    
    // コード用のピアノ音（音量調整版）
    async playPianoChordNote(frequency, duration = 2) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;
        
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frequency, now);
        
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const masterGain = this.audioContext.createGain();
        
        gain1.gain.setValueAtTime(0.3, now);
        gain2.gain.setValueAtTime(0.2, now);
        
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.4, now + 0.01);
        masterGain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc1.connect(gain1).connect(masterGain).connect(this.audioContext.destination);
        osc2.connect(gain2).connect(masterGain);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }
    
    // コード用のギター音（音量調整版）
    async playGuitarChordNote(frequency, duration = 2.5) {
        if (!this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + duration);
        
        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(filter).connect(masterGain).connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + duration);
    }
    
    // 伴奏用コード再生（控えめな音量のピアノ和音）
    async playAccompanimentChord(chordName, duration = 1.5) {
        const notes = this.chordDefinitions[chordName];
        if (!notes || !this.isInitialized) return;
        await this.ensureAudioContextRunning();
        const now = this.audioContext.currentTime;

        notes.forEach((note) => {
            const frequency = this.noteFrequencies[note];
            if (!frequency) return;

            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(frequency, now);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(frequency, now);

            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();

            gain1.gain.setValueAtTime(0.15, now);
            gain2.gain.setValueAtTime(0.1, now);

            masterGain.gain.setValueAtTime(0, now);
            masterGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
            masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc1.connect(gain1).connect(masterGain).connect(this.audioContext.destination);
            osc2.connect(gain2).connect(masterGain);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + duration);
            osc2.stop(now + duration);
        });
    }

    getNoteNameJP(note) {
        const noteName = note.replace(/[0-9]/g, '');
        return this.noteNamesJP[noteName] || note;
    }
    
    getChordNameJP(chordName) {
        return this.chordNamesJP[chordName] || chordName;
    }
    
    getChordNotes(chordName) {
        return this.chordDefinitions[chordName] || [];
    }

    getGuitarChordForm(chordName) {
        return this.guitarChordForms[chordName] || [];
    }
    
    getNotesByDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                return ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
            case 'medium':
                return ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
            case 'hard':
                return ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];
            default:
                return this.getNotesByDifficulty('easy');
        }
    }

    // ギター指板に存在する音のみを返す
    getGuitarNotesByDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                // ギター指板上の基本音（シャープなし）
                return ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
            case 'medium':
                // ギター指板上の基本音（シャープなし）
                return ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
            case 'hard':
                // ギター指板上の全ての音（シャープ含む）
                return [...this.guitarValidNotes];
            default:
                return this.getGuitarNotesByDifficulty('easy');
        }
    }

    // ベース指板に存在する音を返す
    getBassNotesByDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                // 4弦ベースの開放弦〜5フレット程度 (シャープなし)
                return ['E1', 'F1', 'G1', 'A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2'];
            case 'medium':
                // シャープなしの全音
                return ['E1', 'F1', 'G1', 'A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3'];
            case 'hard':
                // 全ての音
                return ['E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
                        'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2',
                        'G#2', 'A2', 'A#2', 'B2', 'C3'];
            default:
                return this.getBassNotesByDifficulty('easy');
        }
    }
    
    getChordsByDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                // メジャーコードのみ（7つの基本メジャーコード）
                return ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            case 'medium':
                // メジャー + マイナー
                return ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em', 'Bm'];
            case 'hard':
                // メジャー + マイナー + セブンス + シャープコード
                return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Am', 'Dm', 'Em', 'Bm', 'C7', 'G7', 'D7', 'A7', 'B7'];
            default:
                return this.getChordsByDifficulty('easy');
        }
    }

    // 楽曲リストを取得
    getSongList() {
        return Object.entries(this.songDefinitions).map(([id, song]) => ({
            id: id,
            name: song.name
        }));
    }

    // 楽曲データを取得
    getSong(songId) {
        return this.songDefinitions[songId] || null;
    }

    // ルート音からメジャースケール上の音を取得
    getMajorScaleNotes(rootNote, availableNotes) {
        // ルート音から音名を取得（オクターブ番号を除去）
        const rootNoteName = rootNote.replace(/[0-9]/g, '');
        const scaleNotes = this.getScaleNotes(rootNoteName, 'major');

        // availableNotes からスケール上の音のみを抽出
        const filteredNotes = availableNotes.filter(note => {
            const noteName = note.replace(/[0-9]/g, '');
            return scaleNotes.includes(noteName);
        });

        // スケール音が見つからない場合は全ての音を返す
        return filteredNotes.length > 0 ? filteredNotes : availableNotes;
    }

    // スケール構成音を取得（音名のみの配列を返す）
    getScaleNotes(rootName, scaleType = 'major') {
        // 半音階（クロマティックスケール）
        const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // ルート音のインデックスを取得
        const rootIndex = chromaticScale.indexOf(rootName);
        if (rootIndex === -1) return [];

        let intervals;
        switch (scaleType) {
            case 'major':
                // メジャースケール: 全全半全全全半
                intervals = [0, 2, 4, 5, 7, 9, 11];
                break;
            case 'minor':
                // ナチュラルマイナースケール: 全半全全半全全
                intervals = [0, 2, 3, 5, 7, 8, 10];
                break;
            case 'mixolydian':
                // ミクソリディアンスケール (7thコード用): メジャーの第7音を半音下げる
                intervals = [0, 2, 4, 5, 7, 9, 10];
                break;
            default:
                intervals = [0, 2, 4, 5, 7, 9, 11]; // デフォルトはメジャー
        }

        // スケール上の音名を生成
        return intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return chromaticScale[noteIndex];
        });
    }
}

const audioEngine = new AudioEngine();

