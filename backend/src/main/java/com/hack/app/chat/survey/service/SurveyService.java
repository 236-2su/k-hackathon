package com.hack.app.chat.survey.service;

import com.hack.app.chat.survey.dao.SurveyDataDao;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.model.FinancialProduct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SurveyService {

    private final SurveyDataDao surveyDataDao;

    public SurveyService(SurveyDataDao surveyDataDao) {
        this.surveyDataDao = surveyDataDao;
    }

    public List<SurveyQuestion> getQuestions() {
        return surveyDataDao.getQuestions();
    }

    public List<FinancialProduct> getProducts() {
        return surveyDataDao.getProducts();
    }

    public Optional<FinancialProduct> findProduct(String productId) {
        return surveyDataDao.getProducts().stream()
            .filter(product -> product.id().equalsIgnoreCase(productId))
            .findFirst();
    }
}
