package com.hack.app.games.calculating;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class MenuBoard {
    private String name;
    private List<MenuItem> menuItems;
}
