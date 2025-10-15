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

    public UserResponse getUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(String.valueOf(id)));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        User saved = userRepository.save(new User(request.userId()));
        return UserResponse.from(saved);
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
    public UserResponse updateUserGold(Long userId, long goldAmount) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(String.valueOf(userId)));
        user.setGold(user.getGold() + goldAmount);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }
}
