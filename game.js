class RhythmGame {
    constructor() {
        this.notes = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do\''];
        this.currentSequence = [];
        this.currentIndex = 0;
        this.gameStartTime = 0;
        this.isPlaying = false;
        this.port = null;
        this.reader = null;
        this.errorCount = 0;
        this.audioContext = null;
        this.initAudio();
        console.log('遊戲實例已創建');
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // 音符頻率對應表 (do-do')
            this.frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
            console.log('音頻系統已初始化');
        } catch (error) {
            console.error('初始化音頻系統失敗:', error);
        }
    }    playNote(noteIndex, isError = false) {
        if (!this.audioContext) return;
        
        if (isError) {
            // 播放錯誤音效
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';  // 使用方波產生刺耳的聲音
            oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } else {
            // 播放正常音符
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(this.frequencies[noteIndex], this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        }
    }

    async setupArduino() {
        try {
            this.updateConnectionStatus('正在連接...');
            
            if (this.port) {
                if (this.reader) {
                    await this.reader.cancel();
                    this.reader = null;
                }
                await this.port.close();
                this.port = null;
            }

            console.log('等待選擇 Arduino 設備...');
            this.port = await navigator.serial.requestPort();
            console.log('已選擇設備，正在開啟連接...');
            
            await this.port.open({ baudRate: 9600 });
            console.log('串列埠已開啟');
            
            this.updateConnectionStatus('已連接');
            await this.startReading();

            const connectBtn = document.getElementById('connectBtn');
            if (connectBtn) {
                connectBtn.textContent = '重新連接 Arduino';
            }
            
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
        } catch (error) {
            console.error('Arduino連接錯誤:', error);
            this.updateConnectionStatus('連接失敗: ' + error.message);
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.backgroundColor = status === '已連接' ? 
                'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
        }
    }

    async startReading() {
        this.reader = this.port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) {
                    console.log('讀取完成');
                    this.updateConnectionStatus('連接中斷');
                    break;
                }
                
                console.log('收到數據:', value);
                
                if (value >= 2 && value <= 9) {
                    const note = value - 2;
                    console.log('轉換為音符索引:', note);
                    
                    this.playNote(note);
                    if (this.isPlaying) {
                        this.handleNoteInput(note);
                    }
                }
            }
        } catch (error) {
            console.error('讀取錯誤:', error);
            this.updateConnectionStatus('連接中斷: ' + error.message);
        } finally {
            console.log('清理讀取器');
            if (this.reader) {
                try {
                    await this.reader.releaseLock();
                } catch (e) {
                    console.error('釋放讀取器時出錯:', e);
                }
                this.reader = null;
            }
        }
    }

    startGame(difficulty) {
        if (!this.port) {
            alert('請先連接 Arduino！');
            return;
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        console.log('開始新遊戲，難度:', difficulty);
        
        const lengths = {
            normal: 4,
            easy: 8,
            hard: 16,
            hell: 32
        };
        
        this.currentSequence = this.generateSequence(lengths[difficulty]);
        this.currentIndex = 0;
        this.errorCount = 0;
        this.isPlaying = false;
        
        console.log('生成的序列:', this.currentSequence);
        
        this.displayNotes();
        this.startCountdown();
    }

    generateSequence(length) {
        console.log('生成', length, '個音符的序列');
        return Array.from({ length }, () => Math.floor(Math.random() * 8));
    }    displayNotes() {
        const display = document.getElementById('noteDisplay');
        if (!display) {
            console.error('找不到音符顯示區域元素');
            return;
        }
        
        const html = this.currentSequence
            .map((note, index) => {
                const status = index < this.currentIndex ? 'correct' : 
                              index === this.currentIndex ? 'current' : '';
                return `<div class="note ${status}">${this.notes[note]}</div>`;
            })
            .join('');
            
        display.innerHTML = html;
        console.log('更新音符顯示');
    }

    startCountdown() {
        const countdown = document.getElementById('countdown');
        if (!countdown) {
            console.error('找不到倒數計時器元素');
            return;
        }
        
        let count = 3;
        this.isPlaying = false;
        countdown.style.display = 'block';
        
        console.log('開始倒數');
        
        const timer = setInterval(() => {
            if (count > 0) {
                console.log('倒數:', count);
                countdown.textContent = count;
                count--;
            } else {
                console.log('遊戲開始！');
                countdown.textContent = '開始！';
                clearInterval(timer);
                
                setTimeout(() => {
                    countdown.style.display = 'none';
                    this.isPlaying = true;
                    this.gameStartTime = Date.now();
                    console.log('開始接受輸入');
                }, 1000);
            }
        }, 1000);
    }    handleNoteInput(note) {
        if (!this.isPlaying) return;

        const correctNote = this.currentSequence[this.currentIndex];
        
        if (note === correctNote) {
            // 播放正確的音符聲音
            this.playNote(note);
            this.currentIndex++;
            this.displayNotes();
            
            if (this.currentIndex === this.currentSequence.length) {
                this.isPlaying = false;
                this.showResults();
            }
        } else {
            // 播放錯誤音效
            this.playNote(note, true);
            this.errorCount++;
        }
    }    showResults() {
        const endTime = Date.now();
        const timeTaken = (endTime - this.gameStartTime) / 1000;
        const totalNotes = this.currentSequence.length;
        const wrongNotes = this.errorCount;
        const accuracy = ((totalNotes - wrongNotes) / totalNotes) * 100;
        
        const result = this.generateEndGameComment(accuracy, wrongNotes, totalNotes, timeTaken);
        this.displayResults(timeTaken, totalNotes, wrongNotes, accuracy, result);
    }    generateEndGameComment(score, errors, totalNotes, timeTaken) {
        const accuracy = ((totalNotes - errors) / totalNotes) * 100;
        const averageTimePerNote = timeTaken / totalNotes;
        
        // 根據表現動態計算分數
        const speedScore = (() => {
            const baseScore = 40;
            const penalty = Math.max(0, (averageTimePerNote - 1) * 10);
            return Math.max(0, Math.min(baseScore, baseScore - penalty));
        })();

        const accuracyScore = Math.min(60, accuracy * 0.6);
        const totalScore = Math.round(speedScore + accuracyScore);

        // 動態生成分析內容
        let analysis = [];
        
        // 速度表現分析
        const speedAnalysis = (() => {
            const comments = [];
            if (averageTimePerNote <= 1) {
                comments.push(`您的平均反應時間是 ${averageTimePerNote.toFixed(2)} 秒，展現出極快的反應速度！`);
            } else if (averageTimePerNote <= 2) {
                comments.push(`平均反應時間 ${averageTimePerNote.toFixed(2)} 秒，展現出不錯的節奏感。`);
            } else {
                comments.push(`目前的平均反應時間是 ${averageTimePerNote.toFixed(2)} 秒，還有提升空間。`);
            }

            // 根據實際速度給出具體建議
            if (averageTimePerNote > totalNotes * 0.3) {
                comments.push("建議：專注於提前預讀下一個音符，手指保持在基本位置上。");
            }
            return comments;
        })();
        analysis.push(...speedAnalysis);

        // 準確度表現分析
        const accuracyAnalysis = (() => {
            const comments = [];
            const errorRate = (errors / totalNotes) * 100;
            
            if (errors === 0) {
                comments.push(`太棒了！您完美地演奏了所有 ${totalNotes} 個音符！`);
            } else {
                comments.push(`在 ${totalNotes} 個音符中出現了 ${errors} 次錯誤，準確率為 ${accuracy.toFixed(1)}%。`);
                
                // 分析錯誤模式並給出針對性建議
                if (errorRate > 20) {
                    if (averageTimePerNote < 1.5) {
                        comments.push("建議：當前速度可能過快，建議先放慢速度，確保準確性。");
                    } else {
                        comments.push("建議：可以通過反覆練習來提高準確性，專注於每個音符的準確演奏。");
                    }
                }
            }
            return comments;
        })();
        analysis.push(...accuracyAnalysis);

        // 綜合表現評價（根據實際數據動態生成）
        const overallComment = (() => {
            const speedQuality = averageTimePerNote <= 1.5 ? "快速" : 
                               averageTimePerNote <= 2.5 ? "適中" : "從容";
            const accuracyQuality = accuracy >= 95 ? "精確" : 
                                  accuracy >= 80 ? "穩定" : "努力";
            
            // 動態組合評語
            const performance = totalScore >= 90 ? "令人印象深刻的" :
                              totalScore >= 80 ? "優秀的" :
                              totalScore >= 70 ? "不錯的" : "有潛力的";
            
            return `這是一次${performance}表現，展現出${speedQuality}的節奏和${accuracyQuality}的控制力。`;
        })();

        // 進步建議
        const improvementSuggestions = (() => {
            const suggestions = [];
            
            // 根據表現弱項給出建議
            if (speedScore < accuracyScore * 0.6) {
                suggestions.push("重點關注：提升反應速度，可以通過循序漸進加快練習節奏。");
            } else if (accuracyScore < speedScore * 0.6) {
                suggestions.push("重點關注：提高準確度，建議適當放慢速度，確保每個音符的準確性。");
            }

            // 根據總分給出下一步建議
            if (totalScore >= 90) {
                suggestions.push("下一步：挑戰更高難度，或嘗試更複雜的音符組合。");
            } else if (totalScore >= 70) {
                suggestions.push("下一步：在保持現有水平的基礎上，嘗試逐漸提升速度。");
            } else {
                suggestions.push("下一步：建議從基礎開始，先確保準確性，再逐步提升速度。");
            }

            return suggestions;
        })();
        analysis.push(...improvementSuggestions);

        return {
            score: totalScore,
            comment: overallComment,
            analysis: analysis
        };
    }    displayResults(timeTaken, totalNotes, wrongNotes, accuracy, result) {
        const stats = document.getElementById('stats');
        if (!stats) {
            console.error('找不到結果顯示區域元素');
            return;
        }

        const averageTimePerNote = timeTaken / totalNotes;

        stats.innerHTML = `
            <h2>遊戲結果</h2>
            <div class="result-grid">
                <div class="result-item">
                    <span class="label">完成時間</span>
                    <span class="value">${timeTaken.toFixed(2)}秒</span>
                </div>
                <div class="result-item">
                    <span class="label">平均反應時間</span>
                    <span class="value">${averageTimePerNote.toFixed(2)}秒/音符</span>
                </div>
                <div class="result-item">
                    <span class="label">總音符數</span>
                    <span class="value">${totalNotes}</span>
                </div>
                <div class="result-item">
                    <span class="label">錯誤次數</span>
                    <span class="value">${wrongNotes}</span>
                </div>
                <div class="result-item">
                    <span class="label">準確率</span>
                    <span class="value">${accuracy.toFixed(1)}%</span>
                </div>
                <div class="result-item score">
                    <span class="label">最終評分</span>
                    <span class="value">${result.score}</span>
                </div>
            </div>
            <div class="evaluation">
                <h3>${result.comment}</h3>
                <div class="analysis">
                    ${result.analysis.map(line => `<p>${line}</p>`).join('')}
                </div>
            </div>
            <button class="btn normal" onclick="game.startGame('normal')">再玩一次</button>
        `;
        stats.style.display = 'block';
    }
}

// 創建遊戲實例
window.game = new RhythmGame();
