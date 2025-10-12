package com.hack.app.chat.survey.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.chat.survey.dto.ProductRecommendation;
import com.hack.app.chat.survey.dto.RecommendationResponse;
import com.hack.app.chat.survey.model.FinancialProduct;
import com.hack.app.chat.survey.model.ProductType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RecommendationParser {

    private static final Logger log = LoggerFactory.getLogger(RecommendationParser.class);

    private final ObjectMapper objectMapper;

    public RecommendationParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public RecommendationResponse parse(String json, List<FinancialProduct> catalog) {
        Map<String, FinancialProduct> productById = catalog.stream()
            .collect(Collectors.toMap(FinancialProduct::id, product -> product));

        try {
            JsonNode root = objectMapper.readTree(json);
            String summary = textValue(root, "summary");
            if (summary == null || summary.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "?붿빟 臾몄옣???꾨씫?섏뿀?듬땲??");
            }

            List<String> insights = parseInsights(root.path("insights"));
            List<ProductRecommendation> savings = parseProducts(root.path("savings"), productById, Set.of(ProductType.SAVINGS, ProductType.DEPOSIT));
            List<ProductRecommendation> cards = parseProducts(root.path("cards"), productById, Set.of(ProductType.CARD));

            if (savings.isEmpty() && cards.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "異붿쿇 ?곹뭹??鍮꾩뼱 ?덉뒿?덈떎.");
            }

            return new RecommendationResponse(summary.trim(), insights, savings, cards);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (JsonProcessingException ex) {
            log.warn("Failed to parse OpenAI response: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "OpenAI ?묐떟???댁꽍?섏? 紐삵뻽?듬땲??");
        }
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

    private List<ProductRecommendation> parseProducts(JsonNode node,
                                                      Map<String, FinancialProduct> productById,
                                                      Set<ProductType> allowedTypes) {
        List<ProductRecommendation> results = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        if (!node.isArray()) {
            return results;
        }

        Iterator<JsonNode> iterator = node.elements();
        while (iterator.hasNext()) {
            JsonNode item = iterator.next();
            String productId = textValue(item, "productId");
            if (productId == null || !seen.add(productId)) {
                continue;
            }

            FinancialProduct product = productById.get(productId);
            if (product == null || !allowedTypes.contains(product.type())) {
                continue;
            }

            results.add(merge(product, item));
            if (results.size() == 2) {
                break;
            }
        }
        return results;
    }

    private ProductRecommendation merge(FinancialProduct product, JsonNode node) {
        List<String> benefits = collectTextArray(node.path("benefits"));
        if (benefits.isEmpty()) {
            benefits = new ArrayList<>(product.benefits());
        }

        List<String> highlight = collectTextArray(node.path("highlightCategories"));
        if (highlight.isEmpty() && product.highlightCategories() != null) {
            highlight = new ArrayList<>(product.highlightCategories());
        }

        return new ProductRecommendation(
            product.id(),
            product.type(),
            product.name(),
            textValue(node, "headline", product.headline()),
            benefits,
            textValue(node, "caution", product.caution()),
            textValue(node, "nextAction", null),
            intValue(node, "minMonthlyAmount", product.minMonthlyAmount()),
            intValue(node, "maxMonthlyAmount", product.maxMonthlyAmount()),
            booleanValue(node, "guardianRequired", product.guardianRequired()),
            highlight,
            booleanValue(node, "digitalFriendly", product.digitalFriendly())
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

    private Integer intValue(JsonNode node, String field, Integer defaultValue) {
        JsonNode value = node.path(field);
        if (value.isInt()) {
            return value.asInt();
        }
        if (value.isNumber()) {
            return value.intValue();
        }
        return defaultValue;
    }

    private boolean booleanValue(JsonNode node, String field, boolean defaultValue) {
        JsonNode value = node.path(field);
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        return defaultValue;
    }
}
