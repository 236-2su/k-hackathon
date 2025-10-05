package com.hack.app.chat.survey;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SurveyResponsePayload(
    @NotEmpty(message = "설문 응답이 비어있습니다.")
    List<@Valid SurveyAnswer> answers
) {
}