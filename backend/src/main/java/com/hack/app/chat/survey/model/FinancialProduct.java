package com.hack.app.chat.survey.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record FinancialProduct(
    String id,
    ProductType type,
    String name,
    String headline,
    List<String> benefits,
    String caution,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer minAge,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer maxAge,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer minMonthlyAmount,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    Integer maxMonthlyAmount,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    List<String> suitabilityGoals,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    List<String> suitabilityHorizons,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    List<String> riskProfiles,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    List<String> highlightCategories,
    @JsonProperty(defaultValue = "false")
    boolean digitalFriendly,
    @JsonProperty(defaultValue = "false")
    boolean guardianRequired
) {
    public boolean fitsAge(Integer age) {
        if (age == null) {
            return true;
        }
        if (minAge != null && age < minAge) {
            return false;
        }
        return maxAge == null || age <= maxAge;
    }

    public boolean fitsMonthlyAmount(Integer amount) {
        if (amount == null) {
            return true;
        }
        if (minMonthlyAmount != null && amount < minMonthlyAmount) {
            return false;
        }
        return maxMonthlyAmount == null || amount <= maxMonthlyAmount;
    }
}
