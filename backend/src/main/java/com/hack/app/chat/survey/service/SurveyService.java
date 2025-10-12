package com.hack.app.chat.survey.service;

import com.hack.app.chat.survey.dao.SurveyDataDao;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SurveyService {

    private final SurveyDataDao surveyDataDao;

    public SurveyService(SurveyDataDao surveyDataDao) {
        this.surveyDataDao = surveyDataDao;
    }

    public List<SurveyQuestion> getQuestions() {
        return surveyDataDao.getQuestions();
    }
}
