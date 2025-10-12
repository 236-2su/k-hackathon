package com.hack.app.chat.survey.dto;

import jakarta.validation.constraints.NotBlank;

public record SurveyOption(
    @NotBlank String id,
    @NotBlank String label
) {
}
