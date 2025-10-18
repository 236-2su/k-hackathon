package com.hack.app.games.calculating;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games/calculating")
public class CalculatingGameController {

    private final CalculatingGameService calculatingGameService;

    public CalculatingGameController(CalculatingGameService calculatingGameService) {
        this.calculatingGameService = calculatingGameService;
    }

    @GetMapping("/start")
    public List<ProblemResponse> startNewGame() {
        return calculatingGameService.startNewGame();
    }

    @PostMapping("/submit")
    public GameResult submitAnswers(@RequestHeader("X-User-Id") String zepUserId,
                                    @RequestBody List<UserAnswer> userAnswers) {
        return calculatingGameService.submitAnswers(zepUserId, userAnswers);
    }
}
