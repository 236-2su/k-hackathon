package com.hack.app.chat.finance;

public record FinanceChatResponse(
    String sessionId,
    String reply,
    boolean financeRelated
) {
}