package com.hack.app.games.typing;

public class GameResultRequest {
    private int completedSentences;
    // private Long userId; // 필요시 사용자 ID 추가

    public int getCompletedSentences() {
        return completedSentences;
    }

    public void setCompletedSentences(int completedSentences) {
        this.completedSentences = completedSentences;
    }
}
