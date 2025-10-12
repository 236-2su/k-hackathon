package com.hack.app.chat.survey.controller;

import com.hack.app.chat.survey.dto.RecommendationResponse;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.dto.SurveyResponsePayload;
import com.hack.app.chat.survey.service.RecommendationService;
import com.hack.app.chat.survey.service.SurveyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SurveyController {

    private final SurveyService surveyService;
    private final RecommendationService recommendationService;

    public SurveyController(SurveyService surveyService, RecommendationService recommendationService) {
        this.surveyService = surveyService;
        this.recommendationService = recommendationService;
    }

    @GetMapping("/survey")
    public ResponseEntity<List<SurveyQuestion>> getSurvey() {
        return ResponseEntity.ok(surveyService.getQuestions());
    }

    @PostMapping("/recommendations")
    public ResponseEntity<RecommendationResponse> recommend(@Valid @RequestBody SurveyResponsePayload payload) {
        return ResponseEntity.ok(recommendationService.recommend(payload));
    }
}
