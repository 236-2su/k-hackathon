package com.hack.app.games.calculating;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class Problem {
    private String question;
    private int answer;
    private int timeLimit;
}
