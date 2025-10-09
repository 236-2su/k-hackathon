package com.hack.app.games.calculating;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class ProblemResponse {
    private String question;
    private int timeLimit;
}
