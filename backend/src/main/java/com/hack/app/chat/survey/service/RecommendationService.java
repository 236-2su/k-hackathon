package com.hack.app.chat.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.chat.survey.dto.RecommendationResponse;
import com.hack.app.chat.survey.dto.SurveyAnswer;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.dto.SurveyResponsePayload;
import com.hack.app.chat.survey.model.FinancialProduct;
import com.hack.app.chat.survey.model.PromptContext;
import com.hack.app.chat.survey.model.SurveyContext;
import com.hack.app.openai.OpenAiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    private final SurveyService surveyService;
    private final CandidateSelector candidateSelector;
    private final PromptContextBuilder promptContextBuilder;
    private final RecommendationParser recommendationParser;
    private final OpenAiClient openAiClient;

    public RecommendationService(SurveyService surveyService,
                                 CandidateSelector candidateSelector,
                                 PromptContextBuilder promptContextBuilder,
                                 RecommendationParser recommendationParser,
                                 OpenAiClient openAiClient) {
        this.surveyService = surveyService;
        this.candidateSelector = candidateSelector;
        this.promptContextBuilder = promptContextBuilder;
        this.recommendationParser = recommendationParser;
        this.openAiClient = openAiClient;
    }

    public RecommendationResponse recommend(SurveyResponsePayload payload) {
        if (!openAiClient.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OpenAI API 키가 설정되지 않았습니다.");
        }

        Map<String, SurveyQuestion> questionMap = surveyService.getQuestions().stream()
            .collect(Collectors.toMap(SurveyQuestion::id, question -> question));

        Map<String, List<String>> answers = new LinkedHashMap<>();
        for (SurveyAnswer answer : payload.answers()) {
            SurveyQuestion question = questionMap.get(answer.questionId());
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 질문 ID: " + answer.questionId());
            }
            answers.put(question.id(), new ArrayList<>(answer.selectedOptionIds()));
        }

        SurveyContext context = SurveyContext.fromAnswers(answers);
        List<FinancialProduct> orderedCandidates = candidateSelector.select(surveyService.getProducts(), context);
        List<FinancialProduct> topCandidates = orderedCandidates.stream().limit(6).toList();
        if (topCandidates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "추천 가능한 후보 상품이 없습니다.");
        }

        PromptContext promptContext = promptContextBuilder.build(
            answers,
            questionMap,
            context,
            payload.promptParams(),
            topCandidates
        );

        String raw = callOpenAi(promptContext, payload.promptParams());
        return recommendationParser.parse(raw, topCandidates);
    }

    private String callOpenAi(PromptContext promptContext, Map<String, String> promptParams) {
        Instant started = Instant.now();
        Map<String, Object> additional = buildResponseFormatSchema();
        additional.put("temperature", 0.6);
        additional.put("top_p", 0.9);

        List<OpenAiClient.Message> messages = List.of(
            OpenAiClient.Message.system(promptContext.systemInstruction()),
            OpenAiClient.Message.user(promptContext.userPrompt())
        );

        Optional<String> response = openAiClient.createChatCompletion(messages, 0.6, additional);
        if (response.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OpenAI 응답을 받지 못했습니다.");
        }

        String content = response.get();
        log.info("OpenAI recommendation latency={}ms", Duration.between(started, Instant.now()).toMillis());
        log.debug("OpenAI raw response: {}", content);
        return content;
    }

    private Map<String, Object> buildResponseFormatSchema() {
        Map<String, Object> stringSchema = Map.of("type", "string");
        Map<String, Object> insightSchema = new HashMap<>();
        insightSchema.put("type", "array");
        insightSchema.put("items", stringSchema);
        insightSchema.put("minItems", 1);
        insightSchema.put("maxItems", 4);

        Map<String, Object> productSchema = new LinkedHashMap<>();
        Map<String, Object> productProps = new LinkedHashMap<>();
        productProps.put("productId", Map.of("type", "string"));
        productProps.put("headline", stringSchema);
        productProps.put("benefits", Map.of("type", "array", "items", stringSchema, "minItems", 1));
        productProps.put("caution", stringSchema);
        productProps.put("nextAction", stringSchema);
        productProps.put("minMonthlyAmount", Map.of("type", "integer"));
        productProps.put("maxMonthlyAmount", Map.of("type", "integer"));
        productProps.put("guardianRequired", Map.of("type", "boolean"));
        productProps.put("highlightCategories", Map.of("type", "array", "items", stringSchema));
        productProps.put("digitalFriendly", Map.of("type", "boolean"));
        productSchema.put("type", "object");
        productSchema.put("properties", productProps);
        productSchema.put("required", List.of("productId"));

        Map<String, Object> savingsSchema = new LinkedHashMap<>();
        savingsSchema.put("type", "array");
        savingsSchema.put("items", productSchema);
        savingsSchema.put("minItems", 1);
        savingsSchema.put("maxItems", 2);

        Map<String, Object> cardsSchema = new LinkedHashMap<>();
        cardsSchema.put("type", "array");
        cardsSchema.put("items", productSchema);
        cardsSchema.put("minItems", 1);
        cardsSchema.put("maxItems", 2);

        Map<String, Object> rootProps = new LinkedHashMap<>();
        rootProps.put("summary", stringSchema);
        rootProps.put("insights", insightSchema);
        rootProps.put("savings", savingsSchema);
        rootProps.put("cards", cardsSchema);

        Map<String, Object> rootSchema = new LinkedHashMap<>();
        rootSchema.put("type", "object");
        rootSchema.put("properties", rootProps);
        rootSchema.put("required", List.of("summary", "insights", "savings", "cards"));

        Map<String, Object> responseFormat = new LinkedHashMap<>();
        responseFormat.put("type", "json_schema");
        responseFormat.put("json_schema", Map.of("name", "FinanceRecommendation", "schema", rootSchema));

        Map<String, Object> additional = new HashMap<>();
        additional.put("response_format", responseFormat);
        return additional;
    }
}
