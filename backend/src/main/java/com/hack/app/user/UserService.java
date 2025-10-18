package com.hack.app.user;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private static final Map<String, String> REQUIRED_JOB_BY_GAME = Map.of(
        "stock", "\uD504\uB9AC\uB79C\uC11C",       // 프리랜서
        "typing", "\uD68C\uC0AC\uC6D0",            // 회사원
        "calculating", "\uC790\uC601\uC5C5\uC790"  // 자영업자
    );

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
            .map(UserResponse::from)
            .toList();
    }

    public UserResponse getUserFlexible(String identifier) {
        Long numericId = parseLongOrNull(identifier);
        if (numericId != null) {
            return userRepository.findById(numericId)
                .map(UserResponse::from)
                .orElseThrow(() -> new UserNotFoundException(String.valueOf(numericId)));
        }
        return userRepository.findByZepUserId(identifier)
            .or(() -> userRepository.findByNickname(identifier))
            .map(UserResponse::from)
            .orElseThrow(() -> new UserNotFoundException(identifier));
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        User user = new User(request.userId(), request.userId());
        if (request.job() != null && !request.job().isBlank()) {
            user.setJob(request.job());
        }
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse upsertZepUser(String zepUserId, String nickname, String job) {
        User user = userRepository.findByZepUserId(zepUserId)
            .orElseGet(() -> userRepository.findByNickname(zepUserId)
                .orElseGet(() -> new User(zepUserId, nickname)));

        if (user.getZepUserId() == null || user.getZepUserId().isBlank()) {
            user.setZepUserId(zepUserId);
        }
        if (nickname != null && !nickname.isBlank()) {
            user.setNickname(nickname);
        } else if (user.getNickname() == null || user.getNickname().isBlank()) {
            user.setNickname(zepUserId);
        }
        if (job != null && !job.isBlank()) {
            user.setJob(job);
        }
        User updated = userRepository.save(user);
        return UserResponse.from(updated);
    }

    @Transactional
    public UserResponse applyReward(String zepUserId, String gameType, boolean success, long earnedGold) {
        User user = userRepository.findByZepUserId(zepUserId)
            .orElseThrow(() -> new UserNotFoundException(zepUserId));

        if (!success || earnedGold <= 0) {
            return UserResponse.from(user);
        }

        if (gameType == null || gameType.isBlank()) {
            throw new IllegalArgumentException("gameType must be provided");
        }
        String requiredJob = REQUIRED_JOB_BY_GAME.get(gameType);
        if (requiredJob != null && user.getJob() != null && !requiredJob.equals(user.getJob())) {
            throw new IllegalStateException("직업이 일치하지 않습니다.");
        }

        user.setGold(user.getGold() + earnedGold);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }

    @Transactional
    public UserResponse updateUserJob(Long userId, String job) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(String.valueOf(userId)));
        user.setJob(job);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }

    public PortalMoveResponse getJobAndGoldByUserId(String userId) {
        User user = userRepository.findByZepUserId(userId)
            .orElseGet(() -> userRepository.findByNickname(userId)
                .orElseThrow(() -> new UserNotFoundException("User with ID " + userId + " not found")));
        return new PortalMoveResponse(user.getJob(), user.getGold());
    }

    @Transactional
    public UserResponse updateUserJobByName(String userId, String job) {
        User user = userRepository.findByZepUserId(userId)
            .orElseGet(() -> userRepository.findByNickname(userId)
                .orElseThrow(() -> new UserNotFoundException(userId)));
        user.setJob(job);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }

    @Transactional
    public UserResponse updateUserGold(Long userId, long goldAmount) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(String.valueOf(userId)));
        user.setGold(user.getGold() + goldAmount);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }

    private Long parseLongOrNull(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
