package com.hack.app.games.calculating;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Stack;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class CalculatingGameService {

    private static final int NUM_PROBLEMS = 10;
    private static final int MIN_TWO_DIGIT = 10;
    private static final int MAX_TWO_DIGIT = 99;
    private static final int TIME_LIMIT_ONE_OPERATOR = 5; // seconds
    private static final int TIME_LIMIT_TWO_OPERATORS = 10; // seconds

    private final List<Problem> currentProblems = new ArrayList<>();

    public List<ProblemResponse> startNewGame() {
        currentProblems.clear();
        Random random = new Random();

        for (int i = 0; i < NUM_PROBLEMS; i++) {
            int numOperators = random.nextInt(2) + 1; // 1 or 2 operators
            String question;
            int answer;
            int timeLimit;

            if (numOperators == 1) {
                int num1 = random.nextInt(MAX_TWO_DIGIT - MIN_TWO_DIGIT + 1) + MIN_TWO_DIGIT;
                int num2 = random.nextInt(MAX_TWO_DIGIT - MIN_TWO_DIGIT + 1) + MIN_TWO_DIGIT;
                char operator = random.nextBoolean() ? '+' : '-';
                question = String.format("%d %c %d", num1, operator, num2);
                answer = calculateExpression(num1, num2, operator);
                timeLimit = TIME_LIMIT_ONE_OPERATOR;
            } else {
                int num1 = random.nextInt(MAX_TWO_DIGIT - MIN_TWO_DIGIT + 1) + MIN_TWO_DIGIT;
                int num2 = random.nextInt(MAX_TWO_DIGIT - MIN_TWO_DIGIT + 1) + MIN_TWO_DIGIT;
                int num3 = random.nextInt(MAX_TWO_DIGIT - MIN_TWO_DIGIT + 1) + MIN_TWO_DIGIT;
                char operator1 = random.nextBoolean() ? '+' : '-';
                char operator2 = random.nextBoolean() ? '+' : '-';
                question = String.format("%d %c %d %c %d", num1, operator1, num2, operator2, num3);
                answer = calculateExpression(num1, num2, num3, operator1, operator2);
                timeLimit = TIME_LIMIT_TWO_OPERATORS;
            }
            currentProblems.add(new Problem(question, answer, timeLimit));
        }
        return currentProblems.stream()
                .map(problem -> new ProblemResponse(problem.getQuestion(), problem.getTimeLimit()))
                .collect(Collectors.toList());
    }

    public GameResult submitAnswers(List<UserAnswer> userAnswers) {
        int correctCount = 0;
        long score = 0;

        for (int i = 0; i < userAnswers.size(); i++) {
            UserAnswer userAnswer = userAnswers.get(i);
            Problem problem = currentProblems.get(i);

            if (userAnswer.getAnswer() == problem.getAnswer()) {
                correctCount++;
                score += 100; // Example scoring
            }
        }
        return new GameResult(correctCount, score);
    }

    private int calculateExpression(int num1, int num2, char operator) {
        return operator == '+' ? num1 + num2 : num1 - num2;
    }

    private int calculateExpression(int num1, int num2, int num3, char operator1, char operator2) {
        // Assuming left-to-right evaluation for simplicity
        int result = calculateExpression(num1, num2, operator1);
        return calculateExpression(result, num3, operator2);
    }
}
