package com.hack.app.chat.survey.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Map;

public record SurveyResponsePayload(
    @NotEmpty List<@Valid SurveyAnswer> answers,
    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    Map<String, String> promptParams
) {
}
