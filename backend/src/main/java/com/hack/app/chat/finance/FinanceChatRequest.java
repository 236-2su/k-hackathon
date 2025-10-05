package com.hack.app.chat.finance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FinanceChatRequest(
    @NotBlank(message = "질문을 입력해 주세요.")
    @Size(max = 500, message = "질문은 500자 이하로 입력해 주세요.")
    String question,

    @Size(max = 100, message = "세션 ID는 100자 이하로 입력해 주세요.")
    String sessionId
) {
}