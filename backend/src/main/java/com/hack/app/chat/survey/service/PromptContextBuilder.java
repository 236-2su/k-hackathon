package com.hack.app.chat.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.hack.app.chat.survey.dto.SurveyOption;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.model.FinancialProduct;
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
                               Map<String, String> promptParams,
                               List<FinancialProduct> candidates) {
        String answerSummary = buildAnswerSummary(answers, questions);
        String systemInstruction = buildSystemInstruction();
        String userPrompt = buildUserPrompt(answerSummary, context, promptParams, candidates);
        return new PromptContext(systemInstruction, userPrompt, promptParams, candidates);
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
            "당신은 한국 청소년을 위한 금융 코치입니다.",
            "한국 은행이 제공하는 적금·예금·체크카드 상품 지식을 활용해 개인화된 추천을 제공합니다.",
            "답변은 반드시 JSON 형식으로만 작성하고 추가 설명을 붙이지 마세요.",
            "추천은 설문 응답과 제공된 후보 상품 목록을 기반으로 해야 하며, 존재하지 않는 상품을 만들지 마세요.",
            "말투는 친근하고 따뜻한 한국어를 사용하세요."
        );
    }

    private String buildUserPrompt(String answerSummary,
                                   SurveyContext context,
                                   Map<String, String> promptParams,
                                   List<FinancialProduct> candidates) {
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
        tokens.put("candidate_catalog", serializeCandidates(candidates));

        String template = """
고객 나이는 ${age_sentence}, 월평균 용돈 수준은 ${allowance_sentence}입니다. 주요 소비 카테고리는 ${spending_sentence}이며, 저축 목표는 ${goal_sentence}, 계획 기간은 ${horizon_sentence}로 응답했습니다. 위험 선호도는 ${risk_sentence}, 디지털 이용 성향은 ${digital_sentence}, 보호자 협조 여부는 ${guardian_sentence}, 체크카드 이용 상태는 ${card_sentence}입니다.

출력은 JSON 객체 하나로 작성하며, summary · insights · savings · cards 키를 반드시 포함하세요. 각 배열에는 고객에게 실제로 도움이 되는 여러 조언과 상품을 채워도 됩니다.
{
  "summary": "<고객 상황을 2~3문장으로 요약>",
  "insights": [
    "<맞춤 조언 1>",
    "<맞춤 조언 2>",
    "<맞춤 조언 3>"
  ],
  "savings": [
    {
      "productId": "SAV_...",
      "headline": "<상품 헤드라인>",
      "benefits": ["<장점 1>", "<장점 2>", "<장점 3>"] ,
      "caution": "<주의사항>",
      "nextAction": "<다음 행동 가이드>",
      "minMonthlyAmount": 10000,
      "maxMonthlyAmount": 300000,
      "guardianRequired": true,
      "highlightCategories": ["<강조 카테고리>"],
      "digitalFriendly": true
    },
    {
      "productId": "DEP_...",
      "headline": "<두 번째 상품 헤드라인>",
      "benefits": ["<장점 1>", "<장점 2>"],
      "caution": "<주의사항>",
      "nextAction": "<다음 행동 가이드>",
      "minMonthlyAmount": 50000,
      "maxMonthlyAmount": 500000,
      "guardianRequired": false,
      "highlightCategories": ["<강조 카테고리>"],
      "digitalFriendly": false
    }
  ],
  "cards": [
    {
      "productId": "CARD_...",
      "headline": "<카드 헤드라인>",
      "benefits": ["<카드 혜택 1>", "<카드 혜택 2>"] ,
      "caution": "<주의사항>",
      "nextAction": "<카드를 활용하는 팁>",
      "minMonthlyAmount": 0,
      "maxMonthlyAmount": 300000,
      "guardianRequired": true,
      "highlightCategories": ["<강조 카테고리>"],
      "digitalFriendly": true
    },
    {
      "productId": "CARD_...",
      "headline": "<두 번째 카드 헤드라인>",
      "benefits": ["<카드 혜택>"] ,
      "caution": "<주의사항>",
      "nextAction": "<다음 행동>",
      "minMonthlyAmount": 0,
      "maxMonthlyAmount": 500000,
      "guardianRequired": false,
      "highlightCategories": ["<강조 카테고리>"],
      "digitalFriendly": true
    }
  ]
}

필드 규칙:
- `benefits`, `highlightCategories`는 한글 문장이나 구로 작성한 배열입니다.
- `minMonthlyAmount`, `maxMonthlyAmount`는 숫자만 사용합니다 (원 단위, 쉼표·문자 금지).
- 후보 목록에 존재하지 않는 productId는 사용하지 않습니다.
- 고객 상황과 맞지 않는 상품은 제외하고, 최대 2개까지 자연스럽게 골라주세요.

추가 파라미터(JSON):
${prompt_parameters}

설문 응답 세부 요약:
${answer_summary}

추천 후보 상품 목록(JSON):
${candidate_catalog}
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
            case "safety-first" -> "원금 보전을 가장 중시합니다";
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

    private String serializeCandidates(List<FinancialProduct> candidates) {
        try {
            return objectMapper.writeValueAsString(
                candidates.stream()
                    .map(this::toCandidateMap)
                    .toList()
            );
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize candidate catalog", e);
            return "[]";
        }
    }

    private Map<String, Object> toCandidateMap(FinancialProduct product) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("productId", product.id());
        map.put("type", product.type().name());
        map.put("name", product.name());
        map.put("headline", product.headline());
        map.put("benefits", product.benefits());
        map.put("caution", product.caution());
        map.put("minAge", product.minAge());
        map.put("maxAge", product.maxAge());
        map.put("minMonthlyAmount", product.minMonthlyAmount());
        map.put("maxMonthlyAmount", product.maxMonthlyAmount());
        map.put("suitabilityGoals", product.suitabilityGoals());
        map.put("suitabilityHorizons", product.suitabilityHorizons());
        map.put("riskProfiles", product.riskProfiles());
        map.put("highlightCategories", product.highlightCategories());
        map.put("digitalFriendly", product.digitalFriendly());
        map.put("guardianRequired", product.guardianRequired());
        return map;
    }

    private String applyTemplate(String template, Map<String, String> tokens) {
        String result = template;
        for (Map.Entry<String, String> entry : tokens.entrySet()) {
            result = result.replace("${" + entry.getKey() + "}", entry.getValue());
        }
        return result;
    }
}
