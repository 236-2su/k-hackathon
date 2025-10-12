package com.hack.app.chat.survey.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SurveyAnswer(
    @NotBlank String questionId,
    @NotEmpty List<@NotBlank String> selectedOptionIds
) {
}
