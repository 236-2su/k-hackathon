package com.hack.app.chat.survey.service;

import com.hack.app.chat.survey.model.FinancialProduct;
import com.hack.app.chat.survey.model.ProductType;
import com.hack.app.chat.survey.model.SurveyContext;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class CandidateSelector {

    public List<FinancialProduct> select(List<FinancialProduct> allProducts, SurveyContext context) {
        return allProducts.stream()
            .map(product -> new ScoredProduct(product, scoreProduct(product, context)))
            .sorted(Comparator.comparingInt(ScoredProduct::score).reversed())
            .map(ScoredProduct::product)
            .collect(Collectors.toList());
    }

    private int scoreProduct(FinancialProduct product, SurveyContext context) {
        int score = 0;

        if (context.estimatedAge().isPresent() && !product.fitsAge(context.estimatedAge().get())) {
            return -100;
        }
        if (context.allowanceAmount().isPresent() && !product.fitsMonthlyAmount(context.allowanceAmount().get())) {
            score -= 10;
        } else {
            score += 5;
        }

        if (matchesList(product.suitabilityGoals(), context.savingGoals())) {
            score += 12;
        }
        if (matchesValue(product.suitabilityHorizons(), context.savingHorizon())) {
            score += 6;
        }
        if (matchesValue(product.riskProfiles(), context.riskProfile())) {
            score += 6;
        }

        long focusMatch = context.spendingFocus().stream()
            .filter(focus -> matchesValue(product.highlightCategories(), focus))
            .count();
        score += focusMatch * 3;

        if ("mostly-digital".equalsIgnoreCase(context.digitalBehavior()) && product.digitalFriendly()) {
            score += 4;
        } else if ("mostly-cash".equalsIgnoreCase(context.digitalBehavior()) && !product.digitalFriendly()) {
            score += 3;
        }

        if ("independent".equalsIgnoreCase(context.guardianPreference()) && product.guardianRequired()) {
            score -= 8;
        } else if ("need-guardian".equalsIgnoreCase(context.guardianPreference()) && product.guardianRequired()) {
            score += 3;
        }

        if (product.type() == ProductType.CARD) {
            switch (context.cardUsage() == null ? "" : context.cardUsage().toLowerCase(Locale.ROOT)) {
                case "using" -> score += 6;
                case "interested" -> score += 4;
                case "not-yet" -> score += 1;
                default -> score += 0;
            }
        }

        return score;
    }

    private boolean matchesList(List<String> candidates, List<String> targets) {
        if (candidates == null || targets == null || candidates.isEmpty() || targets.isEmpty()) {
            return false;
        }
        return targets.stream().anyMatch(target -> matchesValue(candidates, target));
    }

    private boolean matchesValue(List<String> candidates, String target) {
        if (candidates == null || target == null) {
            return false;
        }
        return candidates.stream()
            .anyMatch(candidate -> candidate.equalsIgnoreCase(target));
    }

    private record ScoredProduct(FinancialProduct product, int score) {}
}
