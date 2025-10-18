package com.hack.app.games.calculating;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CalculatingGameService {

    private static final int NUM_PROBLEMS = 10;
    private static final int MAX_ORDER_ITEMS = 3;
    private static final int MAX_QUANTITY = 5;

    private final List<MenuBoard> menuBoards;
    private final List<Problem> currentProblems = new ArrayList<>();

    public CalculatingGameService() {
        this.menuBoards = new ArrayList<>();

        menuBoards.add(new MenuBoard("카페 메뉴", List.of(
            new MenuItem("아메리카노", 4000),
            new MenuItem("카페라떼", 4500),
            new MenuItem("카푸치노", 4500),
            new MenuItem("바닐라라떼", 4500),
            new MenuItem("초코라떼", 5000),
            new MenuItem("말차라떼", 5000),
            new MenuItem("딸기 스무디", 6000),
            new MenuItem("망고 스무디", 6000),
            new MenuItem("레몬에이드", 5500),
            new MenuItem("자몽에이드", 5500)
        )));

        menuBoards.add(new MenuBoard("분식 메뉴", List.of(
            new MenuItem("떡볶이", 4000),
            new MenuItem("순대", 3500),
            new MenuItem("튀김모둠", 3000),
            new MenuItem("김밥", 3000),
            new MenuItem("라면", 4500),
            new MenuItem("어묵", 2000),
            new MenuItem("잔치국수", 5000),
            new MenuItem("쫄면", 5000),
            new MenuItem("볶음밥", 6000),
            new MenuItem("돈까스", 7000)
        )));

        menuBoards.add(new MenuBoard("패스트푸드 메뉴", List.of(
            new MenuItem("불고기버거", 5000),
            new MenuItem("치즈버거", 5500),
            new MenuItem("감자튀김", 2500),
            new MenuItem("콜라", 2000),
            new MenuItem("사이다", 2000),
            new MenuItem("치킨너겟", 3000),
            new MenuItem("핫도그", 4000),
            new MenuItem("아이스크림", 1500),
            new MenuItem("콘샐러드", 3500),
            new MenuItem("버거세트", 6000)
        )));
    }

    public List<ProblemResponse> startNewGame() {
        currentProblems.clear();
        Random random = new Random();

        for (int i = 0; i < NUM_PROBLEMS; i++) {
            MenuBoard randomMenuBoard = menuBoards.get(random.nextInt(menuBoards.size()));
            Problem problem = generateRandomOrder(random, randomMenuBoard);
            currentProblems.add(problem);
        }

        return currentProblems.stream()
            .map(problem -> new ProblemResponse(problem.getMenuBoard(), problem.getOrders(), problem.getAnswer()))
            .collect(Collectors.toList());
    }

    public GameResult submitAnswers(Long userId, List<UserAnswer> userAnswers) {
        int correctCount = 0;
        long score = 0;

        for (int i = 0; i < userAnswers.size(); i++) {
            UserAnswer userAnswer = userAnswers.get(i);
            Problem problem = currentProblems.get(i);

            if (userAnswer.getAnswer() == problem.getAnswer()) {
                correctCount++;
                score += 100;
            }
        }

        return new GameResult(correctCount, score);
    }

    private Problem generateRandomOrder(Random random, MenuBoard menuBoard) {
        List<MenuItem> availableMenuItems = menuBoard.getMenuItems();
        int numOrderItems = random.nextInt(MAX_ORDER_ITEMS) + 1;

        List<OrderItem> orders = new ArrayList<>();
        int totalAnswer = 0;

        List<MenuItem> shuffledMenuItems = new ArrayList<>(availableMenuItems);
        Collections.shuffle(shuffledMenuItems, random);

        for (int i = 0; i < numOrderItems; i++) {
            MenuItem selectedMenuItem = shuffledMenuItems.get(i);
            int quantity = random.nextInt(MAX_QUANTITY) + 1;
            orders.add(new OrderItem(selectedMenuItem.getName(), quantity));
            totalAnswer += selectedMenuItem.getPrice() * quantity;
        }
        return new Problem(menuBoard, orders, totalAnswer);
    }
}
