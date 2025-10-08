package com.hack.app.games.typing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TypingGameService {

    @Autowired
    private SentenceRepository sentenceRepository;

    public Sentence getRandomSentence(java.util.List<Long> excludeIds) {
        if (excludeIds == null || excludeIds.isEmpty()) {
            return sentenceRepository.findRandomSentence();
        } else {
            return sentenceRepository.findRandomSentenceExcludingIds(excludeIds);
        }
    }

    // TODO: 게임 결과 저장 로직 구현
    public void saveResult(GameResultRequest request) {
        // 예를 들어, 사용자 점수를 업데이트하는 로직
        System.out.println("Received game result: " + request.getCompletedSentences() + " sentences completed.");
    }
}
