package com.hack.app.chat.survey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SurveyAnswer(
    @NotBlank(message = "질문 ID는 필수입니다.")
    String questionId,

    @NotEmpty(message = "최소 한 개 이상의 선택지를 보내주세요.")
    @Size(max = 5, message = "선택지는 최대 5개까지 선택할 수 있어요.")
    List<@NotBlank(message = "선택지 ID는 필수입니다.") String> selectedOptionIds
) {
}