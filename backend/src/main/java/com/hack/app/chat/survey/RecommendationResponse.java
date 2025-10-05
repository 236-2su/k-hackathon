package com.hack.app.chat.survey;

import java.util.List;

public record RecommendationResponse(
    String summary,
    List<ProductRecommendation> recommendations
) {
}