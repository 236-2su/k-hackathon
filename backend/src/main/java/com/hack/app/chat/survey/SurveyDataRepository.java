package com.hack.app.chat.survey;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Component
public class SurveyDataRepository {

    private final List<SurveyQuestion> questions;
    private final List<FinancialProduct> products;

    public SurveyDataRepository(ObjectMapper objectMapper,
                                ResourceLoader resourceLoader,
                                @Value("${survey.data-path:classpath:data/survey-data.json}") String dataPath) {
        Resource resource = resourceLoader.getResource(dataPath);
        if (!resource.exists()) {
            throw new IllegalStateException("Survey data resource not found: " + dataPath);
        }

        try (InputStream inputStream = resource.getInputStream()) {
            SurveyData data = objectMapper.readValue(inputStream, SurveyData.class);
            this.questions = List.copyOf(data.questions());
            this.products = List.copyOf(data.products());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load survey data from " + dataPath, ex);
        }
    }

    public List<SurveyQuestion> getQuestions() {
        return questions;
    }

    public List<FinancialProduct> getProducts() {
        return products;
    }

    private record SurveyData(List<SurveyQuestion> questions, List<FinancialProduct> products) {
    }
}
