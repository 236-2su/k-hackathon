package com.hack.app.chat.finance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.openai.OpenAiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FinanceChatService {

    private static final Logger log = LoggerFactory.getLogger(FinanceChatService.class);

    private static final String SYSTEM_PROMPT = """
        너는 친절한 금융 상담가야. 사용자의 질문이 금융, 경제, 투자, 소비, 자산, 연금, 보험과 관련 있는지 먼저 판단해.
        반드시 아래 JSON 한 개만 출력해.
        {
          "category": "finance" 또는 "not_finance",
          "confidence": 0.0 이상 1.0 이하 숫자,
          "reply": 한국어로 3~4문장 설명 (category가 finance면 질문에 답하고, not_finance면 거절 안내),
          "notes": (선택) 판단 근거 한두 문장
        }
        - category가 finance이면 reply는 4문장 이내로 간결하게 작성하고, 필요한 경우 마지막 문장에 주의 문구를 붙여줘.
        - category가 not_finance이면 reply에 금융 주제가 아니라는 안내를 적어줘.
        - JSON 외 다른 문장은 출력하지 마.
    """;

    private static final String REFUSAL_MESSAGE = "금융이나 자산 관리와 관련된 질문을 보내줘. 다른 주제는 답변하기 어려워.";
    private static final String TEMPORARY_ISSUE_MESSAGE = "지금은 상담 답변을 준비하지 못했어요. 잠시 뒤에 다시 시도해 줄래요?";
    private static final String MISSING_KEY_MESSAGE = "OpenAI API 설정이 아직 완료되지 않았어요. 환경 변수를 확인해 주세요.";

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;
    private final Map<String, Deque<ChatTurn>> historyStore = new ConcurrentHashMap<>();

    public FinanceChatService(OpenAiClient openAiClient, ObjectMapper objectMapper) {
        this.openAiClient = openAiClient;
        this.objectMapper = objectMapper;
    }

    public FinanceChatResponse chat(FinanceChatRequest request) {
        String trimmedQuestion = request.question().trim();
        String sessionId = (request.sessionId() == null || request.sessionId().isBlank())
            ? generateSessionId()
            : request.sessionId();

        if (!openAiClient.isEnabled()) {
            log.warn("OpenAI API key is not configured; cannot fulfill chat request.");
            return new FinanceChatResponse(sessionId, MISSING_KEY_MESSAGE, false);
        }

        List<OpenAiClient.Message> messages = buildMessages(sessionId, trimmedQuestion);
        Map<String, Object> params = buildResponseFormatParams();

        boolean financeRelated = false;
        String reply = REFUSAL_MESSAGE;

        try {
            Optional<String> rawResponse = openAiClient.createChatCompletion(messages, 0.4, params);
            if (rawResponse.isPresent()) {
                String raw = rawResponse.get();
                Optional<FinanceDecision> decisionOptional = parseFinanceDecision(raw);
                if (decisionOptional.isPresent()) {
                    FinanceDecision decision = decisionOptional.get();
                    financeRelated = decision.isFinance();
                    reply = decision.reply();
                    log.debug("Finance classification result category={} confidence={}",
                        financeRelated ? "finance" : "not_finance", decision.confidence());
                    if (!financeRelated) {
                        reply = REFUSAL_MESSAGE;
                    }
                } else {
                    financeRelated = true;
                    reply = raw;
                    log.warn("Received non-JSON response from OpenAI: {}", raw);
                }
            } else {
                reply = TEMPORARY_ISSUE_MESSAGE;
            }
        } catch (Exception ex) {
            log.warn("Failed to classify or answer finance question", ex);
            reply = TEMPORARY_ISSUE_MESSAGE;
            financeRelated = false;
        }

        addHistory(sessionId, trimmedQuestion, reply);
        return new FinanceChatResponse(sessionId, reply, financeRelated);
    }

    private List<OpenAiClient.Message> buildMessages(String sessionId, String question) {
        List<OpenAiClient.Message> messages = new ArrayList<>();
        messages.add(OpenAiClient.Message.system(SYSTEM_PROMPT));

        Deque<ChatTurn> pastTurns = historyStore.get(sessionId);
        if (pastTurns != null) {
            pastTurns.forEach(turn -> {
                messages.add(OpenAiClient.Message.user(turn.userMessage()));
                messages.add(OpenAiClient.Message.assistant(turn.assistantMessage()));
            });
        }

        messages.add(OpenAiClient.Message.user(question));
        return messages;
    }

    private Map<String, Object> buildResponseFormatParams() {
        Map<String, Object> categoryProperty = new HashMap<>();
        categoryProperty.put("type", "string");
        categoryProperty.put("enum", List.of("finance", "not_finance"));

        Map<String, Object> confidenceProperty = new HashMap<>();
        confidenceProperty.put("type", "number");
        confidenceProperty.put("minimum", 0);
        confidenceProperty.put("maximum", 1);

        Map<String, Object> replyProperty = new HashMap<>();
        replyProperty.put("type", "string");

        Map<String, Object> notesProperty = new HashMap<>();
        notesProperty.put("type", "string");

        Map<String, Object> properties = new HashMap<>();
        properties.put("category", categoryProperty);
        properties.put("confidence", confidenceProperty);
        properties.put("reply", replyProperty);
        properties.put("notes", notesProperty);

        Map<String, Object> schema = new HashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", List.of("category", "reply", "confidence"));

        Map<String, Object> jsonSchema = new HashMap<>();
        jsonSchema.put("name", "FinanceAdvisorResponse");
        jsonSchema.put("schema", schema);

        Map<String, Object> responseFormat = new HashMap<>();
        responseFormat.put("type", "json_schema");
        responseFormat.put("json_schema", jsonSchema);

        Map<String, Object> params = new HashMap<>();
        params.put("response_format", responseFormat);
        return params;
    }

    private Optional<FinanceDecision> parseFinanceDecision(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode candidate = extractDecisionNode(root);
            if (candidate == null) {
                return Optional.empty();
            }

            String category = candidate.path("category").asText();
            String reply = candidate.path("reply").asText();
            double confidence = candidate.path("confidence").asDouble(0.0);
            if (category == null || category.isBlank() || reply == null || reply.isBlank()) {
                return Optional.empty();
            }

            boolean isFinance = "finance".equalsIgnoreCase(category);
            return Optional.of(new FinanceDecision(isFinance, reply, confidence));
        } catch (Exception ex) {
            log.warn("Failed to parse finance decision JSON: {}", rawJson, ex);
            return Optional.empty();
        }
    }

    private JsonNode extractDecisionNode(JsonNode root) {
        if (root == null) {
            return null;
        }

        if (root.has("category") && root.has("reply")) {
            return root;
        }

        for (String field : List.of("output", "data", "result", "response", "financeAdvisorResponse")) {
            JsonNode child = root.path(field);
            if (child != null && !child.isMissingNode()) {
                if (child.isArray() && child.size() > 0) {
                    JsonNode first = child.get(0);
                    if (first.has("category") && first.has("reply")) {
                        return first;
                    }
                }
                if (child.has("category") && child.has("reply")) {
                    return child;
                }
            }
        }
        return null;
    }

    private record FinanceDecision(boolean isFinance, String reply, double confidence) {
    }

    private void addHistory(String sessionId, String userMessage, String assistantMessage) {
        historyStore.compute(sessionId, (key, deque) -> {
            Deque<ChatTurn> history = deque == null ? new ArrayDeque<>() : deque;
            if (history.size() >= MAX_HISTORY) {
                history.pollFirst();
            }
            history.addLast(new ChatTurn(userMessage, assistantMessage));
            return history;
        });
    }

    private static final int MAX_HISTORY = 6;

    private String generateSessionId() {
        return Instant.now().toEpochMilli() + "-" + UUID.randomUUID();
    }
}