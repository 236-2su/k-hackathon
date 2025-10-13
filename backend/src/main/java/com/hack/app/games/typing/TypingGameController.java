package com.hack.app.games.typing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/games/typing")
public class TypingGameController {

    @Autowired
    private TypingGameService typingGameService;

    @GetMapping(value = "/sentence", produces = "application/json;charset=UTF-8")
    public ResponseEntity<Sentence> getRandomSentence(@RequestParam(required = false) java.util.List<Long> excludeIds) {
        Sentence sentence = typingGameService.getRandomSentence(excludeIds);
        if (sentence == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(sentence);
    }

    @PostMapping("/result")
    public ResponseEntity<Void> saveResult(@RequestBody GameResultRequest request) {
        typingGameService.saveResult(request);
        return ResponseEntity.ok().build();
    }
}
