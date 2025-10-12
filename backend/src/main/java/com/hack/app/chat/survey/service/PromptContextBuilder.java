package com.hack.app.chat.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.hack.app.chat.survey.dto.SurveyOption;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.model.PromptContext;
import com.hack.app.chat.survey.model.SurveyContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class PromptContextBuilder {

    private static final Logger log = LoggerFactory.getLogger(PromptContextBuilder.class);

    private final ObjectMapper objectMapper;

    public PromptContextBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT);
    }

    public PromptContext build(Map<String, List<String>> answers,
                               Map<String, SurveyQuestion> questions,
                               SurveyContext context,
                               Map<String, String> promptParams) {
        String answerSummary = buildAnswerSummary(answers, questions);
        String systemInstruction = buildSystemInstruction();
        String userPrompt = buildUserPrompt(answerSummary, context, promptParams);
        return new PromptContext(systemInstruction, userPrompt, promptParams);
    }

    private String buildAnswerSummary(Map<String, List<String>> answers, Map<String, SurveyQuestion> questionMap) {
        StringBuilder builder = new StringBuilder();
        answers.forEach((questionId, selectedIds) -> {
            SurveyQuestion question = questionMap.get(questionId);
            if (question == null) {
                return;
            }
            String labels = selectedIds.stream()
                .map(optionId -> findLabel(question, optionId))
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));
            builder.append("- ")
                .append(question.title())
                .append(": ")
                .append(labels)
                .append("\n");
        });
        return builder.toString().trim();
    }

    private String findLabel(SurveyQuestion question, String optionId) {
        return question.options().stream()
            .filter(option -> option.id().equalsIgnoreCase(optionId))
            .map(SurveyOption::label)
            .findFirst()
            .orElse(optionId);
    }

    private String buildSystemInstruction() {
        return String.join("\n",
            "당신은 한국 청소년을 돕는 금융 코치입니다.",
            "한국 시중은행과 카드사가 실제 제공하는 상품을 중심으로 맞춤 추천을 제공합니다.",
            "답변은 JSON 한 개만 출력하고, 다른 문장은 포함하지 마세요.",
            "조건이 불확실한 정보는 '정보 확인 필요'라고 명시하고, 허구의 상품을 만들지 마세요.",
            "어조는 따뜻하고 믿음직한 한국어를 사용하세요."
        );
    }

    private String buildUserPrompt(String answerSummary,
                                   SurveyContext context,
                                   Map<String, String> promptParams) {
        Map<String, String> tokens = new LinkedHashMap<>();
        tokens.put("age_sentence", buildAgeSentence(context));
        tokens.put("allowance_sentence", buildAllowanceSentence(context));
        tokens.put("spending_sentence", buildSpendingSentence(context));
        tokens.put("goal_sentence", buildGoalSentence(context));
        tokens.put("horizon_sentence", buildHorizonSentence(context));
        tokens.put("risk_sentence", buildRiskSentence(context));
        tokens.put("digital_sentence", buildDigitalSentence(context));
        tokens.put("guardian_sentence", buildGuardianSentence(context));
        tokens.put("card_sentence", buildCardSentence(context));
        tokens.put("prompt_parameters", serializePromptParams(promptParams));
        tokens.put("answer_summary", answerSummary.isEmpty() ? "설문 응답 요약 없음" : answerSummary);

        String template = """
고객 나이는 ${age_sentence}, 월평균 용돈은 ${allowance_sentence}입니다. 주요 지출 카테고리는 ${spending_sentence}, 저축 목표는 ${goal_sentence}, 계획 기간은 ${horizon_sentence}입니다. 위험 선호도는 ${risk_sentence}, 디지털 이용 성향은 ${digital_sentence}, 보호자 협조 여부는 ${guardian_sentence}, 체크카드 이용 상태는 ${card_sentence}입니다.

아래 JSON 구조와 동일하게만 응답하세요 (추가 설명 금지).
{
  "summary": "<고객 상황을 2~3문장으로 요약>",
  "insights": [
    "<맞춤 조언 1>",
    "<맞춤 조언 2>",
    "<맞춤 조언 3>"
  ],
  "savings": [
    {
      "productId": "SAV_<고유ID>",
      "type": "SAVINGS",
      "name": "<상품명>",
      "headline": "<한 줄 요약>",
      "benefits": ["<혜택 1>", "<혜택 2>", "<혜택 3>"] ,
      "caution": "<주의사항>",
      "nextAction": "<추천 행동>",
      "minMonthlyAmount": 10000,
      "maxMonthlyAmount": 300000,
      "guardianRequired": true,
      "digitalFriendly": true,
      "highlightCategories": ["<강조 카테고리>"]
    }
  ],
  "cards": [
    {
      "productId": "CARD_<고유ID>",
      "type": "CARD",
      "name": "<카드명>",
      "headline": "<한 줄 요약>",
      "benefits": ["<혜택 1>", "<혜택 2>"] ,
      "caution": "<주의사항>",
      "nextAction": "<추천 행동>",
      "minMonthlyAmount": 0,
      "maxMonthlyAmount": 300000,
      "guardianRequired": true,
      "digitalFriendly": true,
      "highlightCategories": ["<강조 카테고리>"]
    }
  ]
}

필수 지침:
- `type` 값은 반드시 SAVINGS, DEPOSIT, CARD 중 하나를 대문자로 사용하세요.
- 각 배열은 고객 상황에 맞게 1~3개까지 채울 수 있습니다. 동일한 상품을 중복으로 넣지 마세요.
- 실제 한국 금융기관 상품을 우선 추천하고, 세부 정보가 불확실하면 '정보 확인 필요'라고 표기하세요.
- 금액 필드는 숫자만 사용합니다 (예: 200000). 쉼표나 원 단위를 쓰지 마세요.
- 고객에게 의미 있는 설명과 행동 가이드를 제공하세요.

참고: 설문으로부터 도출된 파라미터는 JSON으로 정리되어 있습니다.
${prompt_parameters}

설문 응답 요약:
${answer_summary}
""";

        return applyTemplate(template, tokens);
    }

    private String buildAgeSentence(SurveyContext context) {
        if (context.estimatedAge().isPresent()) {
            String band = context.ageBand() == null ? "(학년 미기재)" : "(" + context.ageBand() + " 응답)";
            return context.estimatedAge().get() + "세 " + band;
        }
        if (context.ageBand() != null) {
            return context.ageBand() + " (나이 미측정)";
        }
        return "응답하지 않았습니다";
    }

    private String buildAllowanceSentence(SurveyContext context) {
        if (context.allowanceAmount().isPresent()) {
            return context.allowanceBracket() + " (약 " + context.allowanceAmount().get() + "원)";
        }
        if (context.allowanceBracket() != null) {
            return context.allowanceBracket();
        }
        return "응답하지 않았습니다";
    }

    private String buildSpendingSentence(SurveyContext context) {
        return listToSentence(context.spendingFocus(), "응답하지 않았습니다");
    }

    private String buildGoalSentence(SurveyContext context) {
        return listToSentence(context.savingGoals(), "응답하지 않았습니다");
    }

    private String buildHorizonSentence(SurveyContext context) {
        return context.savingHorizon() == null ? "응답하지 않았습니다" : context.savingHorizon();
    }

    private String buildRiskSentence(SurveyContext context) {
        if (context.riskProfile() == null) {
            return "응답하지 않았습니다";
        }
        return switch (context.riskProfile().toLowerCase(Locale.ROOT)) {
            case "safety-first" -> "안전을 가장 중시합니다";
            case "balanced" -> "안정성과 혜택의 균형을 원합니다";
            case "growth" -> "혜택과 적립을 더 중시합니다";
            default -> context.riskProfile();
        };
    }

    private String buildDigitalSentence(SurveyContext context) {
        if (context.digitalBehavior() == null) {
            return "응답하지 않았습니다";
        }
        return switch (context.digitalBehavior()) {
            case "mostly-digital" -> "모바일 앱을 주로 이용합니다";
            case "balanced" -> "모바일과 창구를 모두 이용합니다";
            case "mostly-cash" -> "현금/통장 사용을 선호합니다";
            default -> context.digitalBehavior();
        };
    }

    private String buildGuardianSentence(SurveyContext context) {
        if (context.guardianPreference() == null) {
            return "응답하지 않았습니다";
        }
        return switch (context.guardianPreference()) {
            case "need-guardian" -> "보호자와 함께 진행하길 원합니다";
            case "independent" -> "스스로 진행하길 원합니다";
            default -> context.guardianPreference();
        };
    }

    private String buildCardSentence(SurveyContext context) {
        if (context.cardUsage() == null) {
            return "응답하지 않았습니다";
        }
        return switch (context.cardUsage()) {
            case "using" -> "이미 체크카드를 사용 중입니다";
            case "interested" -> "관심은 있지만 아직 발급받지 않았습니다";
            case "not-yet" -> "체크카드를 사용해본 적이 없습니다";
            default -> context.cardUsage();
        };
    }

    private String listToSentence(List<String> values, String emptyPlaceholder) {
        if (values == null || values.isEmpty()) {
            return emptyPlaceholder;
        }
        return values.stream()
            .map(value -> value.replace('-', ' '))
            .collect(Collectors.joining(", "));
    }

    private String serializePromptParams(Map<String, String> promptParams) {
        try {
            if (promptParams == null || promptParams.isEmpty()) {
                return "{}";
            }
            return objectMapper.writeValueAsString(promptParams);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize prompt parameters", e);
            return "{}";
        }
    }

    private String applyTemplate(String template, Map<String, String> tokens) {
        String result = template;
        for (Map.Entry<String, String> entry : tokens.entrySet()) {
            result = result.replace("${" + entry.getKey() + "}", entry.getValue());
        }
        return result;
    }
}