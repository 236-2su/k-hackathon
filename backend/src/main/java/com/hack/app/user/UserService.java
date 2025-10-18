package com.hack.app.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserService {

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
                .orElseGet(() -> userRepository.findByName(identifier)
                    .map(UserResponse::from)
                    .orElseThrow(() -> new UserNotFoundException(identifier)));
        }
        return userRepository.findByName(identifier)
            .map(UserResponse::from)
            .orElseThrow(() -> new UserNotFoundException(identifier));
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        User user = new User(request.userId());
        if (request.job() != null && !request.job().isBlank()) {
            user.setJob(request.job());
        }
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse upsertZepUser(String zepUserId, String job) {
        User user = userRepository.findByName(zepUserId)
            .orElseGet(() -> userRepository.save(new User(zepUserId)));
        if (job != null && !job.isBlank()) {
            user.setJob(job);
        }
        User updated = userRepository.save(user);
        return UserResponse.from(updated);
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
        User user = userRepository.findByName(userId)
            .orElseThrow(() -> new UserNotFoundException("User with ID " + userId + " not found"));
        return new PortalMoveResponse(user.getJob(), user.getGold());
    }

    @Transactional
    public UserResponse updateUserJobByName(String userId, String job) {
        User user = userRepository.findByName(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
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
