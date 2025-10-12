package com.hack.app.chat.survey.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public class SurveyContext {

    private static final Map<String, Integer> AGE_HINT = Map.of(
        "middle-1-2", 14,
        "middle-3", 15,
        "high-1", 16,
        "high-2", 17,
        "high-3", 18
    );

    private static final Map<String, Integer> ALLOWANCE_HINT = Map.of(
        "lt-5", 40000,
        "5-10", 75000,
        "10-20", 150000,
        "20-30", 250000,
        "gt-30", 400000
    );

    private final String ageBand;
    private final Integer estimatedAge;
    private final String allowanceBracket;
    private final Integer allowanceAmount;
    private final List<String> savingGoals;
    private final String savingHorizon;
    private final String riskProfile;
    private final List<String> spendingFocus;
    private final String digitalBehavior;
    private final String guardianPreference;
    private final String cardUsage;

    private SurveyContext(String ageBand,
                          Integer estimatedAge,
                          String allowanceBracket,
                          Integer allowanceAmount,
                          List<String> savingGoals,
                          String savingHorizon,
                          String riskProfile,
                          List<String> spendingFocus,
                          String digitalBehavior,
                          String guardianPreference,
                          String cardUsage) {
        this.ageBand = ageBand;
        this.estimatedAge = estimatedAge;
        this.allowanceBracket = allowanceBracket;
        this.allowanceAmount = allowanceAmount;
        this.savingGoals = savingGoals;
        this.savingHorizon = savingHorizon;
        this.riskProfile = riskProfile;
        this.spendingFocus = spendingFocus;
        this.digitalBehavior = digitalBehavior;
        this.guardianPreference = guardianPreference;
        this.cardUsage = cardUsage;
    }

    public static SurveyContext fromAnswers(Map<String, List<String>> answers) {
        String ageBand = first(answers, "age-band");
        Integer estimatedAge = Optional.ofNullable(ageBand).map(AGE_HINT::get).orElse(null);

        String allowance = first(answers, "monthly-funds");
        Integer allowanceAmount = Optional.ofNullable(allowance).map(ALLOWANCE_HINT::get).orElse(null);

        List<String> goals = List.copyOf(answers.getOrDefault("saving-goal", List.of()))
            .stream().map(goal -> goal.toLowerCase(Locale.ROOT)).toList();

        List<String> focus = new ArrayList<>(answers.getOrDefault("spend-focus", List.of()));

        return new SurveyContext(
            ageBand,
            estimatedAge,
            allowance,
            allowanceAmount,
            goals,
            first(answers, "horizon"),
            first(answers, "risk-attitude"),
            List.copyOf(focus),
            first(answers, "digital-behavior"),
            first(answers, "guardian-preference"),
            first(answers, "card-usage")
        );
    }

    private static String first(Map<String, List<String>> answers, String key) {
        return answers.getOrDefault(key, List.of()).stream().findFirst().orElse(null);
    }

    public Optional<Integer> estimatedAge() {
        return Optional.ofNullable(estimatedAge);
    }

    public Optional<Integer> allowanceAmount() {
        return Optional.ofNullable(allowanceAmount);
    }

    public String ageBand() {
        return ageBand;
    }

    public String allowanceBracket() {
        return allowanceBracket;
    }

    public List<String> savingGoals() {
        return savingGoals;
    }

    public String savingHorizon() {
        return savingHorizon;
    }

    public String riskProfile() {
        return riskProfile;
    }

    public List<String> spendingFocus() {
        return Collections.unmodifiableList(spendingFocus);
    }

    public String digitalBehavior() {
        return digitalBehavior;
    }

    public String guardianPreference() {
        return guardianPreference;
    }

    public String cardUsage() {
        return cardUsage;
    }
}
