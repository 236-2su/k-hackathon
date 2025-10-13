package com.hack.app.games.calculating;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class ProblemResponse {
    private MenuBoard menuBoard;
    private List<OrderItem> orders;
    private int answer;
}
