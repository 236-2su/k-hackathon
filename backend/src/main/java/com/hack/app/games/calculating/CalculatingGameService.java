package com.hack.app.games.calculating;

import com.hack.app.user.UserService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CalculatingGameService {

    private static final int NUM_PROBLEMS = 10;
    private static final int MAX_ORDER_ITEMS = 3; // 한 주문에 포함될 수 있는 최대 메뉴 수
    private static final int MAX_QUANTITY = 5;    // 한 메뉴의 최대 수량

    private final List<MenuBoard> menuBoards;
    private final List<Problem> currentProblems = new ArrayList<>();
    private final UserService userService;

    public CalculatingGameService(UserService userService) {
        this.userService = userService;
        this.menuBoards = new ArrayList<>();
        // 메뉴판 1: 카페 메뉴
        menuBoards.add(new MenuBoard("카페 메뉴", List.of(
                new MenuItem("아메리카노", 4000),
                new MenuItem("카페라떼", 4500),
                new MenuItem("카푸치노", 4500),
                new MenuItem("에스프레소", 3500),
                new MenuItem("초코라떼", 5000),
                new MenuItem("녹차라떼", 5000),
                new MenuItem("딸기 스무디", 6000),
                new MenuItem("망고 스무디", 6000),
                new MenuItem("레몬 에이드", 5500),
                new MenuItem("자몽 에이드", 5500)
        )));

        // 메뉴판 2: 분식 메뉴
        menuBoards.add(new MenuBoard("분식 메뉴", List.of(
                new MenuItem("떡볶이", 4000),
                new MenuItem("순대", 3500),
                new MenuItem("튀김", 3000),
                new MenuItem("김밥", 3000),
                new MenuItem("라면", 4500),
                new MenuItem("어묵", 2000),
                new MenuItem("만두", 3000),
                new MenuItem("쫄면", 5000),
                new MenuItem("볶음밥", 6000),
                new MenuItem("돈까스", 7000)
        )));

        // 메뉴판 3: 패스트푸드 메뉴
        menuBoards.add(new MenuBoard("패스트푸드 메뉴", List.of(
                new MenuItem("햄버거", 5000),
                new MenuItem("치즈버거", 5500),
                new MenuItem("감자튀김", 2500),
                new MenuItem("콜라", 2000),
                new MenuItem("사이다", 2000),
                new MenuItem("너겟", 3000),
                new MenuItem("쉐이크", 4000),
                new MenuItem("아이스크림", 1500),
                new MenuItem("핫도그", 3500),
                new MenuItem("샐러드", 6000)
        )));
    }

    public List<ProblemResponse> startNewGame() {
        currentProblems.clear();
        Random random = new Random();

        // 10개의 주문 생성
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
                score += 100; // Example scoring
            }
        }
        userService.updateUserGold(userId, score);
        return new GameResult(correctCount, score);
    }

    private Problem generateRandomOrder(Random random, MenuBoard menuBoard) {
        List<MenuItem> availableMenuItems = menuBoard.getMenuItems();
        int numOrderItems = random.nextInt(MAX_ORDER_ITEMS) + 1; // 1개에서 MAX_ORDER_ITEMS 개까지 주문

        List<OrderItem> orders = new ArrayList<>();
        int totalAnswer = 0;

        // 중복 없이 메뉴 선택
        List<MenuItem> shuffledMenuItems = new ArrayList<>(availableMenuItems);
        Collections.shuffle(shuffledMenuItems, random);

        for (int i = 0; i < numOrderItems; i++) {
            MenuItem selectedMenuItem = shuffledMenuItems.get(i);
            int quantity = random.nextInt(MAX_QUANTITY) + 1; // 1개에서 MAX_QUANTITY 개까지 수량
            orders.add(new OrderItem(selectedMenuItem.getName(), quantity));
            totalAnswer += selectedMenuItem.getPrice() * quantity;
        }
        return new Problem(menuBoard, orders, totalAnswer);
    }
}

