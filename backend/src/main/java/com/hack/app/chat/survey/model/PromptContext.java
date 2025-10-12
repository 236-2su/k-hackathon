package com.hack.app.chat.survey.model;

import java.util.Map;

public record PromptContext(
    String systemInstruction,
    String userPrompt,
    Map<String, String> promptParams
) {
}
