package com.hack.app.chat.survey.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hack.app.chat.survey.model.ProductType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ProductRecommendation(
    @NotBlank String productId,
    @NotNull ProductType type,
    @NotBlank String name,
    @NotBlank String headline,
    List<String> benefits,
    @NotBlank String caution,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    String nextAction,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer minMonthlyAmount,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer maxMonthlyAmount,
    boolean guardianRequired,
    List<String> highlightCategories,
    boolean digitalFriendly
) {
}
