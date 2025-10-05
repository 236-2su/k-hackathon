package com.hack.app.chat.survey;

import java.util.List;

public record SurveyQuestion(
    String id,
    String title,
    String description,
    boolean multiSelect,
    List<SurveyOption> options
) {
}