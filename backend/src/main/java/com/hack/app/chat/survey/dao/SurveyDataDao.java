package com.hack.app.chat.survey.dao;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.model.FinancialProduct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Repository
public class SurveyDataDao {

    private final List<SurveyQuestion> questions;
    private final List<FinancialProduct> products;

    public SurveyDataDao(ObjectMapper objectMapper) {
        ClassPathResource resource = new ClassPathResource("data/survey-data.json");
        try (InputStream inputStream = resource.getInputStream()) {
            SurveyDataHolder holder = objectMapper.readValue(inputStream, SurveyDataHolder.class);
            this.questions = List.copyOf(holder.questions());
            this.products = List.copyOf(holder.products());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load survey data", ex);
        }
    }

    public List<SurveyQuestion> getQuestions() {
        return questions;
    }

    public List<FinancialProduct> getProducts() {
        return products;
    }

    private record SurveyDataHolder(
        List<SurveyQuestion> questions,
        List<FinancialProduct> products
    ) {}
}
