package com.hack.app.games.calculating;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class Problem {
    private MenuBoard menuBoard;
    private List<OrderItem> orders;
    private int answer;
}
