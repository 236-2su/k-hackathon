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
            .orElseThrow(() -> new UserNotFoundException(id));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        userRepository.findByEmail(request.email())
            .ifPresent(existing -> {
                throw new UserWithEmailAlreadyExistsException(existing.getEmail());
            });

        User saved = userRepository.save(new User(request.name(), request.email()));
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse updateUserGold(Long userId, int goldAmount) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        user.setGold(user.getGold() + goldAmount);
        User updatedUser = userRepository.save(user);
        return UserResponse.from(updatedUser);
    }
}
