package com.hack.app.chat.survey.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record RecommendationResponse(
    @NotBlank String summary,
    @NotNull List<String> insights,
    @NotNull List<ProductRecommendation> savings,
    @NotNull List<ProductRecommendation> cards
) {
}
