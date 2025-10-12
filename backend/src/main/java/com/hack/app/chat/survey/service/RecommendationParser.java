package com.hack.app.chat.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.chat.survey.dto.ProductRecommendation;
import com.hack.app.chat.survey.dto.RecommendationResponse;
import com.hack.app.chat.survey.model.ProductType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class RecommendationParser {

    private static final Logger log = LoggerFactory.getLogger(RecommendationParser.class);

    private static final String DEFAULT_NAME = "UNKNOWN_PRODUCT";
    private static final String DEFAULT_HEADLINE = "DETAILS_UNAVAILABLE";
    private static final String DEFAULT_BENEFIT = "DETAILS_UNAVAILABLE";
    private static final String DEFAULT_CAUTION = "INFO_VALIDATION_REQUIRED";

    private final ObjectMapper objectMapper;

    public RecommendationParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public RecommendationResponse parse(String json) {
        String sanitized = sanitize(json);
        try {
            JsonNode root = objectMapper.readTree(sanitized);
            String summary = textValue(root, "summary");
            if (summary == null || summary.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Summary field is missing.");
            }

            List<String> insights = parseInsights(root.path("insights"));
            List<ProductRecommendation> savings = parseProducts(root.path("savings"), ProductType.SAVINGS);
            List<ProductRecommendation> cards = parseProducts(root.path("cards"), ProductType.CARD);

            if (savings.isEmpty() && cards.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Gemini returned no actionable recommendations.");
            }

            return new RecommendationResponse(summary.trim(), insights, savings, cards);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (JsonProcessingException ex) {
            log.warn("Failed to parse Gemini response: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Unable to parse Gemini response payload.");
        }
    }

    private String sanitize(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            int firstLineBreak = trimmed.indexOf('\n');
            if (firstLineBreak >= 0) {
                trimmed = trimmed.substring(firstLineBreak + 1);
            } else {
                trimmed = trimmed.substring(3);
            }
            trimmed = trimmed.trim();
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3).trim();
            }
        }
        return trimmed;
    }

    private List<String> parseInsights(JsonNode node) {
        List<String> results = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual()) {
                    String text = item.asText().trim();
                    if (!text.isEmpty()) {
                        results.add(text);
                    }
                }
                if (results.size() == 4) {
                    break;
                }
            }
        }
        return results;
    }

    private List<ProductRecommendation> parseProducts(JsonNode node, ProductType defaultType) {
        List<ProductRecommendation> results = new ArrayList<>();
        if (!node.isArray()) {
            return results;
        }

        Set<String> usedIds = new HashSet<>();
        int index = 0;
        for (JsonNode item : node) {
            ProductRecommendation recommendation = toRecommendation(item, defaultType, index++);
            if (!usedIds.add(recommendation.productId())) {
                continue;
            }
            results.add(recommendation);
        }
        return results;
    }

    private ProductRecommendation toRecommendation(JsonNode node, ProductType defaultType, int index) {
        String rawId = textValue(node, "productId");
        String name = textValue(node, "name", DEFAULT_NAME);
        String productId = ensureProductId(rawId, name, index);

        ProductType type = parseProductType(textValue(node, "type"), defaultType);

        List<String> benefits = collectTextArray(node.path("benefits"));
        if (benefits.isEmpty()) {
            benefits.add(DEFAULT_BENEFIT);
        }

        List<String> highlight = collectTextArray(node.path("highlightCategories"));

        Integer minAmount = parseInteger(node.path("minMonthlyAmount"));
        Integer maxAmount = parseInteger(node.path("maxMonthlyAmount"));

        return new ProductRecommendation(
            productId,
            type,
            name,
            textValue(node, "headline", DEFAULT_HEADLINE),
            benefits,
            textValue(node, "caution", DEFAULT_CAUTION),
            textValue(node, "nextAction", null),
            minAmount,
            maxAmount,
            node.path("guardianRequired").asBoolean(false),
            highlight,
            node.path("digitalFriendly").asBoolean(false)
        );
    }

    private List<String> collectTextArray(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> {
                if (item.isTextual()) {
                    String text = item.asText().trim();
                    if (!text.isEmpty()) {
                        list.add(text);
                    }
                }
            });
        }
        return list;
    }

    private ProductType parseProductType(String value, ProductType defaultType) {
        if (value == null || value.isBlank()) {
            return defaultType;
        }
        try {
            return ProductType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return defaultType;
        }
    }

    private Integer parseInteger(JsonNode node) {
        if (node.isNumber()) {
            return node.intValue();
        }
        if (node.isTextual()) {
            String digits = node.asText().replaceAll("[^0-9]", "");
            if (!digits.isEmpty()) {
                try {
                    return Integer.parseInt(digits);
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private String ensureProductId(String rawId, String name, int index) {
        if (rawId != null && !rawId.isBlank()) {
            return rawId.trim();
        }
        String base = name == null ? "REC" : name.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        if (base.isEmpty()) {
            base = "REC";
        }
        return base + "_" + index;
    }

    private String textValue(JsonNode node, String field) {
        return textValue(node, field, null);
    }

    private String textValue(JsonNode node, String field, String defaultValue) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return defaultValue;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? defaultValue : text;
    }
}
