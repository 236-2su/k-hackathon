package com.hack.app.chat.survey.service;

import com.hack.app.chat.survey.dto.RecommendationResponse;
import com.hack.app.chat.survey.dto.SurveyAnswer;
import com.hack.app.chat.survey.dto.SurveyQuestion;
import com.hack.app.chat.survey.dto.SurveyResponsePayload;
import com.hack.app.chat.survey.model.PromptContext;
import com.hack.app.chat.survey.model.SurveyContext;
import com.hack.app.gemini.GeminiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    private final SurveyService surveyService;
    private final PromptContextBuilder promptContextBuilder;
    private final RecommendationParser recommendationParser;
    private final GeminiClient geminiClient;

    public RecommendationService(SurveyService surveyService,
                                 PromptContextBuilder promptContextBuilder,
                                 RecommendationParser recommendationParser,
                                 GeminiClient geminiClient) {
        this.surveyService = surveyService;
        this.promptContextBuilder = promptContextBuilder;
        this.recommendationParser = recommendationParser;
        this.geminiClient = geminiClient;
    }

    public RecommendationResponse recommend(SurveyResponsePayload payload) {
        if (!geminiClient.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Gemini API key is not configured.");
        }

        Map<String, SurveyQuestion> questionMap = surveyService.getQuestions().stream()
            .collect(Collectors.toMap(SurveyQuestion::id, question -> question));

        Map<String, List<String>> answers = new LinkedHashMap<>();
        for (SurveyAnswer answer : payload.answers()) {
            SurveyQuestion question = questionMap.get(answer.questionId());
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown question ID: " + answer.questionId());
            }
            answers.put(question.id(), new ArrayList<>(answer.selectedOptionIds()));
        }

        SurveyContext context = SurveyContext.fromAnswers(answers);

        PromptContext promptContext = promptContextBuilder.build(
            answers,
            questionMap,
            context,
            payload.promptParams()
        );

        String raw = callGemini(promptContext);
        return recommendationParser.parse(raw);
    }

    private String callGemini(PromptContext promptContext) {
        Instant started = Instant.now();
        Map<String, Object> generationConfig = buildGenerationConfig();

        String prompt = promptContext.systemInstruction() + "\n\n" + promptContext.userPrompt();
        if (log.isDebugEnabled()) {
            log.debug("Gemini prompt built for survey recommendation:\n{}", prompt);
        }

        Optional<String> response = geminiClient.generateContent(prompt, generationConfig);
        if (response.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Failed to receive a response from Gemini.");
        }

        String content = response.get();
        log.info("Gemini recommendation latency={}ms", Duration.between(started, Instant.now()).toMillis());
        log.debug("Gemini raw response: {}", content);
        return content;
    }

    private Map<String, Object> buildGenerationConfig() {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("temperature", 0.6);
        config.put("top_p", 0.9);
        return config;
    }
}
