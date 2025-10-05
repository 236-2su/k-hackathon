package com.hack.app.chat.survey;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SurveyService {

    private final SurveyDataRepository surveyDataRepository;

    public SurveyService(SurveyDataRepository surveyDataRepository) {
        this.surveyDataRepository = surveyDataRepository;
    }

    public List<SurveyQuestion> getQuestions() {
        return surveyDataRepository.getQuestions();
    }

    public Optional<FinancialProduct> findProduct(String productId) {
        return surveyDataRepository.getProducts().stream()
            .filter(product -> product.id().equals(productId))
            .findFirst();
    }

    public List<FinancialProduct> allProducts() {
        return List.copyOf(surveyDataRepository.getProducts());
    }
}
