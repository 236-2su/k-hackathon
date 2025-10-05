package com.hack.app.chat.survey;

import java.util.List;

public record ProductRecommendation(
    String productId,
    ProductType type,
    String name,
    String headline,
    List<String> benefits,
    String caution,
    String nextAction
) {
}