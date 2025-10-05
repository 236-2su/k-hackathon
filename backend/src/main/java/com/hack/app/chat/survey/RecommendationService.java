package com.hack.app.chat.survey;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hack.app.openai.OpenAiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    private final SurveyService surveyService;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public RecommendationService(SurveyService surveyService, OpenAiClient openAiClient, ObjectMapper objectMapper) {
        this.surveyService = surveyService;
        this.openAiClient = openAiClient;
        this.objectMapper = objectMapper;
    }

    public RecommendationResponse recommend(SurveyResponsePayload payload) {
        Map<String, SurveyQuestion> questionById = surveyService.getQuestions().stream()
            .collect(Collectors.toMap(SurveyQuestion::id, q -> q));

        Map<String, List<String>> answers = new LinkedHashMap<>();
        for (SurveyAnswer answer : payload.answers()) {
            if (!questionById.containsKey(answer.questionId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 질문 ID입니다: " + answer.questionId());
            }
            answers.put(answer.questionId(), answer.selectedOptionIds());
        }

        List<FinancialProduct> candidates = determineCandidateProducts(answers);
        String summary = buildSummary(answers, questionById);

        List<ProductRecommendation> recommendations = openAiRecommendation(summary, candidates)
            .orElseGet(() -> fallbackRecommendations(candidates, answers));

        return new RecommendationResponse(summary, recommendations);
    }

    private List<FinancialProduct> determineCandidateProducts(Map<String, List<String>> answers) {
        Map<String, FinancialProduct> productById = surveyService.allProducts().stream()
            .collect(Collectors.toMap(FinancialProduct::id, product -> product));

        Set<String> selectedIds = new LinkedHashSet<>();

        boolean wantsSavings = containsAny(answers, "interests", List.of("savings", "deposit"))
            || containsAny(answers, "goal", List.of("short-saving", "long-saving", "emergency", "study"))
            || containsAny(answers, "allowance", List.of("lt-5", "5-10"));

        boolean wantsDeposit = containsAny(answers, "allowance", List.of("10-20", "gt-20"))
            || containsAny(answers, "goal", List.of("hobby", "emergency"))
            || containsAny(answers, "risk", List.of("safe"));

        boolean wantsCard = containsAny(answers, "card-usage", List.of("using", "interested"))
            || containsAny(answers, "interests", List.of("card", "teen-card"));

        boolean usesTransportOften = containsAny(answers, "spending-category", List.of("transport"));

        if (wantsSavings || (!wantsDeposit && !wantsCard)) {
            addCandidate(selectedIds, productById, "SAV001");
        }
        if (wantsDeposit) {
            addCandidate(selectedIds, productById, "DEP001");
        }
        if (wantsCard) {
            addCandidate(selectedIds, productById, "CARD001");
            if (usesTransportOften || containsAny(answers, "interests", List.of("teen-card"))) {
                addCandidate(selectedIds, productById, "CARD002");
            }
        } else if (usesTransportOften) {
            addCandidate(selectedIds, productById, "CARD002");
        }

        if (selectedIds.isEmpty()) {
            addCandidate(selectedIds, productById, "SAV001");
            addCandidate(selectedIds, productById, "DEP001");
        }

        return selectedIds.stream()
            .map(productById::get)
            .filter(product -> product != null)
            .toList();
    }

    private void addCandidate(Set<String> selectedIds, Map<String, FinancialProduct> productById, String productId) {
        if (productById.containsKey(productId)) {
            selectedIds.add(productId);
        }
    }

    private Optional<List<ProductRecommendation>> openAiRecommendation(String summary, List<FinancialProduct> candidates) {
        if (!openAiClient.isEnabled() || candidates.isEmpty()) {
            return Optional.empty();
        }

        String candidateCatalog = candidates.stream()
            .map(product -> {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("id", product.id());
                node.put("type", product.type().name());
                node.put("name", product.name());
                node.put("headline", product.headline());
                ArrayNode benefitsNode = node.putArray("benefits");
                product.benefits().forEach(benefitsNode::add);
                node.put("caution", product.caution());
                return node;
            })
            .map(JsonNode::toString)
            .collect(Collectors.joining(",\n"));

        String prompt = "사용자 설문 요약:\n" + summary + "\n\n"
            + "후보 상품 목록(이 중에서만 선택):\n[\n" + candidateCatalog + "\n]\n\n"
            + "규칙:\n"
            + "1. 반드시 2개 이상 3개 이하의 상품만 추천하고, 후보 목록에 없는 productId는 절대 사용하지 말 것.\n"
            + "2. 각 추천은 15~18세 청소년이 이해하기 쉬운 한국어로 1~2문장 headline, 2~3개의 혜택, 주의 문구, 다음 행동 안내를 포함할 것.\n"
            + "3. 설문 응답과 연결되는 이유를 notes 필드에 짧게 적어 줄 것.\n"
            + "4. JSON 외 다른 텍스트는 출력하지 말 것.";

        Map<String, Object> responseFormat = buildResponseFormatSchema();

        List<OpenAiClient.Message> messages = List.of(
            OpenAiClient.Message.system("너는 청소년 금융 멘토야. 응답은 항상 JSON 형식으로 제공해."),
            OpenAiClient.Message.user(prompt)
        );

        return openAiClient.createChatCompletion(messages, 0.4, responseFormat)
            .flatMap(this::parseRecommendationsFromJson);
    }

    private Map<String, Object> buildResponseFormatSchema() {
        Map<String, Object> stringSchema = Map.of("type", "string");
        Map<String, Object> benefitsSchema = Map.of("type", "array", "items", stringSchema);

        Map<String, Object> recProperties = new HashMap<>();
        recProperties.put("productId", stringSchema);
        recProperties.put("headline", stringSchema);
        recProperties.put("benefits", benefitsSchema);
        recProperties.put("caution", stringSchema);
        recProperties.put("nextAction", stringSchema);
        recProperties.put("notes", stringSchema);

        Map<String, Object> recSchema = new HashMap<>();
        recSchema.put("type", "object");
        recSchema.put("properties", recProperties);
        recSchema.put("required", List.of("productId", "headline", "benefits", "caution", "nextAction"));

        Map<String, Object> recommendationsSchema = new HashMap<>();
        recommendationsSchema.put("type", "array");
        recommendationsSchema.put("items", recSchema);
        recommendationsSchema.put("minItems", 2);
        recommendationsSchema.put("maxItems", 3);

        Map<String, Object> rootSchema = new HashMap<>();
        rootSchema.put("type", "object");
        rootSchema.put("properties", Map.of("recommendations", recommendationsSchema));
        rootSchema.put("required", List.of("recommendations"));

        return Map.of(
            "response_format", Map.of(
                "type", "json_schema",
                "json_schema", Map.of("name", "FinanceRecommendations", "schema", rootSchema)
            )
        );
    }

    private Optional<List<ProductRecommendation>> parseRecommendationsFromJson(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode array = root.path("recommendations");
            if (!array.isArray() || array.isEmpty()) {
                return Optional.empty();
            }

            List<ProductRecommendation> results = new ArrayList<>();
            array.forEach(node -> {
                String productId = node.path("productId").asText(null);
                if (productId == null) {
                    return;
                }

                surveyService.findProduct(productId).ifPresent(product -> {
                    List<String> benefits = new ArrayList<>();
                    JsonNode benefitsNode = node.path("benefits");
                    if (benefitsNode.isArray()) {
                        benefitsNode.forEach(b -> benefits.add(b.asText()));
                    }
                    if (benefits.isEmpty()) {
                        benefits.addAll(product.benefits());
                    }

                    String headline = node.path("headline").asText(product.headline());
                    String caution = node.path("caution").asText(product.caution());
                    String nextAction = node.path("nextAction").asText("궁금한 점이 있다면 은행 앱이나 콜센터로 문의해 주세요.");
                    results.add(new ProductRecommendation(
                        product.id(),
                        product.type(),
                        product.name(),
                        headline,
                        benefits,
                        caution,
                        nextAction
                    ));
                });
            });

            if (results.isEmpty()) {
                return Optional.empty();
            }

            return Optional.of(results.stream().limit(3).toList());
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse OpenAI JSON response: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private List<ProductRecommendation> fallbackRecommendations(List<FinancialProduct> candidates, Map<String, List<String>> answers) {
        List<ProductRecommendation> results = new ArrayList<>();

        for (FinancialProduct product : candidates) {
            String headline = composeFallbackHeadline(product, answers);
            String nextAction = composeFallbackNextAction(product);
            results.add(new ProductRecommendation(
                product.id(),
                product.type(),
                product.name(),
                headline,
                product.benefits(),
                product.caution(),
                nextAction
            ));
            if (results.size() == 3) {
                break;
            }
        }

        if (results.isEmpty()) {
            surveyService.findProduct("SAV001").ifPresent(product -> results.add(new ProductRecommendation(
                product.id(),
                product.type(),
                product.name(),
                "적금으로 기본 저축 습관부터 시작해요.",
                product.benefits(),
                product.caution(),
                "가까운 은행 앱에서 청소년 적금을 검색해 가입해 보세요."
            )));
        }

        return results;
    }

    private String composeFallbackHeadline(FinancialProduct product, Map<String, List<String>> answers) {
        return switch (product.id()) {
            case "SAV001" -> containsAny(answers, "goal", List.of("short-saving", "long-saving"))
                ? "목표 금액을 향해 차근차근 모을 수 있는 적금이에요."
                : "적은 금액도 자동이체로 꾸준히 모을 수 있는 적금이에요.";
            case "DEP001" -> containsAny(answers, "allowance", List.of("10-20", "gt-20"))
                ? "잠시 맡겨둘 여유 자금을 안전하게 보관할 수 있어요."
                : "짧은 기간 동안 이자를 챙길 수 있는 기본 예금이에요.";
            case "CARD001" -> "일상 소비에서 캐시백을 챙기고 소비 리포트로 지출을 확인할 수 있어요.";
            case "CARD002" -> containsAny(answers, "spending-category", List.of("transport"))
                ? "교통비와 공부 카페 이용이 많은 학생에게 맞춤형 혜택을 제공해요."
                : "교통·학습 관련 지출이 있다면 활용하기 좋은 카드예요.";
            default -> product.headline();
        };
    }

    private String composeFallbackNextAction(FinancialProduct product) {
        return switch (product.id()) {
            case "SAV001" -> "월별 자동이체 금액을 정하고, 출석체크 미션 같은 이벤트도 함께 챙겨보세요.";
            case "DEP001" -> "예치 기간과 중도 해지 조건을 확인한 뒤 모바일 뱅킹에서 간편하게 가입해 보세요.";
            case "CARD001" -> "주요 할인 가맹점과 이용 한도를 확인하고, 소비 리포트 기능을 함께 사용해 보세요.";
            case "CARD002" -> "월 할인 한도와 대상 가맹점을 확인한 뒤 교통카드/스마트폰 결제에 연결해 보세요.";
            default -> "추가 정보가 필요하면 은행 앱이나 상담 센터에 문의해 보세요.";
        };
    }

    private boolean containsAny(Map<String, List<String>> answers, String key, List<String> targetValues) {
        return answers.getOrDefault(key, List.of()).stream()
            .map(value -> value.toLowerCase(Locale.ROOT))
            .anyMatch(value -> targetValues.stream()
                .anyMatch(target -> value.equals(target.toLowerCase(Locale.ROOT))));
    }

    private String buildSummary(Map<String, List<String>> answers, Map<String, SurveyQuestion> questionById) {
        StringBuilder builder = new StringBuilder("- 응답 요약\n");
        answers.forEach((questionId, selected) -> {
            SurveyQuestion question = questionById.get(questionId);
            if (question == null) {
                return;
            }
            String labels = selected.stream()
                .map(optionId -> question.options().stream()
                    .filter(option -> option.id().equals(optionId))
                    .findFirst()
                    .map(SurveyOption::label)
                    .orElse(optionId))
                .collect(Collectors.joining(", "));
            builder.append("  - ")
                .append(question.title())
                .append(": ")
                .append(labels)
                .append("\n");
        });
        return builder.toString();
    }
}