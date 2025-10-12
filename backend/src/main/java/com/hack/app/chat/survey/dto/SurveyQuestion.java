package com.hack.app.chat.survey.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record SurveyQuestion(
    @NotBlank String id,
    @NotBlank String title,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    String description,
    @NotBlank String type,
    boolean multiSelect,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @Positive
    Integer maxSelections,
    @NotNull
    List<SurveyOption> options
) {
}
